# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Master Gate & Ownership Invariant**: Every `/users/{userId}` document may only be read, created, or updated by the authenticated and verified user whose `request.auth.uid == userId` and `incoming().ownerId == request.auth.uid`.
2. **Relational Sync Invariant**: Subcollections `/users/{userId}/transactions/{transactionId}` and `/users/{userId}/notifications/{notificationId}` require `exists(/databases/$(database)/documents/users/$(userId))` and `get(/databases/$(database)/documents/users/$(userId)).data.ownerId == request.auth.uid`.
3. **Immutable Ledger Invariant**: Once a `Transaction` document in `/users/{userId}/transactions/{transactionId}` is created with `status == 'completed'`, it cannot be updated or deleted (`allow update, delete: if false;`), preserving strict auditability.
4. **PII Isolation Invariant**: User documents contain PII (`email`, `mpesaPhoneNumber`, `nationalId`, `pin`). Blanket `isSignedIn()` reads or list queries on `/users` are strictly forbidden; only `get` by `isOwner(userId)` is allowed.
5. **Temporal Integrity Invariant**: All `createdAt` and `updatedAt` fields must equal `request.time` on creation, and `createdAt` must remain immutable (`incoming().createdAt == existing().createdAt`) while `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/users/{userId}`.
2. **Identity Spoofing on User Create**: Authenticated user `uid_A` setting `ownerId: "uid_B"` in `/users/uid_A`.
3. **Cross-Tenant PII Read**: Authenticated user `uid_B` attempting `get` on `/users/uid_A`.
4. **Shadow Field Injection on User Update**: Owner attempting to inject `{ "isAdmin": true }` into `/users/{userId}` update.
5. **Negative Balance Injection**: Owner attempting to set `balance: -5000` in `/users/{userId}`.
6. **PIN Format Bypass**: Owner attempting to set `pin: "abcd12"` (non-4-digit numeric) in `/users/{userId}`.
7. **ID Poisoning Attack**: Creating a transaction with a 1,500-character document ID containing special characters.
8. **Orphaned Subcollection Write**: Attempting to create `/users/{nonExistentUserId}/transactions/{txId}` without an existing parent user document.
9. **Immutable Ledger Tampering**: Owner attempting to `update` or `delete` an existing transaction in `/users/{userId}/transactions/{txId}`.
10. **Client Timestamp Forgery**: Creating a transaction where `createdAt` is a forged past timestamp instead of `request.time`.
11. **Value Poisoning on Notification Update**: Updating `isRead` on `/users/{userId}/notifications/{notifId}` with a string `"true"` or modifying immutable `smsText`.
12. **Unauthorized List Scraping**: Listing `/users/{userId}/transactions` where `resource.data.ownerId != request.auth.uid`.
