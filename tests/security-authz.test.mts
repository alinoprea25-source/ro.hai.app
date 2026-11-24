import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/server/auth';
import { resetTrustStoreForTests } from '@/lib/server/trust-store';
import { resetVerificationStoreForTests } from '@/lib/server/verification-store';

import * as healthRoute from '@/app/api/health/route';
import * as sessionRoute from '@/app/api/auth/session/route';
import * as activitiesRoute from '@/app/api/activities/route';
import * as commentsRoute from '@/app/api/activities/[id]/comments/route';
import * as reviewsRoute from '@/app/api/activities/[id]/reviews/route';
import * as plansRoute from '@/app/api/plans/route';
import * as waitlistRoute from '@/app/api/waitlist/route';
import * as attendanceRoute from '@/app/api/attendance/route';
import * as reliabilityRoute from '@/app/api/reliability/route';
import * as verificationRoute from '@/app/api/verification/route';
import * as reportRoute from '@/app/api/moderation/report/route';
import * as subStatusRoute from '@/app/api/subscriptions/status/route';
import * as subWebhookRoute from '@/app/api/subscriptions/webhook/route';

function makeRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new NextRequest(`http://localhost:3000${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function createAttackerForgedJwt(uid: string, email: string): string {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'attacker-forged-kid' })
  ).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://securetoken.google.com/conductive-delight-gfx4d',
      aud: 'conductive-delight-gfx4d',
      auth_time: now,
      user_id: uid,
      sub: uid,
      iat: now,
      exp: now + 3600,
      email,
      email_verified: true,
    })
  ).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

const VALID_1X1_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Etapa 1 — Real Authentication, RBAC & Authorization Tests', () => {
  beforeAll(() => {
    resetTrustStoreForTests();
    resetVerificationStoreForTests();
  });

  describe('1. Real Firebase Admin SDK rejection of missing, garbage & forged tokens (no mocks)', () => {
    it('keeps /api/health public and rejects unauthenticated requests with 401 across every protected endpoint', async () => {
      const healthRes = await healthRoute.GET();
      expect(healthRes.status).toBe(200);

      const protectedCalls: Array<() => Promise<Response>> = [
        () => sessionRoute.GET(makeRequest('/api/auth/session')),
        () =>
          activitiesRoute.POST(
            makeRequest('/api/activities', { method: 'POST', body: {} })
          ),
        () =>
          commentsRoute.GET(makeRequest('/api/activities/act-padel-cluj/comments'), {
            params: Promise.resolve({ id: 'act-padel-cluj' }),
          }),
        () =>
          commentsRoute.POST(
            makeRequest('/api/activities/act-padel-cluj/comments', {
              method: 'POST',
              body: {},
            }),
            { params: Promise.resolve({ id: 'act-padel-cluj' }) }
          ),
        () =>
          commentsRoute.PATCH(
            makeRequest('/api/activities/act-padel-cluj/comments', {
              method: 'PATCH',
              body: {},
            }),
            { params: Promise.resolve({ id: 'act-padel-cluj' }) }
          ),
        () =>
          commentsRoute.DELETE(
            makeRequest('/api/activities/act-padel-cluj/comments?commentId=x', {
              method: 'DELETE',
            }),
            { params: Promise.resolve({ id: 'act-padel-cluj' }) }
          ),
        () =>
          reviewsRoute.GET(makeRequest('/api/activities/act-tur-cetatuie/reviews'), {
            params: Promise.resolve({ id: 'act-tur-cetatuie' }),
          }),
        () =>
          reviewsRoute.POST(
            makeRequest('/api/activities/act-tur-cetatuie/reviews', {
              method: 'POST',
              body: {},
            }),
            { params: Promise.resolve({ id: 'act-tur-cetatuie' }) }
          ),
        () =>
          reviewsRoute.PATCH(
            makeRequest('/api/activities/act-tur-cetatuie/reviews', {
              method: 'PATCH',
              body: {},
            }),
            { params: Promise.resolve({ id: 'act-tur-cetatuie' }) }
          ),
        () => plansRoute.GET(makeRequest('/api/plans')),
        () => plansRoute.POST(makeRequest('/api/plans', { method: 'POST', body: {} })),
        () => waitlistRoute.GET(makeRequest('/api/waitlist')),
        () =>
          waitlistRoute.POST(makeRequest('/api/waitlist', { method: 'POST', body: {} })),
        () => attendanceRoute.GET(makeRequest('/api/attendance')),
        () =>
          attendanceRoute.POST(
            makeRequest('/api/attendance', { method: 'POST', body: {} })
          ),
        () => reliabilityRoute.GET(makeRequest('/api/reliability?userId=profile-ioana')),
        () =>
          reliabilityRoute.POST(
            makeRequest('/api/reliability', { method: 'POST', body: {} })
          ),
        () =>
          reliabilityRoute.PATCH(
            makeRequest('/api/reliability', { method: 'PATCH', body: {} })
          ),
        () => verificationRoute.GET(makeRequest('/api/verification')),
        () =>
          verificationRoute.POST(
            makeRequest('/api/verification', { method: 'POST', body: {} })
          ),
        () =>
          verificationRoute.PATCH(
            makeRequest('/api/verification', { method: 'PATCH', body: {} })
          ),
        () =>
          reportRoute.GET(
            makeRequest('/api/moderation/report', {
              headers: { 'x-hai-demo-role': 'moderator-preview' },
            })
          ),
        () =>
          reportRoute.POST(
            makeRequest('/api/moderation/report', { method: 'POST', body: {} })
          ),
        () =>
          reportRoute.PATCH(
            makeRequest('/api/moderation/report', {
              method: 'PATCH',
              headers: { 'x-hai-demo-role': 'moderator-preview' },
              body: {},
            })
          ),
        () => subStatusRoute.GET(makeRequest('/api/subscriptions/status')),
      ];

      for (const call of protectedCalls) {
        const res = await call();
        expect(res.status).toBe(401);
      }
    });

    it('rejects attacker-forged RS256 JWTs and malformed tokens with 401', async () => {
      const forgedJwt = createAttackerForgedJwt(
        'admin-uid-1',
        'revenueanatomy.media@gmail.com'
      );

      const forgedRes = await reportRoute.GET(
        makeRequest('/api/moderation/report', { token: forgedJwt })
      );
      expect(forgedRes.status).toBe(401);

      const garbageRes = await plansRoute.GET(
        makeRequest('/api/plans', { token: 'not.a.valid.jwt' })
      );
      expect(garbageRes.status).toBe(401);
    });

    it('enforces webhook secret on /api/subscriptions/webhook', async () => {
      const origSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
      try {
        process.env.REVENUECAT_WEBHOOK_SECRET = 'super-secret-rc-webhook-test';
        const badRes = await subWebhookRoute.POST(
          makeRequest('/api/subscriptions/webhook', {
            method: 'POST',
            token: 'wrong-secret',
            body: { event: { app_user_id: 'demo-user-vlad' } },
          })
        );
        expect(badRes.status).toBe(401);

        const okRes = await subWebhookRoute.POST(
          makeRequest('/api/subscriptions/webhook', {
            method: 'POST',
            token: 'super-secret-rc-webhook-test',
            body: {
              event: {
                app_user_id: 'demo-user-vlad',
                type: 'INITIAL_PURCHASE',
                product_id: 'hai_plus_monthly',
                entitlement_ids: ['hai_plus'],
                expiration_at_ms: Date.now() + 86_400_000,
              },
            },
          })
        );
        expect(okRes.status).toBe(200);
      } finally {
        if (origSecret === undefined) delete process.env.REVENUECAT_WEBHOOK_SECRET;
        else process.env.REVENUECAT_WEBHOOK_SECRET = origSecret;
      }
    });
  });

  describe('2. Authenticated Authorization, RBAC, Anti-Spoofing & IDOR Protection', () => {
    let verifySpy: ReturnType<typeof spyOn>;
    let fetchSpy: ReturnType<typeof spyOn>;

    const TOKENS: Record<
      string,
      {
        uid: string;
        email: string;
        email_verified: boolean;
        name: string;
        admin?: boolean;
      }
    > = {
      'token-user-a': {
        uid: 'demo-user-vlad',
        email: 'vlad@example.com',
        email_verified: true,
        name: 'Vlad',
      },
      'token-user-b': {
        uid: 'profile-ioana',
        email: 'ioana@example.com',
        email_verified: true,
        name: 'Ioana',
      },
      'token-user-c': {
        uid: 'profile-maria',
        email: 'maria@example.com',
        email_verified: true,
        name: 'Maria',
      },
      'token-unverified-admin': {
        uid: 'unverified-admin-uid',
        email: 'revenueanatomy.media@gmail.com',
        email_verified: false,
        name: 'Fake Admin',
      },
      'token-verified-admin': {
        uid: 'verified-admin-uid',
        email: 'revenueanatomy.media@gmail.com',
        email_verified: true,
        name: 'Administrator HAI',
      },
      'token-firestore-admin': {
        uid: 'fs-admin-uid',
        email: 'moderator.fs@example.com',
        email_verified: true,
        name: 'Moderator Firestore',
      },
    };

    beforeEach(() => {
      resetTrustStoreForTests();
      resetVerificationStoreForTests();

      const authInstance = getAuth(getFirebaseAdminApp());
      verifySpy = spyOn(authInstance, 'verifyIdToken').mockImplementation(
        async (token: string) => {
          const record = TOKENS[token];
          if (!record) {
            throw new Error('Firebase ID token has invalid signature.');
          }
          return {
            uid: record.uid,
            sub: record.uid,
            email: record.email,
            email_verified: record.email_verified,
            name: record.name,
            admin: record.admin,
          } as never;
        }
      );

      const originalFetch = globalThis.fetch;
      fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();
          if (url.includes('firestore.googleapis.com')) {
            const authHeader = new Headers(init?.headers).get('Authorization');
            if (
              url.endsWith('/documents/admins/fs-admin-uid') &&
              authHeader === 'Bearer token-firestore-admin'
            ) {
              return new Response(JSON.stringify({ name: 'admins/fs-admin-uid' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return new Response(JSON.stringify({ error: { code: 403 } }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return originalFetch(input, init);
        }
      );
    });

    afterEach(() => {
      verifySpy.mockRestore();
      fetchSpy.mockRestore();
    });

    it('completely neutralizes x-hai-demo-role and x-hai-user-id spoofing for regular users', async () => {
      const sessionRes = await sessionRoute.GET(
        makeRequest('/api/auth/session', {
          token: 'token-user-a',
          headers: { 'x-hai-demo-role': 'moderator-preview' },
        })
      );
      expect(sessionRes.status).toBe(200);
      const sessionJson = await sessionRes.json();
      expect(sessionJson.isAdmin).toBe(false);
      expect(sessionJson.uid).toBe('demo-user-vlad');

      const adminRoutesDenied = await Promise.all([
        reportRoute.GET(
          makeRequest('/api/moderation/report', {
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
          })
        ),
        reportRoute.PATCH(
          makeRequest('/api/moderation/report', {
            method: 'PATCH',
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
            body: { reportId: 'rep-seed-1', decision: 'DISMISS' },
          })
        ),
        verificationRoute.GET(
          makeRequest('/api/verification?scope=admin', {
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
          })
        ),
        verificationRoute.PATCH(
          makeRequest('/api/verification', {
            method: 'PATCH',
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
            body: { submissionId: 'ver-1', decision: 'verified' },
          })
        ),
        attendanceRoute.GET(
          makeRequest('/api/attendance?scope=admin', {
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
          })
        ),
        attendanceRoute.POST(
          makeRequest('/api/attendance', {
            method: 'POST',
            token: 'token-user-a',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
            body: {
              action: 'resolve_dispute',
              disputeId: 'disp-seed-1',
              outcome: 'RESOLVED_EXCUSED',
            },
          })
        ),
      ]);

      for (const res of adminRoutesDenied) {
        expect(res.status).toBe(403);
      }

      // Spoofing x-hai-user-id or ?viewerId to read another user's private reliability breakdown
      const relRes = await reliabilityRoute.GET(
        makeRequest(
          '/api/reliability?userId=profile-ioana&viewerId=profile-ioana',
          {
            token: 'token-user-a',
            headers: {
              'x-hai-user-id': 'profile-ioana',
              'x-hai-demo-role': 'moderator-preview',
            },
          }
        )
      );
      expect(relRes.status).toBe(200);
      const relJson = await relRes.json();
      expect(relJson.isOwner).toBe(false);
      expect(relJson.breakdown).toBeUndefined();
      expect(relJson.summary).toBeDefined();

      // Direct reliability tampering remains forbidden
      const relPost = await reliabilityRoute.POST(
        makeRequest('/api/reliability', {
          method: 'POST',
          token: 'token-user-a',
          body: { score: 100 },
        })
      );
      expect(relPost.status).toBe(403);
    });

    it('rejects unverified-email admin accounts with 403 and permits verified admins + Firestore admins', async () => {
      const unverifiedSession = await sessionRoute.GET(
        makeRequest('/api/auth/session', { token: 'token-unverified-admin' })
      );
      expect(unverifiedSession.status).toBe(200);
      expect((await unverifiedSession.json()).isAdmin).toBe(false);

      const unverifiedReports = await reportRoute.GET(
        makeRequest('/api/moderation/report', { token: 'token-unverified-admin' })
      );
      expect(unverifiedReports.status).toBe(403);

      const unverifiedQueue = await verificationRoute.GET(
        makeRequest('/api/verification?scope=admin', {
          token: 'token-unverified-admin',
        })
      );
      expect(unverifiedQueue.status).toBe(403);

      // User A submits verification (must bind to User A UID even if body attempts to pass userB)
      const submitVer = await verificationRoute.POST(
        makeRequest('/api/verification', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            userId: 'profile-ioana',
            userName: 'Vlad',
            poseId: 'pose-peace-left',
            photoDataUrl: VALID_1X1_PNG,
          },
        })
      );
      expect(submitVer.status).toBe(200);
      const submitJson = await submitVer.json();
      expect(submitJson.verification.status).toBe('pending');
      expect(submitJson.verification.photoDataUrl).toBeUndefined();

      // User A checking own verification omits photoDataUrl
      const selfVer = await verificationRoute.GET(
        makeRequest('/api/verification', { token: 'token-user-a' })
      );
      expect(selfVer.status).toBe(200);
      const selfVerJson = await selfVer.json();
      expect(selfVerJson.status).toBe('pending');
      expect(selfVerJson.photoDataUrl).toBeUndefined();

      // User B checking User A verification is blocked with 403
      const crossVer = await verificationRoute.GET(
        makeRequest('/api/verification?userId=demo-user-vlad', {
          token: 'token-user-b',
        })
      );
      expect(crossVer.status).toBe(403);

      // Verified admin sees queue with selfie image and can approve
      const adminQueue = await verificationRoute.GET(
        makeRequest('/api/verification?scope=admin', {
          token: 'token-verified-admin',
        })
      );
      expect(adminQueue.status).toBe(200);
      const queueJson = await adminQueue.json();
      expect(queueJson.submissions.length).toBe(1);
      expect(queueJson.submissions[0].userId).toBe('demo-user-vlad');
      expect(queueJson.submissions[0].photoDataUrl).toBe(VALID_1X1_PNG);

      // Firestore-backed admin is also recognized
      const fsSession = await sessionRoute.GET(
        makeRequest('/api/auth/session', { token: 'token-firestore-admin' })
      );
      expect((await fsSession.json()).isAdmin).toBe(true);

      const fsApprove = await verificationRoute.PATCH(
        makeRequest('/api/verification', {
          method: 'PATCH',
          token: 'token-firestore-admin',
          body: {
            submissionId: queueJson.submissions[0].id,
            decision: 'verified',
            reviewNote: 'Aprobat de moderator.',
          },
        })
      );
      expect(fsApprove.status).toBe(200);
      expect((await fsApprove.json()).submission.status).toBe('verified');
    });

    it('prevents cross-user IDOR across plans, waitlist offers, attendance, comments, reviews, and appeals', async () => {
      // User B creates a private 1-to-1 meetup with User C (User A is NOT a participant)
      const createPlanRes = await plansRoute.POST(
        makeRequest('/api/plans', {
          method: 'POST',
          token: 'token-user-b',
          body: {
            action: 'create_plan',
            type: 'meetup',
            title: 'Cafea Ioana & Maria',
            dateLabel: 'Sâmbătă',
            isoDate: '2026-12-10',
            time: '18:00',
            city: 'Cluj-Napoca',
            location: 'Olivo',
            creatorId: 'demo-user-vlad', // spoof attempt ignored; binds to token-user-b
            creatorName: 'Ioana',
            partnerId: 'profile-maria',
            partnerName: 'Maria',
          },
        })
      );
      expect(createPlanRes.status).toBe(200);
      const createdPlan = (await createPlanRes.json()).plan;
      expect(
        createdPlan.confirmations.some((c: { userId: string }) => c.userId === 'demo-user-vlad')
      ).toBe(false);
      const bPlanId = createdPlan.id;

      // User A cannot view, confirm, propose changes, or cancel User B+C's plan (even spoofing userId in body)
      expect(
        (
          await plansRoute.GET(
            makeRequest(`/api/plans?planId=${encodeURIComponent(bPlanId)}`, {
              token: 'token-user-a',
            })
          )
        ).status
      ).toBe(403);

      expect(
        (
          await plansRoute.POST(
            makeRequest('/api/plans', {
              method: 'POST',
              token: 'token-user-a',
              body: {
                action: 'confirm',
                planId: bPlanId,
                userId: 'profile-maria',
                userName: 'Maria',
              },
            })
          )
        ).status
      ).toBe(403);

      expect(
        (
          await plansRoute.POST(
            makeRequest('/api/plans', {
              method: 'POST',
              token: 'token-user-a',
              body: {
                action: 'propose_changes',
                planId: bPlanId,
                userId: 'profile-ioana',
                kind: 'time',
                slots: [
                  {
                    id: 's1',
                    dateLabel: 'Duminică',
                    isoDate: '2026-12-11',
                    time: '19:00',
                    location: 'Alt loc',
                  },
                ],
              },
            })
          )
        ).status
      ).toBe(403);

      expect(
        (
          await plansRoute.POST(
            makeRequest('/api/plans', {
              method: 'POST',
              token: 'token-user-a',
              body: {
                action: 'cancel',
                planId: bPlanId,
                userId: 'profile-ioana',
              },
            })
          )
        ).status
      ).toBe(403);

      // User A blocking User B must NOT cancel plans where User A is not a participant
      await plansRoute.POST(
        makeRequest('/api/plans', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            action: 'safe_block_transition',
            blockedUserId: 'profile-ioana',
            blockedUserName: 'Ioana',
          },
        })
      );
      const checkBPlan = await plansRoute.GET(
        makeRequest(`/api/plans?planId=${encodeURIComponent(bPlanId)}`, {
          token: 'token-user-b',
        })
      );
      expect(checkBPlan.status).toBe(200);
      expect((await checkBPlan.json()).plan.status).not.toBe('cancelled');

      // Waitlist offer IDOR: User B tries to accept User A's seeded offer (wlo-seed-1)
      const stealOffer = await waitlistRoute.POST(
        makeRequest('/api/waitlist', {
          method: 'POST',
          token: 'token-user-b',
          body: {
            action: 'accept_offer',
            offerId: 'offer-cafea-vlad',
            userId: 'demo-user-vlad',
          },
        })
      );
      expect(stealOffer.status).toBe(403);

      // Attendance IDOR: User B tries to read or dispute User A's record (att-vlad-6)
      const readOtherAtt = await attendanceRoute.GET(
        makeRequest('/api/attendance?userId=demo-user-vlad', {
          token: 'token-user-b',
        })
      );
      expect(readOtherAtt.status).toBe(403);

      const disputeOtherAtt = await attendanceRoute.POST(
        makeRequest('/api/attendance', {
          method: 'POST',
          token: 'token-user-b',
          body: {
            action: 'dispute_record',
            recordId: 'att-vlad-6',
            userId: 'demo-user-vlad',
            reason: 'Încercare IDOR pe prezență.',
          },
        })
      );
      expect(disputeOtherAtt.status).toBe(403);

      // Comments ownership & moderator delete privilege check
      const postCommentA = await commentsRoute.POST(
        makeRequest('/api/activities/act-padel-cluj/comments', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            authorId: 'profile-ioana', // spoof attempt ignored
            authorName: 'Vlad',
            content: 'Comentariul lui Vlad',
          },
        }),
        { params: Promise.resolve({ id: 'act-padel-cluj' }) }
      );
      expect(postCommentA.status).toBe(200);
      const cmtJson = (await postCommentA.json()).comment;
      expect(cmtJson.authorId).toBe('demo-user-vlad');

      const editCommentByB = await commentsRoute.PATCH(
        makeRequest('/api/activities/act-padel-cluj/comments', {
          method: 'PATCH',
          token: 'token-user-b',
          body: {
            commentId: cmtJson.id,
            actorId: 'demo-user-vlad',
            content: 'Text alterat de B',
          },
        }),
        { params: Promise.resolve({ id: 'act-padel-cluj' }) }
      );
      expect(editCommentByB.status).toBe(403);

      const deleteCommentByBWithHeader = await commentsRoute.DELETE(
        makeRequest(
          `/api/activities/act-padel-cluj/comments?commentId=${encodeURIComponent(
            cmtJson.id
          )}&actorId=demo-user-vlad`,
          {
            method: 'DELETE',
            token: 'token-user-b',
            headers: { 'x-hai-demo-role': 'moderator-preview' },
          }
        ),
        { params: Promise.resolve({ id: 'act-padel-cluj' }) }
      );
      expect(deleteCommentByBWithHeader.status).toBe(403);

      // Reviews ownership check
      const postReviewA = await reviewsRoute.POST(
        makeRequest('/api/activities/act-tur-cetatuie/reviews', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            authorName: 'Vlad',
            rating: 5,
            feedback: 'Organizare foarte bună, grup punctual și atmosferă plăcută.',
          },
        }),
        { params: Promise.resolve({ id: 'act-tur-cetatuie' }) }
      );
      expect(postReviewA.status).toBe(200);
      const revA = (await postReviewA.json()).review;

      const editReviewByOrganizerB = await reviewsRoute.PATCH(
        makeRequest('/api/activities/act-tur-cetatuie/reviews', {
          method: 'PATCH',
          token: 'token-user-b',
          body: {
            reviewId: revA.id,
            actorId: 'demo-user-vlad',
            feedback: 'Organizatorul nu poate edita recenzia participantului.',
          },
        }),
        { params: Promise.resolve({ id: 'act-tur-cetatuie' }) }
      );
      expect(editReviewByOrganizerB.status).toBe(403);

      // Moderation appeal authorization: User C cannot appeal a report on User A's comment
      const reportByB = await reportRoute.POST(
        makeRequest('/api/moderation/report', {
          method: 'POST',
          token: 'token-user-b',
          body: {
            targetType: 'comment',
            targetId: cmtJson.id,
            targetTitle: 'Comentariu Vlad',
            reason: 'Limbaj inadecvat',
          },
        })
      );
      expect(reportByB.status).toBe(200);
      const repId = (await reportByB.json()).report.id;

      await reportRoute.PATCH(
        makeRequest('/api/moderation/report', {
          method: 'PATCH',
          token: 'token-verified-admin',
          body: {
            reportId: repId,
            decision: 'REMOVE_CONTENT',
            reason: 'Eliminat pentru verificare contestație.',
          },
        })
      );

      const unauthorizedAppeal = await reportRoute.POST(
        makeRequest('/api/moderation/report', {
          method: 'POST',
          token: 'token-user-c',
          body: {
            action: 'appeal',
            reportId: repId,
            appealNote: 'Maria încearcă să conteste în numele lui Vlad.',
          },
        })
      );
      expect(unauthorizedAppeal.status).toBe(403);

      const ownerAppeal = await reportRoute.POST(
        makeRequest('/api/moderation/report', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            action: 'appeal',
            reportId: repId,
            appealNote: 'Contestația autorului comentariului.',
          },
        })
      );
      expect(ownerAppeal.status).toBe(200);
    });

    it('preserves full legitimate owner and admin workflows end-to-end', async () => {
      // Legitimate owner reads own reliability breakdown
      const ownRel = await reliabilityRoute.GET(
        makeRequest('/api/reliability?userId=demo-user-vlad', {
          token: 'token-user-a',
        })
      );
      expect(ownRel.status).toBe(200);
      const ownRelJson = await ownRel.json();
      expect(ownRelJson.isOwner).toBe(true);
      expect(ownRelJson.breakdown).toBeDefined();

      // Legitimate owner creates an activity
      const actCreate = await activitiesRoute.POST(
        makeRequest('/api/activities', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            title: 'Alergare de seară Parcul Central',
            category: 'Sport',
            description: 'Alergare lejeră 5 km pentru toate nivelurile.',
            isoDate: '2026-12-15',
            time: '18:30',
            city: 'Cluj-Napoca',
            location: 'Intrarea principală Parcul Central',
            maxParticipants: 8,
            priceLei: null,
            requiresApproval: false,
          },
        })
      );
      expect(actCreate.status).toBe(200);
      expect((await actCreate.json()).validatedActivity.organizerId).toBe('demo-user-vlad');

      // Legitimate owner performs group check-in & submits dispute -> verified admin resolves it
      const checkInRes = await attendanceRoute.POST(
        makeRequest('/api/attendance', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            action: 'check_in_code',
            activityId: 'act-padel-cluj',
            code: 'PAD428',
          },
        })
      );
      expect(checkInRes.status).toBe(200);

      const disputeRes = await attendanceRoute.POST(
        makeRequest('/api/attendance', {
          method: 'POST',
          token: 'token-user-a',
          body: {
            action: 'dispute_record',
            recordId: 'att-vlad-6',
            userName: 'Vlad',
            reason: 'Am anunțat din timp anularea.',
          },
        })
      );
      expect(disputeRes.status).toBe(200);
      const disputeId = (await disputeRes.json()).dispute.id;

      const adminResolve = await attendanceRoute.POST(
        makeRequest('/api/attendance', {
          method: 'POST',
          token: 'token-verified-admin',
          body: {
            action: 'resolve_dispute',
            disputeId,
            outcome: 'RESOLVED_EXCUSED',
          },
        })
      );
      expect(adminResolve.status).toBe(200);

      // Legitimate owner checks subscription status using verified UID
      const subRes = await subStatusRoute.GET(
        makeRequest('/api/subscriptions/status', { token: 'token-user-a' })
      );
      expect(subRes.status).toBe(200);
      expect((await subRes.json()).uid).toBe('demo-user-vlad');
    });
  });
});
