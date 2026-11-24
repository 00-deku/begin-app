# Future PostgreSQL Migration Plan

**Project:** Begin — Campus Startup Discovery Platform  
**Target Architecture:** PostgreSQL 16+ with Drizzle ORM  
**Scope:** Architecture evolution, migration execution, adapter switching, and risk management  
**Date:** 2026-11-24  

---

## 1. Current MongoDB and Repository Architecture

The Begin backend operates as a modular monolith organized under `src/modules/` (`auth`, `onboarding`, `profiles`, `startups`, `discovery`, `posts`, and `home`). Historically, service layers directly imported Mongoose models, coupling business rules to document database mechanics. 

To prepare for a clean relational migration, the application introduces an explicit repository pattern and clean infrastructural boundaries:

```
src/
├── infrastructure/
│   └── database/
│       ├── mongodb/
│       │   ├── connection.js       # Mongoose connection bootstrap and pooling
│       │   └── index.js            # MongoDB connect/disconnect exports
│       ├── connection.js           # Re-export compatibility proxy
│       └── index.js                # Database infrastructure entrypoint
├── shared/
│   └── database/
│       ├── repository.interface.js # Standard contract definitions (JSDoc)
│       └── database-errors.js      # Normalized database exception classes
└── modules/
    ├── auth/
    │   ├── auth.repository.js      # Concrete MongoDB Auth repository
    │   ├── otp.repository.js       # Concrete MongoDB EmailOTP repository
    │   └── auth.service.js         # Business logic decoupled from Mongoose
    ├── profiles/
    │   ├── profile.repository.js   # Concrete MongoDB Profile repository
    │   └── profile.service.js      # Decoupled profile management logic
    ├── startups/
    │   ├── startup.repository.js   # Concrete MongoDB Startup repository
    │   └── startup.service.js      # Decoupled startup management logic
    ├── discovery/
    │   ├── follow.repository.js    # Concrete MongoDB Follow repository
    │   ├── shortlist.repository.js # Concrete MongoDB Shortlist repository
    │   └── discovery.service.js    # Decoupled graph/discovery logic
    └── posts/
        ├── post.repository.js      # Concrete MongoDB Post repository
        └── post.service.js         # Decoupled community feed logic
```

### Architectural Boundaries
1. **Plain Object Boundary:** Repositories convert all database records into plain JavaScript objects via `.lean()` or `.toObject()` before returning them. Service layers never receive Mongoose document instances and cannot invoke Mongoose methods (`.save()`, `.populate()`, or query chaining).
2. **Error Normalization:** Repositories catch database-specific exceptions (such as MongoDB error code `11000` for duplicate key violations) and re-throw standardized domain errors defined in `src/shared/database/database-errors.js` (`RecordNotFoundError`, `DuplicateRecordError`, `DatabaseConstraintError`).
3. **Interface Contract:** All repositories conform to the async interface documented in `src/shared/database/repository.interface.js` (`findById`, `findOne`, `findMany`, `create`, `updateById`, `updateOne`, `deleteById`, `deleteOne`, `deleteMany`, `count`).

---

## 2. PostgreSQL and Drizzle Infrastructure Requirements

To transition to PostgreSQL using Drizzle ORM, a dedicated infrastructure package and schema definitions must be introduced.

### 2.1 Directory Structure to Build
```
src/infrastructure/database/postgresql/
├── connection.js           # node-postgres (pg) Pool and Drizzle initialization
├── index.js                # PostgreSQL connectDB and disconnectDB lifecycle
├── drizzle.config.js       # Drizzle Kit CLI configuration
├── migrations/             # Generated SQL migration files
└── schemas/
    ├── auth.schema.js      # auth_users and email_otps table definitions
    ├── profiles.schema.js  # profiles, past_works, and tag join tables
    ├── startups.schema.js  # startups, team_members, roles, milestones, tags
    ├── discovery.schema.js # follows and shortlists table definitions
    ├── posts.schema.js     # posts table definitions
    └── index.js            # Consolidated schema export for Drizzle client
```

### 2.2 Core Infrastructure Implementations

#### Database Client and Pool (`src/infrastructure/database/postgresql/connection.js`)
```javascript
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schemas/index.js";
import { config } from "../../../config/index.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.postgresUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
```

#### Lifecycle Manager (`src/infrastructure/database/postgresql/index.js`)
```javascript
import { pool } from "./connection.js";

export const connectDB = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("Connected to PostgreSQL database successfully.");
  } finally {
    client.release();
  }
};

export const disconnectDB = async () => {
  await pool.end();
  console.log("Disconnected from PostgreSQL database.");
};
```

---

## 3. Repository Implementations Required

Each module will house a PostgreSQL repository implementation conforming exactly to the contract established by its MongoDB counterpart.

| Module | MongoDB Repository | Target PostgreSQL Repository | Core Responsibilities |
|---|---|---|---|
| `auth` | `auth.repository.js` | `auth.pg.repository.js` | Manage `auth_users` queries, unique email enforcement, google_id lookups, timestamp updates. |
| `auth` | `otp.repository.js` | `otp.pg.repository.js` | Insert OTP hashes, check active expiration (`expires_at > NOW()`), increment attempt counts, mark used. |
| `profiles` | `profile.repository.js` | `profile.pg.repository.js` | Handle `profiles` and child tables (`profile_past_works`, `profile_skills`, etc.). Reassemble composite objects for service consumption. |
| `startups` | `startup.repository.js` | `startup.pg.repository.js` | Query `startups` with joins to `startup_team_members`, `startup_open_roles`, `startup_milestones`, `startup_industry_tags`. Full-text search queries. |
| `discovery`| `follow.repository.js` | `follow.pg.repository.js` | Upsert and delete `follows`, enforce compound uniqueness, execute polymorphic count aggregations. |
| `discovery`| `shortlist.repository.js` | `shortlist.pg.repository.js` | Manage private bookmark records in `shortlists`, note updates, user list aggregation. |
| `posts` | `post.repository.js` | `post.pg.repository.js` | Paginated feed retrieval, atomic increment operations on `likes_count` and `comments_count`. |

---

## 4. Data Migration Approach

Migrating production data from MongoDB to PostgreSQL requires a three-phase Extract, Transform, and Load (ETL) pipeline executed via an automated Node.js migration script.

### 4.1 Phase 1: Data Extraction
1. Take a read-only snapshot or execute against a replica secondary node.
2. Dump all collections (`auths`, `emailotps`, `profiles`, `startups`, `follows`, `shortlists`, `posts`) into newline-delimited JSON (NDJSON) files.

### 4.2 Phase 2: Transformation Pipeline
1. **Identifier Mapping (ObjectId -> UUID):**
   - For every document, map its 24-character hexadecimal MongoDB `_id` to an RFC 4122 UUID v4.
   - Maintain an in-memory and persisted lookup map (`idMap[mongoObjectId] = postgresUuid`).
   - Use deterministic conversion (UUID v5 with a Begin DNS namespace) or generate UUID v4 and store the translation table to guarantee idempotent re-runs.
2. **Normalizing Subdocuments and Arrays:**
   - **Profiles:**
     - Extract `skills`, `interests`, and `lookingFor` into separate arrays of `{ profile_id, tag }` records.
     - Extract `pastWork` items into `profile_past_works` rows, referencing the parent profile UUID.
     - Extract `linkedStartups` into `profile_linked_startups`, translating embedded `startupId` values using `idMap`.
     - Inline `socialLinks` and `privacy` object keys into parent profile columns.
   - **Startups:**
     - Extract `teamMembers` into `startup_team_members` rows, mapping `userId` to the corresponding `auth_users` UUID.
     - Extract `invitations`, `openRoles`, and `milestones` into their respective child tables.
     - Extract `openRoles.skillsNeeded` into `startup_open_role_skills` rows.
     - Extract `industryTags` into `startup_industry_tags` rows.
     - Inline `links` into parent startup columns.
3. **Polymorphic Reference Translation:**
   - For `follows` and `shortlists`: translate `followerId`/`userId` via `idMap`. Translate `targetId`/`itemId` to the respective target UUID depending on `targetType`/`itemType`.
4. **Timestamp Normalization:**
   - Convert all BSON Date objects to UTC ISO 8601 strings compatible with `TIMESTAMPTZ`.

### 4.3 Phase 3: Bulk Insertion (Load)
Execute bulk `INSERT` statements wrapped inside transactional blocks in strict dependency order:
```
1. auth_users
2. email_otps
3. profiles
4. startups
5. Child / Join tables:
   - profile_past_works, profile_linked_startups, profile_skills, profile_interests, profile_looking_for, profile_joiner_skills
   - startup_team_members, startup_invitations, startup_open_roles, startup_open_role_skills, startup_milestones, startup_industry_tags
6. follows
7. shortlists
8. posts
```

---

## 5. Validation and Verification Strategy

To verify data integrity before promoting PostgreSQL to primary production status:

### 5.1 Quantitative Row Reconciliation
Run automated reconciliation comparing collection counts against relational table row counts:
- `COUNT(auths)` == `COUNT(auth_users)`
- `COUNT(profiles)` == `COUNT(profiles)`
- `SUM(length(profiles.skills))` == `COUNT(profile_skills)`
- `SUM(length(profiles.pastWork))` == `COUNT(profile_past_works)`
- `COUNT(startups)` == `COUNT(startups)`
- `SUM(length(startups.teamMembers))` == `COUNT(startup_team_members)`
- `COUNT(follows)` == `COUNT(follows)`
- `COUNT(shortlists)` == `COUNT(shortlists)`
- `COUNT(posts)` == `COUNT(posts)`

### 5.2 Deterministic Cryptographic Checksumming
Sample 10% of records across every entity type. Compute SHA-256 checksums of core field values (emails, normalized full names, startup pitches, post bodies) from MongoDB and verify identical output from PostgreSQL.

### 5.3 Referential Integrity Invariant Tests
Execute relational queries confirming zero foreign key violations:
```sql
-- Ensure no orphan profiles
SELECT COUNT(*) FROM profiles p LEFT JOIN auth_users a ON p.user_id = a.id WHERE a.id IS NULL;

-- Ensure no orphan startup owners
SELECT COUNT(*) FROM startups s LEFT JOIN auth_users a ON s.owner_id = a.id WHERE a.id IS NULL;

-- Ensure no orphan team members
SELECT COUNT(*) FROM startup_team_members m LEFT JOIN auth_users a ON m.user_id = a.id WHERE a.id IS NULL;
```

---

## 6. Adapter Switching Mechanism

The application utilizes an environment-driven factory to switch database engines without modifying service-layer code.

### 6.1 Configuration
```env
# .env
DATABASE_ADAPTER=mongodb # or postgresql
DATABASE_URL=postgres://user:password@localhost:5432/begin_db
```

### 6.2 Factory Implementation (`src/infrastructure/database/index.js`)
```javascript
import { config } from "../../config/index.js";
import * as mongoInfra from "./mongodb/index.js";
import * as postgresInfra from "./postgresql/index.js";

const isPostgres = config.database.adapter === "postgresql";

export const connectDB = isPostgres ? postgresInfra.connectDB : mongoInfra.connectDB;
export const disconnectDB = isPostgres ? postgresInfra.disconnectDB : mongoInfra.disconnectDB;

/**
 * Repository Resolver Factory
 * Returns the active repository implementation for a given module.
 */
export const getRepository = async (moduleName, entityName) => {
  const adapter = isPostgres ? "pg" : "mongo";
  const repoModule = await import(`../../modules/${moduleName}/${entityName}.${adapter}.repository.js`);
  return repoModule.default;
};
```

Because services only call standard interface methods on plain objects, switching adapters requires solely toggling `DATABASE_ADAPTER=postgresql` and restarting the Node.js process.

---

## 7. Rollback Plan

In the event of unanticipated production incidents post-cutover, a clear rollback protocol ensures minimal downtime.

### 7.1 Pre-Cutover Safeguards
1. **Maintenance Window:** Announce a scheduled 30-minute read-only maintenance window.
2. **MongoDB Final Sync:** Capture final changes from MongoDB before cutting traffic.
3. **Keep MongoDB Cold Replica Live:** Keep the MongoDB cluster online in read-only mode for 72 hours post-cutover.

### 7.2 Rollback Trigger Conditions
Initiate an immediate rollback if any of the following occur within 24 hours of cutover:
- Error rates on core endpoints (`/api/auth/*`, `/api/profiles/*`, `/api/startups/*`) exceed 0.5%.
- Database latency (P95) exceeds 250ms under typical campus traffic.
- Data inconsistency or data corruption is detected in user profiles or startup ownership.

### 7.3 Rollback Execution Steps
1. Place application into maintenance mode.
2. Set `DATABASE_ADAPTER=mongodb` across production application environments.
3. If new writes occurred in PostgreSQL during the cutover window:
   - Run a reverse-delta synchronization script extracting records with `created_at > cutover_timestamp` from PostgreSQL and upserting into MongoDB.
4. Restart application processes and verify health checks.
5. Disable maintenance mode and resume standard routing.

---

## 8. Critical Risk Areas and Mitigation

### 8.1 ObjectId vs. UUID Consistency in API Contracts
- **Risk:** External client applications, frontend routes, session tokens, or cached URLs may contain 24-character hexadecimal MongoDB `ObjectId` strings. If the backend abruptly expects UUID strings, existing client requests will fail with 400 Bad Request errors.
- **Mitigation:**
  - Support dual lookups during a transitional phase: if a supplied ID matches a 24-character hex pattern, look up its corresponding UUID in the migration translation table.
  - Issue 301 redirects for public profile/startup URLs referencing legacy ObjectIds.

### 8.2 Mongoose Pre-Save Lifecycle Hooks
- **Risk:** `profile.model.js` incorporates a pre-save hook that automatically invokes `calculateProfileCompletion(this)` and sets `isBuilder` and `builderBadgeAwardedAt`. PostgreSQL lacks Mongoose hooks; if developers update profile rows directly via SQL without recalculating completion, completion scores and builder statuses will become stale.
- **Mitigation:**
  - Shift all completion score and builder badge calculation logic entirely into `profile.service.js` prior to calling `profileRepository.updateById()`.
  - Enforce unit and integration tests verifying that profile updates through the service layer always persist updated completion percentages.

### 8.3 Embedded Document Retrieval vs. Multi-Table Relational JOINs
- **Risk:** In MongoDB, fetching a startup document (`Startup.findById`) returns team members, open roles, and milestones in a single disk read. In PostgreSQL, assembling the same entity requires joining five tables. Unoptimized queries will cause N+1 query performance degradation.
- **Mitigation:**
  - Leverage Drizzle's relational query API (`db.query.startups.findFirst({ with: { teamMembers: true, openRoles: true, milestones: true } })`) which compiles into structured, optimized SQL with subquery lateral joins.
  - Maintain composite indexes on all child foreign key columns (`startup_id`, `profile_id`, `user_id`).

### 8.4 TTL Collection Deprecation
- **Risk:** MongoDB automatically purges expired OTP tokens via internal background workers. In PostgreSQL, records will accumulate indefinitely in `email_otps` unless actively purged, degrading index performance over time.
- **Mitigation:**
  - Enforce strict logical filtering on all authentication queries (`WHERE expires_at > CURRENT_TIMESTAMP AND is_used = FALSE`).
  - Deploy a lightweight periodic cleanup cron job in the application layer (or `pg_cron` on supported hosting) executing `DELETE FROM email_otps WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`.
