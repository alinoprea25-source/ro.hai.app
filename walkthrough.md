# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 10

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Spoofable Admin Header Bypass | `app/api/moderation/report/route.ts` | 9 | Admin and moderation routes trusted a client-controlled `x-hai-demo-role: moderator-preview` header to grant privileged access. | Critical | Fixed | Replaced header checks with `requireAdmin(req)` backed by Firebase Admin SDK `verifyIdToken` and server-verified admin checks (`isAuthorizedAdmin`). |
| Unauthenticated Moderation & Admin Actions | `app/api/verification/route.ts` | 29, 153 | Verification review (`PATCH`) and the private verification photo queue (`GET`) relied on the spoofable role header, exposing private selfie images and approval actions. | Critical | Fixed | Enforced `requireAuth` for user checks (without returning `photoDataUrl`), restricted `scope=admin` and `PATCH` to `isAuthorizedAdmin` / `requireAdmin`. |
| Unauthenticated Admin Dispute Resolution | `app/api/attendance/route.ts` | 26, 130 | Attendance dispute queues and resolution actions relied on `x-hai-demo-role` instead of a verified administrator identity. | Critical | Fixed | Required Firebase ID Token authentication across all methods, restricted `scope=admin` and `resolve_dispute` to verified admins, and derived `moderatorId` from `user.uid`. |
| Missing Server Token Verification on Business APIs | `lib/server/auth.ts` | 39, 75 | Protected routes (`/api/activities`, `/api/plans`, `/api/waitlist`, `/api/attendance`, `/api/reliability`, `/api/verification`, `/api/moderation/report`) accepted requests without verifying a Firebase ID Token. | Critical | Fixed | Added `lib/server/auth.ts` (`verifyFirebaseBearerToken`, `requireAuth`, `isAuthorizedAdmin`, `requireAdmin`) using official `firebase-admin/auth` `verifyIdToken` and applied it across all 11 private routes. |
| Client-Supplied Identity Spoofing (UID / Viewer / Actor) | `app/api/plans/route.ts` | 117 | API handlers trusted `userId`, `creatorId`, `authorId`, `actorId`, and `viewerId` from request bodies, query strings, or headers instead of the authenticated session. | High | Fixed | Removed client-identity trust across all routes; user identity is extracted exclusively from `user.uid` in the verified Firebase ID Token. |
| Cross-User Plan & Block Authorization Gaps | `lib/server/trust-store.ts` | 790, 2348 | Plan lookups, confirmations, reschedules, cancellations, and safety-block transitions did not verify plan participation or isolate block side-effects to shared plans. | High | Fixed | Enforced `isPlanParticipant(plan, userId)` returning `403`, removed an organizer-flag bug on cancellations, and restricted `handleSafetyBlockTransition` to `meetup` plans where both users participate. |
| Cross-User Waitlist, Attendance & Appeal Access | `app/api/waitlist/route.ts` | 29, 102 | Users could query other users' waitlist offers, trigger global expiry with simulated timestamps, view or dispute others' attendance, or appeal third-party moderation reports. | High | Fixed | Scoped waitlist/attendance queries to the authenticated user (or organizer/admin where applicable), required involvement for expiry, and restricted moderation appeals to the affected owner or admin. |
| Reliability Breakdown Leakage via Viewer Parameter | `app/api/reliability/route.ts` | 16 | Clients could pass `?viewerId=<targetUserId>` to view another user's private attendance breakdown. | Medium | Fixed | Derived `viewerId` exclusively from `user.uid`, returning private `breakdown` only when `targetUserId === user.uid`. |
| Client Code Importing Server Module & Spoofed Role UI | `components/screens/ProfileScreen.tsx` | 88, 374 | Client components sent `x-hai-demo-role` headers, passed spoofable user IDs, displayed the admin moderation tab to all users, and `VerificationModal.tsx` imported from `lib/server/verification-store.ts`. | Medium | Fixed | Added `authorizedFetch` in `lib/api-client.ts` to attach `Authorization: Bearer <idToken>`, extracted `POSE_CHALLENGES` into `lib/constants/verification.ts`, and gated moderation UI behind `/api/auth/session`. |
| Unverified Email Admin Escalation Guard | `lib/server/auth.ts` | 129 | An account matching an allowlisted admin email without `email_verified === true` could otherwise claim admin rights. | High | Fixed | Required `user.emailVerified === true` inside `isAuthorizedAdmin` before checking custom claims, admin email allowlist, or Firestore `/admins/{uid}` ownership. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Firebase ID Token Verification | `lib/server/auth.ts` | Uses official `firebase-admin/auth` `getAuth().verifyIdToken(idToken)` bound to `firebase-applet-config.json` project ID; rejects missing, malformed, expired, and forged tokens with HTTP 401. |
| Subscription Webhook Authentication | `app/api/subscriptions/webhook/route.ts` | Validates the `Authorization` bearer secret against `REVENUECAT_WEBHOOK_SECRET` using constant-time comparison (`timingSafeEqual`) in `lib/server/subscription-store.ts` and returns 503 if unconfigured. |
| Firestore Rules Enforcement | `firestore.rules` | Enforces owner-only access on user documents, server-immutable admin records (`/admins/{adminId}`), and least-privilege access rules deployed to Firestore. |
| Rate Limiting & Input Sanitization | `lib/server/rate-limit.ts` | Applies per-UID sliding-window rate limits and strips/bounds plain-text user inputs before processing. |

## PoC Verification

### Unauthenticated & Forged-Token Access to Private & Admin Endpoints

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Authentication Check |
| Impact | High |
| Affected File | `app/api/moderation/report/route.ts:8`, `app/api/plans/route.ts:50`, `lib/server/auth.ts:75` |
| Test Scenario | `GET /api/moderation/report` and `GET /api/plans` sent without an `Authorization` header (with `x-hai-demo-role: moderator-preview`), and with a forged RS256 JWT signed by an attacker-generated 2048-bit RSA keypair. |

#### How It Was Fixed
Every private route now executes `await requireAuth(req)` or `await requireAdmin(req)` at the top of the handler, which validates the `Bearer` JWT against Google's Firebase public keys via `getAuth(adminApp).verifyIdToken(idToken)`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request reaches `GET /api/moderation/report` or `GET /api/plans` | Enters `requireAdmin(req)` / `requireAuth(req)` |
| 2 | `verifyFirebaseBearerToken` extracts Bearer token and calls `getAuth(adminApp).verifyIdToken(idToken)` (`lib/server/auth.ts:47`) | Missing token returns `null`; forged RS256 signature throws verification error and returns `null` |
| 3 | `requireAuth` detects `!user` (`lib/server/auth.ts:82`) | Returns HTTP `401` immediately; no business data or admin logs are returned (**Handled Safely**) |

### Admin Privilege Escalation via `x-hai-demo-role` Header Spoofing

#### Summary
| Field | Value |
|---|---|
| Issue Type | Client-Controlled Role Bypass |
| Impact | High |
| Affected File | `lib/server/auth.ts:128`, `app/api/verification/route.ts:29`, `app/api/attendance/route.ts:130` |
| Test Scenario | Authenticated standard user (`token-user-a`) sends `x-hai-demo-role: moderator-preview` to `GET /api/verification?scope=admin`, `PATCH /api/verification`, `GET /api/moderation/report`, `PATCH /api/moderation/report`, and `POST /api/attendance` (`action: "resolve_dispute"`). |

#### How It Was Fixed
`x-hai-demo-role` is never read anywhere in the codebase. Admin privileges require `user.emailVerified === true` plus verified server-trusted claims, server allowlist email, or an authenticated Firestore `/admins/{uid}` document lookup.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Standard user's valid Firebase ID token passes `requireAuth(req)` | `user` is resolved with `uid: "demo-user-vlad"` |
| 2 | Handler calls `isAuthorizedAdmin(user)` (`lib/server/auth.ts:128`) or `requireAdmin(req)` (`lib/server/auth.ts:141`) | Custom claim, admin email allowlist, and `/admins/{uid}` document check all return `false` |
| 3 | Route returns `403 Acces restricționat` | Standard user cannot view selfies, approve verifications, moderate reports, or resolve disputes (**Handled Safely**) |

### Cross-User IDOR via Spoofed `userId` / `viewerId` / `actorId`

#### Summary
| Field | Value |
|---|---|
| Issue Type | Cross-User Data & Action Bypass |
| Impact | High |
| Affected File | `app/api/reliability/route.ts:17`, `app/api/plans/route.ts:66`, `lib/server/trust-store.ts:790` |
| Test Scenario | `userA` requests `GET /api/reliability?userId=profile-ioana&viewerId=profile-ioana` with `x-hai-user-id: profile-ioana`, and sends `POST /api/plans` (`action: "confirm"`, `planId: <userB's plan>`, `userId: "profile-maria"`). |

#### How It Was Fixed
All handlers ignore body/query/header user identifiers for actor or viewer resolution and bind identity to `user.uid`, while `trust-store.ts` verifies plan participation (`isPlanParticipant`) and record/comment/review ownership before returning or mutating data.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `GET /api/reliability` ignores `viewerId` and passes `user.uid` (`app/api/reliability/route.ts:17`) | `isOwner` evaluates to `false`; private `breakdown` is omitted |
| 2 | `POST /api/plans` binds `userId = user.uid` (`app/api/plans/route.ts:117`) and calls `confirmPlanParticipant` (`lib/server/trust-store.ts:790`) | `isPlanParticipant(plan, userId)` returns `false` |
| 3 | `confirmPlanParticipant` returns `{ ok: false, statusCode: 403 }` | Cross-user confirmation rejected with HTTP `403` (**Handled Safely**) |
