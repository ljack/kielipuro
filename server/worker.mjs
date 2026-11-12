import { verifySlack, secureEqual, limitedBody } from './security.mjs';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const configured = env => ['SLACK_SIGNING_SECRET','SLACK_BOT_TOKEN','SLACK_TEAM_ID','SLACK_CHANNEL_ID','SLACK_APP_ID','SLACK_BOT_USER_ID','SLACK_WORKSPACE_DOMAIN'].every(k => Boolean(env[k]));
const harden = response => {
  const result = new Response(response.body, response);
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return result;
};
export async function handle(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/status' && request.method === 'GET') return json({ app: 'Kielipuro', version: '0.1.0', slackConfigured: configured(env) });
  if (url.pathname === '/api/slack/events' && request.method === 'POST') {
    if (!env.SLACK_SIGNING_SECRET) return json({ error: 'slack_not_connected' }, 503);
    const body = await limitedBody(request);
    if (!await verifySlack(request, body, env.SLACK_SIGNING_SECRET)) return json({ error: 'invalid_signature' }, 401);
    let data; try { data = JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
    if (data.type === 'url_verification' && typeof data.challenge === 'string') return json({ challenge: data.challenge });
    if (!configured(env)) return json({ error: 'slack_not_connected' }, 503);
    if (data.team_id !== env.SLACK_TEAM_ID || data.api_app_id !== env.SLACK_APP_ID) return json({ error: 'wrong_workspace_or_app' }, 403);
    const event = data.event;
    if (!event || event.channel !== env.SLACK_CHANNEL_ID || event.bot_id || event.subtype || !['app_mention','message'].includes(event.type)) return json({ ignored: true });
    if (!/^[A-Z0-9]+$/.test(event.user || '') || !/^\d+\.\d+$/.test(event.ts || '') || typeof event.text !== 'string' || typeof data.event_id !== 'string') return json({ error: 'invalid_event' }, 400);
    const thread = event.thread_ts || event.ts;
    if (!/^\d+\.\d+$/.test(thread)) return json({ error: 'invalid_thread' }, 400);
    // Only explicit mentions start capture. Replies are captured only in an enrolled thread.
    const mentionsBot = event.text.includes(`<@${env.SLACK_BOT_USER_ID}>`);
    const known = await env.DB.prepare('SELECT id FROM slack_events WHERE team=? AND channel=? AND thread_ts=? LIMIT 1').bind(data.team_id, event.channel, thread).first();
    if (!mentionsBot && !known) return json({ ignored: true });
    if (!/^[a-z0-9-]+$/.test(env.SLACK_WORKSPACE_DOMAIN)) return json({ error: 'workspace_domain_invalid' }, 503);
    const text = event.text.replaceAll(`<@${env.SLACK_BOT_USER_ID}>`, '').trim().slice(0, 4000);
    if (!text) return json({ ignored: true });
    const source = `https://${env.SLACK_WORKSPACE_DOMAIN}.slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`;
    // D1 UNIQUE prevents both Slack retries and app_mention/message dual deliveries.
    await env.DB.prepare('INSERT OR IGNORE INTO slack_events (id,team,channel,thread_ts,message_ts,author,content,source_url) VALUES (?,?,?,?,?,?,?,?)').bind(data.event_id, data.team_id, event.channel, thread, event.ts, event.user, text, source).run();
    return json({ queued: true });
  }
  if (url.pathname.startsWith('/api/internal/')) {
    if (!await secureEqual(request.headers.get('authorization'), env.MONITOR_TOKEN ? `Bearer ${env.MONITOR_TOKEN}` : '')) return json({ error: 'unauthorized' }, 401);
    if (url.pathname === '/api/internal/pending' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM slack_events WHERE delivered_at IS NULL ORDER BY created_at, message_ts LIMIT 50').all();
      return json({ events: results });
    }
    if (url.pathname === '/api/internal/health' && request.method === 'GET') {
      const state = await env.DB.prepare('SELECT last_success, summary FROM monitor_state WHERE id=1').first();
      const pending = await env.DB.prepare('SELECT count(*) AS count FROM slack_events WHERE delivered_at IS NULL').first();
      return json({ monitor: state, pending: pending.count, slackConfigured: configured(env) });
    }
    if (url.pathname === '/api/internal/heartbeat' && request.method === 'POST') {
      await env.DB.prepare("INSERT INTO monitor_state (id,last_success,summary) VALUES (1,datetime('now'),'completed') ON CONFLICT(id) DO UPDATE SET last_success=excluded.last_success,summary=excluded.summary").run();
      return json({ ok: true });
    }
    if (url.pathname === '/api/internal/ack' && request.method === 'POST') {
      const data = JSON.parse(await limitedBody(request, 2048));
      if (!Number.isSafeInteger(data.issue) || data.issue < 1 || typeof data.id !== 'string') return json({ error: 'invalid_ack' }, 400);
      const row = await env.DB.prepare('SELECT * FROM slack_events WHERE id=?').bind(data.id).first();
      if (!row) return json({ error: 'not_found' }, 404);
      if (row.delivered_at) return json({ ok: true, duplicate: true });
      const issueUrl = `https://github.com/${env.GITHUB_REPOSITORY}/issues/${data.issue}`;
      await env.DB.prepare('UPDATE slack_events SET issue_number=?,issue_url=? WHERE id=?').bind(data.issue, issueUrl, data.id).run();
      if (!env.SLACK_BOT_TOKEN) return json({ error: 'slack_not_connected' }, 503);
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST', headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ channel: row.channel, thread_ts: row.thread_ts, text: `Palaute tallennettu: ${issueUrl}\nVoit täydentää ideaa tässä ketjussa. Ketjun viestit kopioidaan julkiseen GitHubiin. Toteutus odottaa omistajan hyväksyntää.`, unfurl_links: false, unfurl_media: false })
      });
      const reply = await response.json();
      if (!response.ok || !reply.ok) return json({ error: 'slack_delivery_failed' }, 502);
      await env.DB.prepare("UPDATE slack_events SET delivered_at=datetime('now') WHERE id=?").bind(data.id).run();
      return json({ ok: true });
    }
    return json({ error: 'not_found' }, 404);
  }
  if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
  return env.ASSETS.fetch(request);
}
export default { async fetch(request, env) { try { return harden(await handle(request, env)); } catch (error) { console.error('request_failed', error.message === 'body_too_large' ? 'body_too_large' : 'internal_error'); return harden(json({ error: error.message === 'body_too_large' ? 'body_too_large' : 'request_failed' }, error.message === 'body_too_large' ? 413 : 500)); } } };
