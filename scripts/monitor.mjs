import { createHash } from 'node:crypto';
import { fingerprint, classify, similarity, approvalState, contentOf } from './feedback.mjs';

const repo = process.env.GITHUB_REPOSITORY || 'ljack/kielipuro';
const owner = 'ljack';
if (repo !== 'ljack/kielipuro') throw new Error('Unexpected repository');
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN required');
const base = `/repos/${repo}`;
const marker = '<!-- kielipuro-triage:v1 ';
const bot = user => user?.login === 'github-actions[bot]';
async function gh(path, method = 'GET', body) {
  const result = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'kielipuro-monitor' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!result.ok) throw new Error(`GitHub ${method} ${path}: ${result.status}`);
  return result.status === 204 ? null : result.json();
}
async function pages(path) {
  const rows = []; for (let page = 1;; page++) { const data = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`); rows.push(...data); if (data.length < 100) return rows; }
}
async function internal(path, method = 'GET', data) {
  if (!process.env.FEEDBACK_URL || !process.env.MONITOR_TOKEN) throw new Error('Feedback bridge configuration missing');
  const url = new URL(process.env.FEEDBACK_URL);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev')) throw new Error('Invalid feedback endpoint');
  const response = await fetch(new URL(`/api/internal/${path}`, url), { method, headers: { Authorization: `Bearer ${process.env.MONITOR_TOKEN}`, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Feedback bridge ${path}: ${response.status}`);
  return response.json();
}
const labels = {
  feedback: ['476B61','Customer feedback'], 'needs-owner-approval': ['E7C26B','Awaiting owner decision; implementation prohibited'],
  'owner-approved': ['176B5B','Owner approved the current request revision'], 'owner-declined': ['885454','Owner declined'],
  'type:bug': ['B04D3C','Reported malfunction'], 'type:content': ['59689A','Language or clarity feedback'], 'type:idea': ['487368','Product suggestion'],
  duplicate: ['BBBBBB','Exact duplicate linked to the canonical request'], 'possible-duplicate': ['D5BC83','Similar wording; human review required'],
  'source:slack': ['8B639A','Submitted via the configured Slack channel'], 'test:verification': ['AABBAA','Synthetic verification, not customer demand']
};
const existingLabels = await pages(`${base}/labels`);
for (const [name, [color, description]] of Object.entries(labels)) if (!existingLabels.some(l => l.name === name)) await gh(`${base}/labels`, 'POST', { name, color, description });
let issues = (await pages(`${base}/issues?state=all&sort=created&direction=asc`)).filter(i => !i.pull_request);
const cache = new Map();
async function comments(issue) { if (!cache.has(issue.number)) cache.set(issue.number, await pages(`${base}/issues/${issue.number}/comments`)); return cache.get(issue.number); }
async function commentOnce(issue, id, body) {
  const list = await comments(issue);
  if (!list.some(c => bot(c.user) && c.body.includes(id))) list.push(await gh(`${base}/issues/${issue.number}/comments`, 'POST', { body: `${body}\n\n${id}` }));
}
const sourceMarker = event => `<!-- kielipuro-source:${event.id} -->`;
const threadMarker = event => `<!-- kielipuro-thread:${event.team}:${event.channel}:${event.thread_ts} -->`;
const literal = text => text.replace(/<!--/g, '&lt;!--').replace(/@/g, '@\u200b');
// Stored markers are trusted only on comments/issues authored by this workflow bot.
const pending = await internal('pending');
for (const event of pending.events) {
  let issue = issues.find(i => bot(i.user) && i.body?.includes(threadMarker(event)));
  if (!issue) {
    for (const candidate of issues) if ((await comments(candidate)).some(c => bot(c.user) && c.body.includes(threadMarker(event)))) { issue = candidate; break; }
  }
  if (!issue) {
    const candidate = { title: event.content.split('\n')[0].slice(0, 120), body: `### Havainto tai idea\n${literal(event.content)}\n\n### Lähde\n[Slack-viesti](${event.source_url}) · käyttäjä ${event.author}\n\n${sourceMarker(event)}\n${threadMarker(event)}\n\nTämä on ehdotus, ei toteutuslupa.` };
    const same = issues.find(i => fingerprint(i) === fingerprint(candidate));
    if (same) { issue = same; await commentOnce(issue, sourceMarker(event), `Sama palaute Slackissa: [alkuperäinen viesti](${event.source_url}).\n\n${threadMarker(event)}`); }
    else { issue = await gh(`${base}/issues`, 'POST', { ...candidate, labels: ['feedback','source:slack','needs-owner-approval'] }); issues.push(issue); }
  } else if (!issue.body?.includes(sourceMarker(event))) {
    await commentOnce(issue, sourceMarker(event), `Täydennys [Slack-ketjusta](${event.source_url}) · käyttäjä ${event.author}:\n\n${literal(event.content)}\n\n${threadMarker(event)}`);
  }
  await internal('ack', 'POST', { id: event.id, issue: issue.number });
}
let processed = 0;
for (const issue of issues) {
  const list = await comments(issue);
  // Include customer discussion in the approval revision. Owner decisions and bot bookkeeping are excluded.
  const discussion = list.filter(c => !bot(c.user) && c.user?.login !== owner).map(c => `${c.id}:${c.updated_at}:${c.body}`).join('\n');
  const slackDiscussion = list.filter(c => bot(c.user) && c.body.includes('<!-- kielipuro-source:')).map(c => c.body).join('\n');
  const hash = fingerprint({ title: issue.title, body: `${issue.body || ''}\n${discussion}\n${slackDiscussion}` });
  // Full revision hash must include discussion even when the issue uses a structured form.
  const revision = createHash('sha256').update(`${issue.title}\n${issue.body || ''}\n${discussion}\n${slackDiscussion}`).digest('hex');
  const stateComment = list.find(c => bot(c.user) && c.body.startsWith(marker));
  let previous; try { previous = JSON.parse(stateComment?.body.split('\n')[0].slice(marker.length, -4)); } catch { previous = null; }
  const latestChange = [issue.updated_at, ...list.filter(c => !bot(c.user) && c.user?.login !== owner || bot(c.user) && c.body.includes('<!-- kielipuro-source:')).map(c => c.updated_at)].filter(Boolean).sort().at(-1);
  const approval = approvalState(previous, list, owner, revision, latestChange);
  const duplicate = issues.find(other => other.number < issue.number && fingerprint(other) === fingerprint(issue));
  const possible = !duplicate && issues.find(other => other.number < issue.number && similarity(`${other.title} ${contentOf(other)}`, `${issue.title} ${contentOf(issue)}`) >= 0.72);
  const managed = new Set(['feedback','needs-owner-approval','owner-approved','owner-declined','type:bug','type:idea','type:content','duplicate','possible-duplicate']);
  const nextLabels = issue.labels.map(l => l.name).filter(name => !managed.has(name));
  nextLabels.push('feedback', classify(issue), approval.status);
  if (duplicate) {
    nextLabels.push('duplicate');
    await commentOnce(issue, `<!-- kielipuro-duplicate:${duplicate.number} -->`, `Sama pyyntö on jo kirjattu: #${duplicate.number}. Jatketaan sen käsittelyä siellä. Tämä kopio suljetaan; alkuperäinen palaute säilyy.`);
    await commentOnce(duplicate, `<!-- kielipuro-duplicate-source:${issue.number} -->`, `Sama pyyntö myös: #${issue.number}. Alkuperäinen kuvaus ja keskustelu säilyvät linkissä.`);
  } else if (possible) {
    nextLabels.push('possible-duplicate');
    await commentOnce(issue, `<!-- kielipuro-possible:${possible.number} -->`, `Mahdollisesti samankaltainen pyyntö: #${possible.number}. Automaatti ei yhdistä eri sanoin kuvattuja pyyntöjä; omistaja tarkistaa yhteyden.`);
  }
  const next = { ...approval, hash, duplicate: duplicate?.number || null };
  const message = `${marker}${JSON.stringify(next)} -->\n\n**Automaattinen luokittelu:** ${classify(issue)}.\n**Päätös:** ${approval.status}.\n${duplicate ? `**Yhteinen käsittely:** #${duplicate.number}.\n` : ''}\nVain @${owner} voi hyväksyä tämän pyynnön kommentilla \`/approve\` tai hylätä sen kommentilla \`/reject\`. Pyynnön muutos tai uusi asiakkaan täydennys mitätöi hyväksynnän. Automaatti ei toteuta muutoksia.`;
  if (!stateComment) await gh(`${base}/issues/${issue.number}/comments`, 'POST', { body: message });
  else if (stateComment.body !== message) await gh(`${base}/issues/comments/${stateComment.id}`, 'PATCH', { body: message });
  if (JSON.stringify(issue.labels.map(l => l.name).sort()) !== JSON.stringify([...nextLabels].sort()) || (duplicate && issue.state === 'open')) await gh(`${base}/issues/${issue.number}`, 'PATCH', { labels: nextLabels, ...(duplicate ? { state: 'closed', state_reason: 'not_planned' } : {}) });
  processed++;
}
await internal('heartbeat', 'POST');
console.log(`Feedback monitor completed: ${processed} issues reviewed; ${pending.events.length} Slack events delivered. No code changes or implementation actions.`);
