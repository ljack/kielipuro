import { createHash } from 'node:crypto';
export const normalize = text => text.normalize('NFKC').toLocaleLowerCase('fi').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
export function contentOf(issue) {
  const body = issue.body || '';
  return (body.match(/### Havainto tai idea\s*\n([\s\S]*?)(?=\n### |$)/)?.[1] || body).replace(/<!--.*?-->/gs, '').trim();
}
export function fingerprint(issue) { return createHash('sha256').update(normalize(issue.title) + '\n' + normalize(contentOf(issue))).digest('hex'); }
export function classify(issue) {
  const text = normalize(`${issue.title} ${issue.body || ''}`);
  if (/\b(bug|virhe|rikki|kaatuu|ei toimi|toimimaton)\b/.test(text)) return 'type:bug';
  if (/\b(content|kieli|käännös|kaannos|selkeys|ääntäminen|aantaminen)\b/.test(text)) return 'type:content';
  return 'type:idea';
}
export function similarity(a, b) {
  const words = s => new Set(normalize(s).split(' ').filter(w => w.length > 2));
  const x = words(a), y = words(b); if (!x.size || !y.size) return 0;
  return [...x].filter(w => y.has(w)).length / new Set([...x, ...y]).size;
}
export function approvalState(previous, comments, owner, hash, latestChange = null) {
  const commands = comments.filter(c => c.user?.login === owner && /^\/(approve|reject)\s*$/.test(c.body || ''));
  const last = commands.at(-1);
  if (!last) return { command: null, approvedHash: null, status: 'needs-owner-approval' };
  // Editing a command counts as a new decision; editing the request does not silently refresh it.
  const command = `${last.id}:${last.updated_at || last.created_at}`;
  // A first/delayed scan cannot approve a request changed after the owner's command.
  const commandTime = Date.parse(last.updated_at || last.created_at);
  const decisionCoversChange = !latestChange || commandTime >= Date.parse(latestChange);
  const approvedHash = previous?.command === command ? previous.approvedHash : decisionCoversChange ? hash : null;
  const status = last.body.trim() === '/reject' ? 'owner-declined' : approvedHash === hash ? 'owner-approved' : 'needs-owner-approval';
  return { command, approvedHash, status };
}
