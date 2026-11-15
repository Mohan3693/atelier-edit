# Firestore Security Specification (`Atelier Edit`)

## 1. Data Invariants
1. **Default Deny**: Every unmatched path is denied (`allow read, write: if false`).
2. **Verified Owner Isolation**: Every user document and subcollection (`/users/{userId}/private/profile`, `/users/{userId}/preferences/{prefId}`, `/users/{userId}/savedLooks/{lookId}`, `/users/{userId}/analyses/{analysisId}`) requires `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
3. **PII Isolation**: User email is isolated exclusively in `/users/{userId}/private/profile`, readable and writable only by the owner (`userId == request.auth.uid`).
4. **Immutable Ownership & Timestamps**: `uid` and `createdAt` cannot change after creation; `createdAt == request.time` on create and `updatedAt == request.time` on update.
5. **Bounded Types & Strict Keys**: Every write validates `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, exact `is string` + `.size()` caps matching `firebase-blueprint.json`, valid ID regex `^[a-zA-Z0-9_\-]+$`, and bounded array length (`<= 6`) with first-element type validation.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. Unauthenticated read/write to `/users/userA/savedLooks/look-1`.
2. Unverified email token (`email_verified: false`) attempting `create` on `/users/userA/private/profile`.
3. Cross-tenant `get` on `/users/userB/private/profile` while signed in as `userA`.
4. Cross-tenant `list` on `/users/userB/savedLooks` while signed in as `userA`.
5. Identity spoofing (`uid: "userB"`) on create at `/users/userA/savedLooks/look-1`.
6. Ghost / shadow field (`isAdmin: true`) injected on create at `/users/userA/private/profile`.
7. Shadow update adding an unallowed key (`anchorItemName` or `extra: 1`) on `/users/userA/preferences/default`.
8. Mutating immutable `uid` or `createdAt` during update on `/users/userA/savedLooks/look-1`.
9. Spoofing client-side `createdAt` timestamp (`Timestamp.fromMillis(0)`) instead of `request.time`.
10. Oversized `piecesSummary` (> 1600 chars) or `title` (> 140 chars) Denial-of-Wallet payload on `/users/userA/savedLooks/look-1`.
11. Unbounded `paletteHexes` array (7 elements) or non-string element (`[123]`) on `/users/userA/analyses/a-1`.
12. Path ID poisoning (`lookId` containing `$bad.id` or > 128 chars) on `/users/userA/savedLooks/{lookId}`.

## 3. Test Runner
See `firestore.rules.test.ts` verifying all 12 adversarial payloads against the hardened rules.
