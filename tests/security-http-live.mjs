import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';

const BASE = process.env.HAI_TEST_BASE_URL || 'http://127.0.0.1:3000';

function forgeJwt() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'attacker-key' })
  ).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://securetoken.google.com/conductive-delight-gfx4d',
      aud: 'conductive-delight-gfx4d',
      sub: 'admin-forged',
      user_id: 'admin-forged',
      email: 'revenueanatomy.media@gmail.com',
      email_verified: true,
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  return `${data}.${sign.sign(privateKey).toString('base64url')}`;
}

async function main() {
  const health = await fetch(`${BASE}/api/health`);
  assert.equal(health.status, 200, 'Health endpoint should return 200');

  const forgedToken = forgeJwt();

  const endpoints = [
    { path: '/api/auth/session', method: 'GET' },
    { path: '/api/activities', method: 'POST', body: {} },
    { path: '/api/activities/act-padel-cluj/comments', method: 'GET' },
    { path: '/api/activities/act-tur-cetatuie/reviews', method: 'GET' },
    { path: '/api/plans', method: 'GET' },
    { path: '/api/plans', method: 'POST', body: { action: 'evaluate_reminders' } },
    { path: '/api/waitlist', method: 'GET' },
    { path: '/api/attendance', method: 'GET' },
    { path: '/api/reliability?userId=profile-ioana', method: 'GET' },
    { path: '/api/verification', method: 'GET' },
    { path: '/api/verification?scope=admin', method: 'GET' },
    { path: '/api/moderation/report', method: 'GET' },
    { path: '/api/moderation/report', method: 'PATCH', body: {} },
    { path: '/api/subscriptions/status', method: 'GET' },
  ];

  for (const ep of endpoints) {
    const noAuth = await fetch(`${BASE}${ep.path}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        'x-hai-demo-role': 'moderator-preview',
        'x-hai-user-id': 'profile-ioana',
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert.equal(noAuth.status, 401, `${ep.method} ${ep.path} must return 401 without token`);

    const forged = await fetch(`${BASE}${ep.path}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${forgedToken}`,
        'x-hai-demo-role': 'moderator-preview',
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert.equal(forged.status, 401, `${ep.method} ${ep.path} must return 401 on forged JWT`);
  }

  console.log(`Live HTTP check passed for ${endpoints.length} protected endpoints + /api/health.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
