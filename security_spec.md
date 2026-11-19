# Firestore Security Specification (Odibot Adventure Leaderboard & Cloud Sync)

## 1. Data Invariants
- Every document in `leaderboard/{userId}` contains strictly non-PII public gameplay metrics (`uid`, `displayName`, `skinId`, `badgeCount`, `fastestMissionMs`, `fastestLevelTitle`, `completedMissions`, `totalStars`, `updatedAt`) and must be bounded and authored exclusively by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
- Every document in `users/{userId}` isolates private account metadata (`email`, `completedLevels`, `unlockedBadges`, `stats`) so only the verified owner can read (`get`), create, update, or delete their own document, with `list` completely denied (`allow list: if false;`) to prevent PII scraping.
- Server timestamps (`updatedAt == request.time`) are strictly enforced on every create and update.

## 2. Adversarial "Dirty Dozen" Payloads (All Rejected with PERMISSION_DENIED)
1. Unauthenticated write to `/leaderboard/user1` -> Denied (`request.auth == null`).
2. Cross-user write (`auth.uid = 'user1'` writing to `/leaderboard/user2`) -> Denied (`request.auth.uid == userId`).
3. Unverified email user writing to `/leaderboard/user1` (`email_verified: false`) -> Denied.
4. Spoofed `uid` inside payload (`uid: 'victim'` when path is `user1`) -> Denied (`data.uid == userId`).
5. Shadow/ghost field injection (`{ ..., isAdmin: true, email: 'leak@test.com' }`) -> Denied (`hasOnly`).
6. Oversized `displayName` (`> 40` chars) or `fastestLevelTitle` (`> 80` chars) -> Denied (`.size()` bounds).
7. Impossible `badgeCount` (`999` or `-1`) -> Denied (`0 <= badgeCount <= 10`).
8. Invalid/negative `fastestMissionMs` (`-50` or `99999999`) -> Denied (`0 <= fastestMissionMs <= 3600000`).
9. Client-forged `updatedAt` timestamp not equal to `request.time` -> Denied (`data.updatedAt == request.time`).
10. Cross-user read or collection `list` query on `/users` -> Denied (`allow list: if false` / `isVerifiedOwner`).
11. ID poisoning path injection (`/leaderboard/../../../admin` or >128 chars) -> Denied (`isValidId`).
12. Mutating immutable `uid` during update -> Denied (`incoming().uid == existing().uid` and `affectedKeys().hasOnly(...)`).
