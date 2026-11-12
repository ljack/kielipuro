import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../server/worker.mjs';
import { verifySlack } from '../server/security.mjs';

function fixture() {
  const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../migrations/0001_feedback.sql', import.meta.url), 'utf8'));
  const env = { SLACK_SIGNING_SECRET: 'unit-test-only', SLACK_BOT_TOKEN: 'unit-test-only', SLACK_TEAM_ID: 'TTEST', SLACK_CHANNEL_ID: 'CTEST', SLACK_APP_ID: 'ATEST', SLACK_BOT_USER_ID: 'UBOT', SLACK_WORKSPACE_DOMAIN: 'fixture', MONITOR_TOKEN: 'unit-test-monitor', GITHUB_REPOSITORY: 'ljack/kielipuro', ASSETS: { fetch: () => new Response('asset') }, DB: { prepare(sql) { let args = []; return { bind(...values) { args = values; return this; }, async first() { return db.prepare(sql).get(...args) || null; }, async all() { return { results: db.prepare(sql).all(...args) }; }, async run() { return db.prepare(sql).run(...args); } }; } } };
  return { db, env };
}
function signed(data, ts = String(Math.floor(Date.now() / 1000))) {
  const body = JSON.stringify(data);
  const signature = 'v0=' + createHmac('sha256', 'unit-test-only').update(`v0:${ts}:${body}`).digest('hex');
  return new Request('https://example.test/api/slack/events', { method: 'POST', body, headers: { 'x-slack-request-timestamp': ts, 'x-slack-signature': signature } });
}
const payload = (overrides = {}) => ({ type: 'event_callback', team_id: 'TTEST', api_app_id: 'ATEST', event_id: 'E1', event: { type: 'app_mention', user: 'UTEST', channel: 'CTEST', ts: '1234567890.123456', text: '<@UBOT> Lisätään palautepainike' }, ...overrides });
test('Slack HMAC rejects tampering, stale and future replay', async () => {
  const req = signed(payload()); const body = await req.text();
  assert.equal(await verifySlack(req, body, 'unit-test-only'), true);
  assert.equal(await verifySlack(req, body + ' ', 'unit-test-only'), false);
  for (const delta of [-600, 600]) { const r = signed(payload(), String(Math.floor(Date.now()/1000)+delta)); assert.equal(await verifySlack(r, await r.text(), 'unit-test-only'), false); }
});
test('disconnected Slack and unauthenticated internal access fail closed', async () => {
  const { db, env } = fixture(); delete env.SLACK_SIGNING_SECRET;
  assert.equal((await worker.fetch(signed(payload()), env)).status, 503);
  assert.equal((await worker.fetch(new Request('https://example.test/api/internal/pending'), env)).status, 401);
  db.close();
});
test('retries and dual Slack event delivery create one row; replies share the thread', async () => {
  const { db, env } = fixture();
  assert.equal((await worker.fetch(signed(payload()), env)).status, 200);
  await worker.fetch(signed(payload()), env);
  await worker.fetch(signed(payload({ event_id: 'E2', event: { ...payload().event, type: 'message' } })), env);
  assert.equal(db.prepare('SELECT count(*) AS n FROM slack_events').get().n, 1);
  await worker.fetch(signed(payload({ event_id: 'E3', event: { ...payload().event, type: 'message', ts: '1234567891.123456', thread_ts: payload().event.ts, text: 'Tarkennus ensimmäiseen ideaan' } })), env);
  const rows = db.prepare('SELECT * FROM slack_events ORDER BY message_ts').all();
  assert.equal(rows.length, 2); assert.equal(rows[1].thread_ts, rows[0].thread_ts);
  assert.equal(rows[0].source_url, 'https://fixture.slack.com/archives/CTEST/p1234567890123456');
  db.close();
});
test('other workspace/channel/app, unrelated messages and bot loops never enter queue', async () => {
  const { db, env } = fixture();
  assert.equal((await worker.fetch(signed(payload({ team_id: 'TOTHER' })), env)).status, 403);
  assert.equal((await worker.fetch(signed(payload({ api_app_id: 'AOTHER' })), env)).status, 403);
  for (const event of [{ ...payload().event, channel: 'COTHER' }, { ...payload().event, bot_id: 'BOTHER' }, { ...payload().event, subtype: 'message_changed' }, { ...payload().event, type: 'message', text: 'Private ordinary conversation' }]) await worker.fetch(signed(payload({ event })), env);
  assert.equal(db.prepare('SELECT count(*) AS n FROM slack_events').get().n, 0); db.close();
});
test('challenge verification, bounded body, health, security headers and unknown API', async () => {
  const { db, env } = fixture();
  assert.deepEqual(await (await worker.fetch(signed({ type: 'url_verification', challenge: 'test-challenge' }), env)).json(), { challenge: 'test-challenge' });
  const tooLarge = new Request('https://example.test/api/slack/events', { method:'POST', body: 'x'.repeat(33000) });
  assert.equal((await worker.fetch(tooLarge, env)).status, 413);
  const response = await worker.fetch(new Request('https://example.test/api/status'), env);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await response.json()).slackConfigured, true);
  assert.equal((await worker.fetch(new Request('https://example.test/api/unknown'), env)).status, 404);
  db.close();
});
