# PersonaLens Security Specification

## 1. Data Invariants
1. **Per-User Private Isolation**: A user can only read, create, update, or delete documents in `users`, `situations`, `analyses`, and `rehearsals` where `userId == request.auth.uid` (or `userId` path matches `request.auth.uid`).
2. **Read-Only Reference Libraries**: `personas` and `evidenceLibrary` are strictly read-only for regular signed-in users (`allow get, list: if isSignedIn();`) and writable only by verified administrators.
3. **Referential Integrity**: An `Analysis` or `Rehearsal` document cannot be created unless its `situationId` exists in `/situations` and belongs to `request.auth.uid`, and its `personaId` exists in `/personas`.
4. **Immutable Ownership & Timestamps**: `id`, `userId`, `createdAt` (and `situationId`, `personaId` on rehearsals) are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. **Terminal State Locking**: Once a `Rehearsal` receives final `feedback` (non-empty string), neither `messages` nor `feedback` can be mutated again.
6. **Verified Identity**: All client writes require `request.auth != null && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Situation**: `{ id: "sit-1", userId: "uid-a", title: "Test", description: "Long enough description here", desiredOutcome: "Resolve peacefully", otherPersonRole: "Manager", createdAt: serverTime, isAdmin: true }` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly`).
2. **Identity Spoofing on Situation**: Signed in as `uid-a`, payload sets `userId: "uid-b"` -> `PERMISSION_DENIED` (`incoming().userId == request.auth.uid`).
3. **Client-Forged Timestamp on Create**: `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
4. **Path ID Poisoning**: Document path `/situations/bad$id/extra` or 500-char ID -> `PERMISSION_DENIED` (`isValidId`).
5. **Non-Admin Write to `personas`**: Regular user tries `setDoc(doc(db, 'personas', 'custom'), ...)` -> `PERMISSION_DENIED`.
6. **Non-Admin Write to `evidenceLibrary`**: Regular user tries `updateDoc(doc(db, 'evidenceLibrary', 'nvc'), ...)` -> `PERMISSION_DENIED`.
7. **Cross-User PII Read on `users`**: `uid-a` calls `getDoc(doc(db, 'users', 'uid-b'))` -> `PERMISSION_DENIED`.
8. **Unscoped List Query on `situations`**: `uid-a` calls `getDocs(collection(db, 'situations'))` without `where('userId', '==', 'uid-a')` -> `PERMISSION_DENIED` (`resource.data.userId == request.auth.uid`).
9. **Orphaned Analysis Reference**: `uid-a` creates an analysis pointing to `situationId: "uid-b-situation"` owned by `uid-b` -> `PERMISSION_DENIED` (`get(...).data.userId == request.auth.uid`).
10. **Immutable Ownership Hijack on Update**: `uid-a` updates own situation attempting to change `userId` or `createdAt` -> `PERMISSION_DENIED`.
11. **Terminal Feedback Override on Rehearsal**: `uid-a` attempts to append `messages` after `feedback` is already populated -> `PERMISSION_DENIED`.
12. **Denial-of-Wallet String/Array Overflow**: Sending a 50KB `description` or 100-item `messages` array -> `PERMISSION_DENIED` (size caps enforced).
