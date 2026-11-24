# Database Architecture Audit

**Project:** Begin — Campus Startup Discovery Platform  
**Backend:** Node.js / Express, Mongoose ODM, MongoDB  
**Audit Scope:** Full data layer review in preparation for PostgreSQL migration  
**Date:** 2026-11-24  

---

## 1. Architecture Overview

Begin is structured as a modular monolith under `src/modules/`. Each module owns its own models, service, controller, and routes. There is no repository abstraction layer between services and Mongoose models; all database interactions occur directly in service files and in one middleware file. The infrastructure layer (`src/infrastructure/database/`) provides the connection bootstrap, but no shared query utilities.

The data layer is entirely MongoDB via Mongoose. There are seven Mongoose models across six modules: `auth`, `onboarding` (no dedicated model; uses `Profile`), `profiles`, `startups`, `discovery`, `posts`, and `home` (no data model; renders views). All models use Mongoose's default `_id` field (BSON ObjectId) as the primary key and rely on Mongoose schema options for validation, defaults, and lifecycle hooks.

---

## 2. Data Models

### 2.1 Auth (`src/modules/auth/models/auth.model.js`)

Collection name: `auths`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `email` | String | required, unique, lowercase, trim, indexed |
| `googleId` | String | default: null, sparse index |
| `isEmailVerified` | Boolean | default: false |
| `emailVerifiedAt` | Date | default: null |
| `profileImageUrl` | String | default: `/images/default.svg` |
| `role` | String | enum: `USER`, `ADMIN`; default: `USER` |
| `isActive` | Boolean | default: true |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Indexes:**
- Unique index on `email`
- Sparse index on `googleId` (supports null; allows multiple null values)

---

### 2.2 EmailOTP (`src/modules/auth/models/otp.model.js`)

Collection name: `emailotps`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `email` | String | required, lowercase, trim, indexed |
| `otpHash` | String | required; bcrypt hash of the OTP code |
| `purpose` | String | required; enum: `SIGNUP`, `LOGIN` |
| `expiresAt` | Date | required; TTL field |
| `attempts` | Number | default: 0 |
| `isUsed` | Boolean | default: false |
| `verifiedAt` | Date | default: null |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Indexes:**
- Standard index on `email`
- TTL index on `expiresAt` with `expireAfterSeconds: 0` — MongoDB automatically deletes the document when `expiresAt` is reached

---

### 2.3 Profile (`src/modules/profiles/models/profile.model.js`)

Collection name: `profiles`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId | ref: `Auth`; required, unique, indexed |
| `fullName` | String | trim, default: `""` |
| `college` | String | trim, default: `""` |
| `year` | String | trim, default: `""` |
| `branch` | String | trim, default: `""` |
| `bio` | String | maxlength: 280, default: `""` |
| `avatarUrl` | String | default: `/images/default.svg` |
| `role` | String | enum: `FOUNDER`, `JOINER`, `BOTH`; default: null |
| `skills` | String[] | array of trimmed strings, default: `[]` |
| `interests` | String[] | array of trimmed strings, default: `[]` |
| `lookingFor` | String[] | array of trimmed strings, default: `[]` |
| `pastWork` | pastWorkSchema[] | embedded sub-documents (see below) |
| `linkedStartups` | linkedStartupSchema[] | embedded sub-documents (see below) |
| `availabilityStatus` | String | enum: `Open to join`, `Looking for co-founder`, `Just exploring`; default: `Just exploring` |
| `weeklyHoursAvailable` | Number | min: 0, max: 168, default: 0 |
| `isBuilder` | Boolean | default: false; set by pre-save hook |
| `builderBadgeAwardedAt` | Date | default: null; set by pre-save hook |
| `profileCompletionPercentage` | Number | min: 0, max: 100; computed by pre-save hook |
| `socialLinks` | Object | embedded: `{ linkedin, github, twitter, portfolio }` (all String, default: `""`) |
| `privacy` | Object | embedded: `{ hideYear, hideBranch, allowIntroRequests }` (all Boolean) |
| `reputationCount` | Number | default: 0 |
| `weeklyStreak` | Number | default: 0 |
| `founderDetails` | Object | embedded: `{ startupName: String, stage: String }` |
| `joinerDetails` | Object | embedded: `{ skills: String[], graduationYear: Number }` |
| `isOnboarded` | Boolean | default: false |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Embedded Sub-document: `pastWorkSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `title` | String | required, trim |
| `url` | String | required, trim |
| `linkType` | String | enum: `GitHub`, `Behance`, `Portfolio`, `Figma`, `Live Demo`, `Other`; default: `Portfolio` |
| `description` | String | trim, maxlength: 280, default: `""` |
| `createdAt`, `updatedAt` | Date | timestamps: true |

**Embedded Sub-document: `linkedStartupSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `name` | String | trim, default: `""` |
| `stage` | String | trim, default: `""` |
| `role` | String | trim, default: `"Founder"` |
| `startupId` | ObjectId | ref: `Startup`, default: null |
| `createdAt`, `updatedAt` | Date | timestamps: true |

**Indexes:**
- Unique index on `userId`

**Lifecycle Hooks:**
- Async `pre("save")` hook: invokes `calculateProfileCompletion(this)`, sets `profileCompletionPercentage`, and conditionally awards or revokes the `isBuilder` badge and records `builderBadgeAwardedAt`.

---

### 2.4 Startup (`src/modules/startups/models/startup.model.js`)

Collection name: `startups`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `name` | String | required, trim |
| `ownerId` | ObjectId | ref: `Auth`; required, indexed |
| `pitch` | String | required, trim, maxlength: 200 |
| `problem` | String | trim, default: `""` |
| `solution` | String | trim, default: `""` |
| `industryTags` | String[] | array of trimmed strings, default: `[]` |
| `stage` | String | enum: `Idea`, `Building MVP`, `Launched`, `Has users`; default: `Idea` |
| `visibility` | String | enum: `PUBLIC`, `STEALTH`; default: `PUBLIC` |
| `links` | Object | embedded: `{ website, demo, github, pitchDeck }` (all String) |
| `teamMembers` | teamMemberSchema[] | embedded sub-documents (see below) |
| `invitations` | startupInvitationSchema[] | embedded sub-documents (see below) |
| `openRoles` | openRoleSchema[] | embedded sub-documents (see below) |
| `milestones` | startupMilestoneSchema[] | embedded sub-documents (see below) |
| `isArchived` | Boolean | default: false |
| `archivedAt` | Date | default: null |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Embedded Sub-document: `teamMemberSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `userId` | ObjectId | ref: `Auth`; required |
| `role` | String | trim, default: `"Team Member"` |
| `joinedDate` | Date | default: `Date.now` |

**Embedded Sub-document: `startupInvitationSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `email` | String | required, trim, lowercase |
| `role` | String | trim, default: `"Team Member"` |
| `status` | String | enum: `PENDING`, `ACCEPTED`, `DECLINED`; default: `PENDING` |
| `invitedAt` | Date | default: `Date.now` |

**Embedded Sub-document: `openRoleSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `title` | String | required, trim |
| `skillsNeeded` | String[] | default: `[]` |
| `commitmentHours` | Number | min: 0, max: 168, default: 0 |
| `roleType` | String | enum: `co-founder`, `teammate`, `short-term collaboration`; default: `teammate` |
| `equityOrCreditNote` | String | trim, default: `""` |
| `status` | String | enum: `OPEN`, `FILLED`, `CLOSED`; default: `OPEN` |
| `createdAt` | Date | default: `Date.now` |

**Embedded Sub-document: `startupMilestoneSchema`**

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | auto-generated |
| `title` | String | required, trim |
| `milestoneType` | String | enum: `Idea validated`, `Prototype ready`, `First users`, `Launched`, `Won event`, `Custom update`; default: `Custom update` |
| `description` | String | trim, default: `""` |
| `completedDate` | Date | default: `Date.now` |
| `createdAt`, `updatedAt` | Date | timestamps: true |

**Indexes:**
- Standard index on `ownerId`
- Compound text index on `{ name: "text", pitch: "text", industryTags: "text" }` (note: currently unused in service queries; discovery service uses regex instead)

---

### 2.5 Follow (`src/modules/discovery/models/follow.model.js`)

Collection name: `follows`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `followerId` | ObjectId | ref: `Auth`; required, indexed |
| `targetType` | String | required; enum: `USER`, `STARTUP` |
| `targetId` | ObjectId | required, indexed — polymorphic; references either `Auth._id` or `Startup._id` depending on `targetType` |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Indexes:**
- Standard index on `followerId`
- Standard index on `targetId`
- Compound unique index on `{ followerId: 1, targetType: 1, targetId: 1 }` — enforces one follow record per (follower, target) pair

---

### 2.6 Shortlist (`src/modules/discovery/models/shortlist.model.js`)

Collection name: `shortlists`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId | ref: `Auth`; required, indexed |
| `itemType` | String | required; enum: `USER`, `STARTUP` |
| `itemId` | ObjectId | required, indexed — polymorphic; references either `Auth._id` or `Startup._id` |
| `note` | String | maxlength: 300, default: `""` |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Indexes:**
- Standard index on `userId`
- Standard index on `itemId`
- Compound unique index on `{ userId: 1, itemType: 1, itemId: 1 }` — enforces one shortlist entry per (user, item) pair

---

### 2.7 Post (`src/modules/posts/models/post.model.js`)

Collection name: `posts`

| Field | Type | Constraints / Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `title` | String | required |
| `postType` | String | required; enum: `Update`, `Milestone`, `Looking For`; default: `Update` |
| `body` | String | required |
| `CoverImageUrl` | String | optional |
| `profileImageUrl` | String | required |
| `StartupName` | String | required — denormalized startup name string, no ObjectId ref |
| `time` | Date | required, default: `Date.now` |
| `likesCount` | Number | required, default: 0 |
| `commentsCount` | Number | required, default: 0 |
| `createdAt` | Date | Mongoose timestamps |
| `updatedAt` | Date | Mongoose timestamps |

**Indexes:** None beyond the default `_id` index.

**Notable design issue:** The Post model carries no `authorId` or `startupId` reference — it embeds `StartupName` as a plain string. This means post authorship cannot be enforced or queried relationally with the current schema.

---

## 3. Model Relationships

```
Auth (1) ──────────── (1) Profile
Auth (1) ──────────── (N) Startup          [via Startup.ownerId]
Auth (1) ──────────── (N) Follow           [via Follow.followerId]
Auth (1) ──────────── (N) Shortlist        [via Shortlist.userId]
Auth (N) ──────────── (N) Startup          [via Startup.teamMembers[].userId — embedded array]
Startup (1) ────────── (N) Profile.linkedStartups  [embedded reference via linkedStartupSchema.startupId]
Follow.targetId ─────── polymorphic → Auth._id  (when targetType = "USER")
Follow.targetId ─────── polymorphic → Startup._id (when targetType = "STARTUP")
Shortlist.itemId ───── polymorphic → Auth._id  (when itemType = "USER")
Shortlist.itemId ───── polymorphic → Startup._id (when itemType = "STARTUP")
Post ────────────────── (no relational link to Auth or Startup)
```

**Relationship Summary Table**

| Parent | Child / Related | Cardinality | Mechanism |
|---|---|---|---|
| Auth | Profile | 1:1 | `Profile.userId` ObjectId ref |
| Auth | Startup (owned) | 1:N | `Startup.ownerId` ObjectId ref |
| Auth | Startup (member) | N:N | `Startup.teamMembers[].userId` embedded array |
| Auth | Follow | 1:N | `Follow.followerId` ObjectId ref |
| Auth | Shortlist | 1:N | `Shortlist.userId` ObjectId ref |
| Startup | Profile (linked) | N:N | `Profile.linkedStartups[].startupId` embedded reference (denormalized) |
| Follow | Auth or Startup | N:1 (polymorphic) | `Follow.targetId` + `Follow.targetType` |
| Shortlist | Auth or Startup | N:1 (polymorphic) | `Shortlist.itemId` + `Shortlist.itemType` |

---

## 4. Files That Directly Query Mongoose

The following files import and call Mongoose model methods directly. There is no repository or data-access layer abstracting these calls.

| File | Models Used | Query Methods |
|---|---|---|
| `src/modules/auth/auth.service.js` | Auth, EmailOTP, Profile | `.findOne()`, `.create()`, `.findOneAndUpdate()`, `.deleteMany()`, `.deleteOne()`, `.updateOne()`, `.save()` |
| `src/modules/onboarding/onboarding.service.js` | Profile | `.findOne()`, `.findOneAndUpdate()`, `.save()` |
| `src/modules/profiles/profile.service.js` | Profile | `.findOne()`, `.findById()`, `.create()`, `.save()` |
| `src/modules/startups/startup.service.js` | Startup, Profile, Auth | `.findById()`, `.find()`, `.create()`, `.findOneAndUpdate()`, `.save()` |
| `src/modules/discovery/discovery.service.js` | Profile, Startup, Follow, Shortlist | `.find()`, `.findOne()`, `.create()`, `.deleteOne()`, `.countDocuments()`, `.populate()`, `.toObject()` |
| `src/modules/posts/post.service.js` | Post | `.create()`, `.find()` |
| `src/middleware/auth.middleware.js` | Profile | `.findOne()` |
| `src/infrastructure/database/seed.js` | (various; seed script) | `.create()`, `.findOne()`, etc. |

Additionally, `src/modules/onboarding/onboarding.controller.js` and `src/modules/startups/startup.controller.js` have isolated direct model calls outside their service files.

---

## 5. MongoDB-Specific Features in Use

### 5.1 `.populate()`

Used in five locations to resolve ObjectId references into embedded documents at query time. This is the Mongoose equivalent of a SQL JOIN, but executed as a second round-trip query internally.

| File | Call | Resolves |
|---|---|---|
| `discovery.service.js` | `Profile.find(...).populate("userId", "email role")` | Auth fields on Profile |
| `discovery.service.js` | `Startup.find(...).populate("ownerId", "email")` | Auth fields on Startup |
| `profile.service.js` | `Profile.findOne(...).populate("userId", "email role")` | Auth fields on Profile |
| `startup.service.js` | `Startup.findById(...).populate("ownerId", "email").populate("teamMembers.userId", "email")` | Auth fields on Startup and nested teamMembers |
| `startup.service.js` | `Startup.find(query).populate("ownerId", "email")` | Auth fields on Startup list |

### 5.2 `.lean()`

Not currently in use. All service query results are returned as full Mongoose documents (allowing `.save()` calls). The `.toObject()` method is called explicitly in several services before returning data to controllers.

### 5.3 `.save()`

Used as the primary write-back mechanism after mutating a Mongoose document instance. This triggers lifecycle hooks (notably `profileSchema.pre("save")`).

| File | Context |
|---|---|
| `auth.service.js` | Updating `googleId`, `isEmailVerified`, `profileImageUrl` on existing Auth; updating `fullName`, `avatarUrl` on existing Profile |
| `onboarding.service.js` | Persisting all onboarding field changes on Profile |
| `profile.service.js` | All profile mutations: field updates, `pastWork` push, avatar change, privacy updates |
| `startup.service.js` | All startup mutations: field edits, team member add/remove, role add/remove, milestone add, ownership transfer, archival |

### 5.4 `.findById()`

Used in `profile.service.js` and extensively in `startup.service.js` for single-document retrieval by ObjectId.

### 5.5 TTL Index

Defined on `EmailOTP.expiresAt` with `{ expireAfterSeconds: 0 }`. MongoDB's background TTL thread deletes documents automatically once `expiresAt` has passed. This eliminates the need for a scheduled cleanup job.

### 5.6 Text Index

Defined on `Startup` for fields `{ name: "text", pitch: "text", industryTags: "text" }`. However, the discovery service does not invoke `$text` search against this index. Instead, it constructs regex-based `$or` queries across those fields. The text index is therefore present but idle.

### 5.7 Embedded Documents

Four models use embedded sub-document arrays rather than separate collections:

| Parent Model | Embedded Array | Schema |
|---|---|---|
| Profile | `pastWork` | `pastWorkSchema` |
| Profile | `linkedStartups` | `linkedStartupSchema` |
| Startup | `teamMembers` | `teamMemberSchema` |
| Startup | `invitations` | `startupInvitationSchema` |
| Startup | `openRoles` | `openRoleSchema` |
| Startup | `milestones` | `startupMilestoneSchema` |

Additionally, `Auth.socialLinks`, `Profile.socialLinks`, `Profile.privacy`, `Profile.founderDetails`, `Profile.joinerDetails`, and `Startup.links` are embedded plain objects (not sub-document arrays).

### 5.8 ObjectId References

All cross-document references use `Schema.Types.ObjectId` with a `ref` string pointing to a registered Mongoose model name. No foreign-key constraints exist at the database level; referential integrity is enforced only in application code.

### 5.9 Sparse Indexes

`Auth.googleId` carries a sparse index, which indexes only documents where `googleId` is not null. This correctly handles the case where many users authenticate by email OTP and have a null `googleId`.

### 5.10 Compound Indexes

| Model | Index Fields | Purpose |
|---|---|---|
| Follow | `{ followerId: 1, targetType: 1, targetId: 1 }` | Unique; prevents duplicate follow records |
| Shortlist | `{ userId: 1, itemType: 1, itemId: 1 }` | Unique; prevents duplicate shortlist entries |

### 5.11 Mongoose Pre-Save Hook

`profileSchema.pre("save", async function () { ... })` runs before every `Profile` document save. It recalculates `profileCompletionPercentage` and conditionally sets `isBuilder` and `builderBadgeAwardedAt` via an external helper. This business logic is coupled to the persistence event and will need to be extracted into application-layer logic during migration.

---

## 6. Migration Challenges

### 6.1 ObjectId vs. UUID / Serial Primary Key

All primary keys are MongoDB BSON ObjectIds (12-byte binary, displayed as 24-character hex strings). PostgreSQL tables will use either UUIDs (`uuid` type) or auto-incrementing integers (`bigserial`). Every application file that reads `_id`, calls `.toString()` on ObjectIds, or passes raw ObjectId values as JWT claims (`userId: user._id`) must be updated. The JWT payload currently embeds a Mongoose ObjectId; changing to UUID requires regenerating or invalidating all existing sessions.

### 6.2 Embedded Arrays vs. Join Tables

MongoDB's embedded sub-document arrays (`teamMembers`, `invitations`, `openRoles`, `milestones`, `pastWork`, `linkedStartups`) must each become separate PostgreSQL tables with foreign keys. Each embedded `_id` within a sub-document will need its own primary key column. Queries that currently filter or push into embedded arrays using `$elemMatch`, `$push`, `$pull`, and in-place JavaScript array mutations will all require rewriting as `INSERT`, `UPDATE`, or `DELETE` statements against the new child tables.

### 6.3 TTL Indexes

The `EmailOTP` TTL mechanism must be replaced. PostgreSQL has no native TTL index. The equivalent is a scheduled background job (e.g., a cron or pg_cron extension) that runs `DELETE FROM email_otps WHERE expires_at < NOW()`. Alternatively, deletion can be handled inline on each OTP read request.

### 6.4 Regex / Text Search

The discovery service uses MongoDB regex (`$regex`) for case-insensitive multi-field keyword search across `Profile` and `Startup`. PostgreSQL equivalents are `ILIKE` for simple patterns or `pg_trgm` GIN indexes for full text-style similarity search. The existing text index on `Startup` is not in use and can be dropped without impact. For structured `$text` search, PostgreSQL `tsvector` / `tsquery` with `GIN` indexes is the idiomatic replacement.

### 6.5 `.populate()` vs. SQL JOIN

Every `.populate()` call translates to a SQL `JOIN`. The current code runs `.populate("teamMembers.userId", "email")` to resolve an array of embedded ObjectIds. In PostgreSQL, this becomes a `JOIN` from `startup_team_members` to `users`. All service-layer population logic must be replaced with explicit JOIN queries or separate lookup queries in the repository layer.

### 6.6 Mongoose Pre-Save Hook

The `Profile` pre-save hook (`profileSchema.pre("save")`) calculates `profileCompletionPercentage`, `isBuilder`, and `builderBadgeAwardedAt` automatically on every save. In PostgreSQL this logic must move explicitly into the application layer (called from every code path that updates a profile) or into a PostgreSQL trigger. The hook is currently the only place that awards the builder badge, so missing a call path would silently break that feature.

### 6.7 Compound Unique Indexes

The compound unique indexes on `Follow` and `Shortlist` enforce toggle semantics at the database level. These translate directly to PostgreSQL `UNIQUE (follower_id, target_type, target_id)` constraints. Because `target_type` is a discriminator column for a polymorphic reference, care is needed: a PostgreSQL check constraint or separate join tables (one for user-follows and one for startup-follows) may be cleaner than a single polymorphic table.

### 6.8 Polymorphic References

Both `Follow.targetId` / `Follow.targetType` and `Shortlist.itemId` / `Shortlist.itemType` implement a polymorphic pattern. MongoDB supports this natively via untyped ObjectId fields. PostgreSQL has no polymorphic foreign key; the standard migration options are: (a) a nullable FK to each target table with a check constraint, (b) separate join tables per target type, or (c) a UUID-based approach with a shared entity table. Option (b) is the cleanest for referential integrity.

### 6.9 Sparse Indexes

`Auth.googleId` uses a sparse index to allow multiple null values in a unique-like fashion. In PostgreSQL, a `UNIQUE` index on a nullable column already allows multiple `NULL` values by default (each NULL is considered distinct), so the semantics are preserved automatically without special handling.

### 6.10 Denormalized Data

`Profile.linkedStartups` duplicates startup name, stage, and role information that is authoritative in `Startup`. Mutations to `Startup` currently sync this data back to `Profile` via `findOneAndUpdate` calls in `startup.service.js`. In PostgreSQL the linked startups relationship should be a normalized join table, eliminating the synchronization requirement.

The `Post` model denormalizes `StartupName` as a plain string with no foreign key. During migration, a decision is required: either add a `startup_id` FK column and populate it, or accept continued denormalization with an application-enforced consistency guarantee.

---

*End of audit.*
