# Security Specification — RUN ACEH Firestore

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId` (`email_verified == true` for writes).
2. `UserProfile` documents contain PII (`email`, `displayName`) and must never be listable (`allow list: if false`) or readable by other signed-in users.
3. A `RunRegistration` at `/users/{userId}/registrations/{registrationId}` requires an existing parent `/users/{userId}` document (`exists(...)`), must have `userId == request.auth.uid`, `runId == registrationId`, and initial `status == 'registered'`.
4. Once a `RunRegistration` reaches terminal status `'cancelled'`, further updates are blocked.
5. `createdAt` and `updatedAt` must always equal `request.time` on creation, and `createdAt` and ownership fields (`uid`, `userId`, `runId`) are immutable on update.

## 2. Dirty Dozen Payloads (Must All Fail with PERMISSION_DENIED)
1. Unauthenticated read of `/users/user123`.
2. Unverified email (`email_verified: false`) write to `/users/user123`.
3. Cross-user read: `userA` reading `/users/userB`.
4. List query on `/users` collection to scrape emails.
5. Shadow field injection on `/users/userA` create (`{ ..., isAdmin: true }`).
6. Identity spoofing on `/users/userA` create (`{ uid: "userB", ... }`).
7. Client-forged `createdAt` timestamp not equal to `request.time`.
8. Immutable `uid` or `createdAt` mutation on `/users/userA` update.
9. Oversized `displayName` (> 120 chars) or invalid ID path variable (`../evil`).
10. Orphaned write to `/users/userA/registrations/dest-01` when `/users/userA` does not exist.
11. Creating a registration with terminal status `'cancelled'` directly or invalid `status: 'vip'`.
12. Updating a `'cancelled'` registration back to `'registered'` (state shortcutting).
