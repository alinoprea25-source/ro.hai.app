# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every path not explicitly matched is denied (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation**: Private account fields (`email`, `accountStatus`, notification settings) live exclusively in `/users/{userId}` (`get` by owner/admin only, `list` by admin only). `/profiles/{userId}` contains zero PII.
3. **Authoritative Identity**: Client writes cannot spoof `uid`, `fromUid`, `authorId`, `organizerId`, `creatorId`, `reporterId`, or `blockerId`; every write binds directly to `request.auth.uid` and requires `request.auth.token.email_verified == true`.
4. **System-Only Fields**: `reliability_scores`, `moderation_actions`, `admins`, and verification approval fields (`isVerified`, `verificationStatus`) cannot be escalated or modified by regular users.
5. **Mutual Match Integrity**: `/matches/{userA_userB}` cannot be fabricated without existing bidirectional `/likes` documents verified via `existsAfter()`.
6. **Plan Lifecycle & Terminal State Locking**: Once a `/meetups/{meetupId}` or `/activities/{activityId}` reaches a terminal state (`CANCELLED`, `COMPLETED`, `cancelled`, `completed`), regular users cannot mutate core fields.
7. **Messaging E2EE Enforcement**: `/conversations/{conversationId}/messages/{messageId}` strictly forbids plaintext writes and requires `encryptionMode == 'e2ee_v1'` on the parent conversation plus `ciphertext`, `nonce`, and `senderPublicKey`.
8. **No Client-Delegated List Queries**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid`, public visibility flags, or `isAdmin()`, and never invokes `get()` or `exists()` inside `allow list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Verify Profile Escalation**: `UPDATE /profiles/{uid}` adding `{ "isVerified": true }` -> **REJECTED** (`affectedKeys` & `incoming().isVerified == existing().isVerified`).
2. **Ghost Field Shadow Write on User**: `CREATE /users/{uid}` adding `{ "isAdmin": true, "role": "superadmin" }` -> **REJECTED** (`keys().hasOnly(...)`).
3. **Fake Mutual Match Injection**: `CREATE /matches/uidA_uidB` without mutual `/likes` -> **REJECTED** (`existsAfter` check fails).
4. **Self-Like Spoofing**: `CREATE /likes/uidA_uidA` with `fromUid == toUid` -> **REJECTED** (`fromUid != toUid`).
5. **Blanket User PII Scraping**: `LIST /users` by non-admin authenticated user -> **REJECTED** (`allow list: if isAdmin()`).
6. **Unauthorized Reliability Score Tampering**: `WRITE /reliability_scores/{uid}` by owner setting `{ "score": 100 }` -> **REJECTED** (`allow create, update, delete: if isAdmin()`).
7. **Forcing Report Dismissal**: `UPDATE /reports/{reportId}` by reporter setting `{ "status": "eliminat" }` -> **REJECTED** (only admin can update report status).
8. **Reading Another User's Reports / Blocks**: `GET /reports/{otherId}` or `LIST /blocks` without `blockerId == request.auth.uid` -> **REJECTED**.
9. **ID Poisoning**: `CREATE /activities/{1500-char-id}` or invalid chars `bad/id$!` -> **REJECTED** (`isValidId()` regex & `<= 128`).
10. **Terminal State Bypass**: `UPDATE /meetups/{cancelledPlanId}` setting `lifecycleStatus: 'CONFIRMED'` by non-admin -> **REJECTED**.
11. **Plaintext Message Injection**: `CREATE /conversations/{id}/messages/{msgId}` with `{ "text": "hello" }` -> **REJECTED** (`encryptionMode == 'e2ee_v1'` + strict ciphertext keys required).
12. **Unverified Email Claim Spoof**: Request where `request.auth.token.email == 'revenueanatomy.media@gmail.com'` and `email_verified == false` -> **REJECTED** (`email_verified == true` enforced).

## 3. Verification Note
Static ESLint syntax and semantic validation run via `@firebase/eslint-plugin-security-rules` (`eslint .`), and rule logic is verified against all 12 adversarial vectors in Red Team Audit (Phase 5 of rules workflow) prior to finalizing `firestore.rules`.
