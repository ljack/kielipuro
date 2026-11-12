const encoder = new TextEncoder();
export async function secureEqual(a, b) {
  if (!a || !b) return false;
  const hashes = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', encoder.encode(s))));
  const x = new Uint8Array(hashes[0]), y = new Uint8Array(hashes[1]);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function verifySlack(request, body, secret, now = Date.now()) {
  const ts = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  if (!secret || !ts || !/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300 || !/^v0=[a-f0-9]{64}$/.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.slice(3).match(/../g), hex => parseInt(hex, 16));
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`v0:${ts}:${body}`));
}
export async function limitedBody(request, max = 32768) {
  if (Number(request.headers.get('content-length') || 0) > max) throw new Error('body_too_large');
  if (!request.body) return '';
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new Error('body_too_large'); } chunks.push(value); }
  const all = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(all);
}
