import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint, classify, approvalState, similarity } from '../scripts/feedback.mjs';

test('same request deduplicates Unicode/spacing variants but not different content', () => {
  const a = { title: 'Lisää Ääni!', body: '### Havainto tai idea\nToivon ääntä.\n\n### Tausta\nAloittelija' };
  const b = { title: 'lisää   ääni', body: '### Havainto tai idea\nToivon ääntä\n\n### Tausta\nKokenut' };
  assert.equal(fingerprint(a), fingerprint(b));
  assert.notEqual(fingerprint(a), fingerprint({ ...a, body: 'Ääni ei toimi.' }));
});
test('classification is deterministic and modest', () => {
  assert.equal(classify({ title: 'Painike ei toimi' }), 'type:bug');
  assert.equal(classify({ title: 'Käännös epäselvä' }), 'type:content');
  assert.equal(classify({ title: 'Uusi idea' }), 'type:idea');
  assert.ok(similarity('Lisää ääni harjoitukseen', 'Lisää ääni harjoitukseen kiitos') > 0.72);
});
const comment = (login, body, id = 1) => ({ id, body, user: { login }, updated_at: `2026-11-12T10:00:0${id}Z` });
test('only the exact owner command grants approval', () => {
  assert.equal(approvalState(null, [comment('tester', '/approve')], 'ljack', 'a').status, 'needs-owner-approval');
  assert.equal(approvalState(null, [comment('ljack', 'Maybe /approve later')], 'ljack', 'a').status, 'needs-owner-approval');
  assert.equal(approvalState(null, [comment('ljack', '/approve')], 'ljack', 'a').status, 'owner-approved');
});
test('a changed request needs a fresh owner decision and can be rejected or revoked', () => {
  const comments = [comment('ljack', '/approve')];
  const old = approvalState(null, comments, 'ljack', 'a');
  const changed = approvalState(old, comments, 'ljack', 'b');
  assert.equal(changed.status, 'needs-owner-approval');
  assert.equal(approvalState(changed, comments, 'ljack', 'b').status, 'needs-owner-approval');
  assert.equal(approvalState(changed, [...comments, comment('ljack', '/approve', 2)], 'ljack', 'b').status, 'owner-approved');
  assert.equal(approvalState(old, [...comments, comment('ljack', '/reject', 2)], 'ljack', 'a').status, 'owner-declined');
  assert.equal(approvalState(old, [], 'ljack', 'a').status, 'needs-owner-approval');
});
