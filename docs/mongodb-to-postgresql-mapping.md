# MongoDB to PostgreSQL Mapping Specification

**Project:** Begin — Campus Startup Discovery Platform  
**Target Database:** PostgreSQL 16+  
**Scope:** Structural schema mapping, table normalization, constraints, and operational data strategies  
**Date:** 2026-11-24  

---

## 1. Overview and Architectural Principles

This document defines the comprehensive mapping from Begin's existing MongoDB document store to a fully normalized PostgreSQL relational schema. 

The following architectural principles govern this relational design:
- **Identifier Strategy:** All entities replace 24-character hexadecimal MongoDB `ObjectId` strings with standard RFC 4122 UUID v4 identifiers, generated via `gen_random_uuid()`.
- **Temporal Consistency:** All timestamps use PostgreSQL `TIMESTAMPTZ` (timestamp with time zone) in UTC format.
- **Normalization vs. Inlining:** Scalar embedded objects with a strict 1:1 cardinality (e.g., social links, privacy settings) are flattened into the parent table to avoid unnecessary JOIN latency. Multi-valued arrays and 1:N embedded collections (e.g., tags, subdocuments with their own identifiers) are decomposed into normalized join and child tables.
- **Referential Integrity:** All foreign key references enforce cascading deletion or nullification rules to prevent orphan records.

---

## 2. Model-by-Model Schema Mapping

### 2.1 Auth (`src/modules/auth/models/auth.model.js`)

**Target Table:** `auth_users`

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `email` | String | `email` | VARCHAR(255) | NOT NULL, UNIQUE, lowercase index |
| `googleId` | String | `google_id` | VARCHAR(255) | NULL, UNIQUE (partial index where NOT NULL) |
| `isEmailVerified` | Boolean | `is_email_verified` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `emailVerifiedAt` | Date | `email_verified_at` | TIMESTAMPTZ | NULL |
| `profileImageUrl` | String | `profile_image_url` | TEXT | NOT NULL, DEFAULT '/images/default.svg' |
| `role` | String (enum) | `role` | VARCHAR(20) | NOT NULL, DEFAULT 'USER', CHECK (`role` IN ('USER', 'ADMIN')) |
| `isActive` | Boolean | `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

### 2.2 EmailOTP (`src/modules/auth/models/otp.model.js`)

**Target Table:** `email_otps`

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `email` | String | `email` | VARCHAR(255) | NOT NULL, B-tree index |
| `otpHash` | String | `otp_hash` | VARCHAR(255) | NOT NULL, bcrypt hash |
| `purpose` | String (enum) | `purpose` | VARCHAR(20) | NOT NULL, CHECK (`purpose` IN ('SIGNUP', 'LOGIN')) |
| `expiresAt` | Date | `expires_at` | TIMESTAMPTZ | NOT NULL, index for expiration cleanup |
| `attempts` | Number | `attempts` | INTEGER | NOT NULL, DEFAULT 0 |
| `isUsed` | Boolean | `is_used` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `verifiedAt` | Date | `verified_at` | TIMESTAMPTZ | NULL |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

### 2.3 Profile (`src/modules/profiles/models/profile.model.js`)

**Target Table:** `profiles`  
*Note: Associated sub-arrays (`pastWork`, `linkedStartups`, `skills`, `interests`, `lookingFor`, `joinerDetails.skills`) map to normalized child tables detailed below.*

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `userId` | ObjectId (ref Auth) | `user_id` | UUID | NOT NULL, UNIQUE, FK -> `auth_users(id)` ON DELETE CASCADE |
| `fullName` | String | `full_name` | VARCHAR(255) | NOT NULL, DEFAULT '' |
| `college` | String | `college` | VARCHAR(255) | NOT NULL, DEFAULT '' |
| `year` | String | `year` | VARCHAR(50) | NOT NULL, DEFAULT '' |
| `branch` | String | `branch` | VARCHAR(255) | NOT NULL, DEFAULT '' |
| `bio` | String (max 280) | `bio` | VARCHAR(280) | NOT NULL, DEFAULT '' |
| `avatarUrl` | String | `avatar_url` | TEXT | NOT NULL, DEFAULT '/images/default.svg' |
| `role` | String (enum) | `role` | VARCHAR(20) | NULL, CHECK (`role` IN ('FOUNDER', 'JOINER', 'BOTH')) |
| `availabilityStatus` | String (enum) | `availability_status` | VARCHAR(50) | NOT NULL, DEFAULT 'Just exploring', CHECK constraint |
| `weeklyHoursAvailable`| Number | `weekly_hours_available` | INTEGER | NOT NULL, DEFAULT 0, CHECK (0 <= val <= 168) |
| `isBuilder` | Boolean | `is_builder` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `builderBadgeAwardedAt`| Date | `builder_badge_awarded_at` | TIMESTAMPTZ | NULL |
| `profileCompletionPercentage`| Number | `profile_completion_percentage` | INTEGER | NOT NULL, DEFAULT 0, CHECK (0 <= val <= 100) |
| `socialLinks.linkedin`| String | `social_linkedin` | TEXT | NOT NULL, DEFAULT '' |
| `socialLinks.github` | String | `social_github` | TEXT | NOT NULL, DEFAULT '' |
| `socialLinks.twitter` | String | `social_twitter` | TEXT | NOT NULL, DEFAULT '' |
| `socialLinks.portfolio`| String | `social_portfolio` | TEXT | NOT NULL, DEFAULT '' |
| `privacy.hideYear` | Boolean | `privacy_hide_year` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `privacy.hideBranch` | Boolean | `privacy_hide_branch` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `privacy.allowIntroRequests` | Boolean | `privacy_allow_intro_requests` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `reputationCount` | Number | `reputation_count` | INTEGER | NOT NULL, DEFAULT 0 |
| `weeklyStreak` | Number | `weekly_streak` | INTEGER | NOT NULL, DEFAULT 0 |
| `founderDetails.startupName` | String | `founder_startup_name` | VARCHAR(255) | NOT NULL, DEFAULT '' |
| `founderDetails.stage` | String | `founder_stage` | VARCHAR(100) | NOT NULL, DEFAULT '' |
| `joinerDetails.graduationYear`| Number | `joiner_graduation_year` | INTEGER | NULL |
| `isOnboarded` | Boolean | `is_onboarded` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

### 2.4 Startup (`src/modules/startups/models/startup.model.js`)

**Target Table:** `startups`  
*Note: Associated sub-arrays (`teamMembers`, `invitations`, `openRoles`, `milestones`, `industryTags`) map to normalized child tables.*

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `name` | String | `name` | VARCHAR(255) | NOT NULL |
| `ownerId` | ObjectId (ref Auth) | `owner_id` | UUID | NOT NULL, FK -> `auth_users(id)` ON DELETE CASCADE |
| `pitch` | String (max 200) | `pitch` | VARCHAR(200) | NOT NULL |
| `problem` | String | `problem` | TEXT | NOT NULL, DEFAULT '' |
| `solution` | String | `solution` | TEXT | NOT NULL, DEFAULT '' |
| `stage` | String (enum) | `stage` | VARCHAR(50) | NOT NULL, DEFAULT 'Idea', CHECK constraint |
| `visibility` | String (enum) | `visibility` | VARCHAR(20) | NOT NULL, DEFAULT 'PUBLIC', CHECK (`visibility` IN ('PUBLIC', 'STEALTH')) |
| `links.website` | String | `link_website` | TEXT | NOT NULL, DEFAULT '' |
| `links.demo` | String | `link_demo` | TEXT | NOT NULL, DEFAULT '' |
| `links.github` | String | `link_github` | TEXT | NOT NULL, DEFAULT '' |
| `links.pitchDeck` | String | `link_pitch_deck` | TEXT | NOT NULL, DEFAULT '' |
| `isArchived` | Boolean | `is_archived` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `archivedAt` | Date | `archived_at` | TIMESTAMPTZ | NULL |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

### 2.5 Follow (`src/modules/discovery/models/follow.model.js`)

**Target Table:** `follows`

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `followerId` | ObjectId (ref Auth) | `follower_id` | UUID | NOT NULL, FK -> `auth_users(id)` ON DELETE CASCADE |
| `targetType` | String (enum) | `target_type` | VARCHAR(20) | NOT NULL, CHECK (`target_type` IN ('USER', 'STARTUP')) |
| `targetId` | ObjectId | `target_id` | UUID | NOT NULL, polymorphic reference |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**Unique Constraint:** `(follower_id, target_type, target_id)`

---

### 2.6 Shortlist (`src/modules/discovery/models/shortlist.model.js`)

**Target Table:** `shortlists`

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `userId` | ObjectId (ref Auth) | `user_id` | UUID | NOT NULL, FK -> `auth_users(id)` ON DELETE CASCADE |
| `itemType` | String (enum) | `item_type` | VARCHAR(20) | NOT NULL, CHECK (`item_type` IN ('USER', 'STARTUP')) |
| `itemId` | ObjectId | `item_id` | UUID | NOT NULL, polymorphic reference |
| `note` | String (max 300) | `note` | VARCHAR(300) | NOT NULL, DEFAULT '' |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**Unique Constraint:** `(user_id, item_type, item_id)`

---

### 2.7 Post (`src/modules/posts/models/post.model.js`)

**Target Table:** `posts`

| Existing MongoDB Field | Mongoose Type | Future PostgreSQL Column | PG Type | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | `id` | UUID | Primary Key, `DEFAULT gen_random_uuid()` |
| `title` | String | `title` | VARCHAR(255) | NOT NULL |
| `postType` | String (enum) | `post_type` | VARCHAR(50) | NOT NULL, DEFAULT 'Update', CHECK constraint |
| `body` | String | `body` | TEXT | NOT NULL |
| `CoverImageUrl` | String | `cover_image_url` | TEXT | NULL |
| `profileImageUrl` | String | `profile_image_url` | TEXT | NOT NULL |
| `StartupName` | String | `startup_name` | VARCHAR(255) | NOT NULL (denormalized startup name) |
| `time` | Date | `time` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `likesCount` | Number | `likes_count` | INTEGER | NOT NULL, DEFAULT 0 |
| `commentsCount` | Number | `comments_count` | INTEGER | NOT NULL, DEFAULT 0 |
| `createdAt` | Date | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updatedAt` | Date | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

## 3. Relational Schema Specification

### 3.1 Complete List of Required Tables

The migration flattens nested schemas and replaces embedded arrays with 18 distinct relational tables:

1. `auth_users`: Core authentication identity records.
2. `email_otps`: One-time password verification tokens.
3. `profiles`: User builder/founder profiles.
4. `profile_past_works`: Portfolio projects and past work history.
5. `profile_linked_startups`: External or referenced startup associations.
6. `profile_skills`: Profile skill tags.
7. `profile_interests`: Profile interest tags.
8. `profile_looking_for`: Profile collaboration objective tags.
9. `profile_joiner_skills`: Specialized skill tags specific to joiner details.
10. `startups`: Core startup venture entities.
11. `startup_team_members`: Affiliated startup team members.
12. `startup_invitations`: Team member invitations and invitation statuses.
13. `startup_open_roles`: Open positions published by startups.
14. `startup_open_role_skills`: Required skill tags per open role.
15. `startup_milestones`: Startup journey timeline milestones.
16. `startup_industry_tags`: Industry classification tags per startup.
17. `follows`: Social follow relationships across users and startups.
18. `shortlists`: Bookmarks and private notes across users and startups.
19. `posts`: Feed updates and announcement posts.

---

### 3.2 SQL DDL Definitions

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Auth Users
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    profile_image_url TEXT NOT NULL DEFAULT '/images/default.svg',
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_auth_users_email ON auth_users (LOWER(email));
CREATE UNIQUE INDEX idx_auth_users_google_id ON auth_users (google_id) WHERE google_id IS NOT NULL;

-- 2. Email OTPs
CREATE TABLE email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('SIGNUP', 'LOGIN')),
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_otps_email_purpose ON email_otps (LOWER(email), purpose);
CREATE INDEX idx_email_otps_expires_at ON email_otps (expires_at);

-- 3. Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    college VARCHAR(255) NOT NULL DEFAULT '',
    year VARCHAR(50) NOT NULL DEFAULT '',
    branch VARCHAR(255) NOT NULL DEFAULT '',
    bio VARCHAR(280) NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '/images/default.svg',
    role VARCHAR(20) CHECK (role IN ('FOUNDER', 'JOINER', 'BOTH')),
    availability_status VARCHAR(50) NOT NULL DEFAULT 'Just exploring' 
        CHECK (availability_status IN ('Open to join', 'Looking for co-founder', 'Just exploring')),
    weekly_hours_available INTEGER NOT NULL DEFAULT 0 CHECK (weekly_hours_available BETWEEN 0 AND 168),
    is_builder BOOLEAN NOT NULL DEFAULT FALSE,
    builder_badge_awarded_at TIMESTAMPTZ,
    profile_completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_percentage BETWEEN 0 AND 100),
    social_linkedin TEXT NOT NULL DEFAULT '',
    social_github TEXT NOT NULL DEFAULT '',
    social_twitter TEXT NOT NULL DEFAULT '',
    social_portfolio TEXT NOT NULL DEFAULT '',
    privacy_hide_year BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_hide_branch BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_allow_intro_requests BOOLEAN NOT NULL DEFAULT TRUE,
    reputation_count INTEGER NOT NULL DEFAULT 0,
    weekly_streak INTEGER NOT NULL DEFAULT 0,
    founder_startup_name VARCHAR(255) NOT NULL DEFAULT '',
    founder_stage VARCHAR(100) NOT NULL DEFAULT '',
    joiner_graduation_year INTEGER,
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_user_id ON profiles (user_id);
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_availability_status ON profiles (availability_status);
CREATE INDEX idx_profiles_is_builder ON profiles (is_builder);

-- 4. Startups
CREATE TABLE startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    pitch VARCHAR(200) NOT NULL,
    problem TEXT NOT NULL DEFAULT '',
    solution TEXT NOT NULL DEFAULT '',
    stage VARCHAR(50) NOT NULL DEFAULT 'Idea' 
        CHECK (stage IN ('Idea', 'Building MVP', 'Launched', 'Has users')),
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' 
        CHECK (visibility IN ('PUBLIC', 'STEALTH')),
    link_website TEXT NOT NULL DEFAULT '',
    link_demo TEXT NOT NULL DEFAULT '',
    link_github TEXT NOT NULL DEFAULT '',
    link_pitch_deck TEXT NOT NULL DEFAULT '',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_startups_owner_id ON startups (owner_id);
CREATE INDEX idx_startups_stage ON startups (stage);
CREATE INDEX idx_startups_visibility ON startups (visibility);
CREATE INDEX idx_startups_is_archived ON startups (is_archived);

-- 5. Profile Child Tables (Normalized Arrays and Subdocuments)

CREATE TABLE profile_past_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    link_type VARCHAR(50) NOT NULL DEFAULT 'Portfolio'
        CHECK (link_type IN ('GitHub', 'Behance', 'Portfolio', 'Figma', 'Live Demo', 'Other')),
    description VARCHAR(280) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_profile_past_works_profile_id ON profile_past_works (profile_id);

CREATE TABLE profile_linked_startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    stage VARCHAR(100) NOT NULL DEFAULT '',
    role VARCHAR(100) NOT NULL DEFAULT 'Founder',
    startup_id UUID REFERENCES startups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_profile_linked_startups_profile_id ON profile_linked_startups (profile_id);
CREATE INDEX idx_profile_linked_startups_startup_id ON profile_linked_startups (startup_id);

CREATE TABLE profile_skills (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (profile_id, skill)
);
CREATE INDEX idx_profile_skills_skill ON profile_skills (skill);

CREATE TABLE profile_interests (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interest VARCHAR(100) NOT NULL,
    PRIMARY KEY (profile_id, interest)
);
CREATE INDEX idx_profile_interests_interest ON profile_interests (interest);

CREATE TABLE profile_looking_for (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    looking_for VARCHAR(100) NOT NULL,
    PRIMARY KEY (profile_id, looking_for)
);
CREATE INDEX idx_profile_looking_for_item ON profile_looking_for (looking_for);

CREATE TABLE profile_joiner_skills (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (profile_id, skill)
);
CREATE INDEX idx_profile_joiner_skills_skill ON profile_joiner_skills (skill);

-- 6. Startup Child Tables (Normalized Arrays and Subdocuments)

CREATE TABLE startup_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'Team Member',
    joined_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_startup_team_member UNIQUE (startup_id, user_id)
);
CREATE INDEX idx_startup_team_members_startup_id ON startup_team_members (startup_id);
CREATE INDEX idx_startup_team_members_user_id ON startup_team_members (user_id);

CREATE TABLE startup_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Team Member',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_startup_invitations_startup_id ON startup_invitations (startup_id);
CREATE INDEX idx_startup_invitations_email ON startup_invitations (LOWER(email));

CREATE TABLE startup_open_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    commitment_hours INTEGER NOT NULL DEFAULT 0 CHECK (commitment_hours BETWEEN 0 AND 168),
    role_type VARCHAR(50) NOT NULL DEFAULT 'teammate'
        CHECK (role_type IN ('co-founder', 'teammate', 'short-term collaboration')),
    equity_or_credit_note TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'FILLED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_startup_open_roles_startup_id ON startup_open_roles (startup_id);
CREATE INDEX idx_startup_open_roles_status ON startup_open_roles (status);

CREATE TABLE startup_open_role_skills (
    open_role_id UUID NOT NULL REFERENCES startup_open_roles(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (open_role_id, skill)
);
CREATE INDEX idx_startup_open_role_skills_skill ON startup_open_role_skills (skill);

CREATE TABLE startup_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    milestone_type VARCHAR(50) NOT NULL DEFAULT 'Custom update'
        CHECK (milestone_type IN (
            'Idea validated', 'Prototype ready', 'First users', 
            'Launched', 'Won event', 'Custom update'
        )),
    description TEXT NOT NULL DEFAULT '',
    completed_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_startup_milestones_startup_id ON startup_milestones (startup_id);

CREATE TABLE startup_industry_tags (
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    industry_tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (startup_id, industry_tag)
);
CREATE INDEX idx_startup_industry_tags_tag ON startup_industry_tags (industry_tag);

-- 7. Follows Table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('USER', 'STARTUP')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_follows_follower_target UNIQUE (follower_id, target_type, target_id)
);
CREATE INDEX idx_follows_follower_id ON follows (follower_id);
CREATE INDEX idx_follows_target ON follows (target_type, target_id);

-- 8. Shortlists Table
CREATE TABLE shortlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('USER', 'STARTUP')),
    item_id UUID NOT NULL,
    note VARCHAR(300) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shortlists_user_item UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX idx_shortlists_user_id ON shortlists (user_id);
CREATE INDEX idx_shortlists_item ON shortlists (item_type, item_id);

-- 9. Posts Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    post_type VARCHAR(50) NOT NULL DEFAULT 'Update'
        CHECK (post_type IN ('Update', 'Milestone', 'Looking For')),
    body TEXT NOT NULL,
    cover_image_url TEXT,
    profile_image_url TEXT NOT NULL,
    startup_name VARCHAR(255) NOT NULL,
    time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_posts_time ON posts (time DESC);
CREATE INDEX idx_posts_post_type ON posts (post_type);
```

---

## 4. Normalization of Arrays and Embedded Objects

### 4.1 Array Fields Becoming Dedicated Tables

In MongoDB, document models stored lists of subdocuments or strings directly inside parent records. In PostgreSQL, these become first-class relational tables linked via foreign keys:

1. **`pastWork` (Profile)** -> `profile_past_works`
   - Maps 1:N past portfolio submissions.
   - Primary key: UUID `id`. Foreign key: `profile_id`.
2. **`linkedStartups` (Profile)** -> `profile_linked_startups`
   - Maps external or internal venture associations.
   - Foreign key: `profile_id`. Optional foreign key: `startup_id` referencing `startups(id)`.
3. **`skills`, `interests`, `lookingFor` (Profile)** -> `profile_skills`, `profile_interests`, `profile_looking_for`
   - Normalized tag tables with composite primary key `(profile_id, <tag_column>)`.
   - Replaces unstructured string arrays with strict relational joins and indexed search capabilities.
4. **`joinerDetails.skills` (Profile)** -> `profile_joiner_skills`
   - Composite primary key `(profile_id, skill)`.
5. **`teamMembers` (Startup)** -> `startup_team_members`
   - Normalizes membership. Enforces a unique constraint on `(startup_id, user_id)` to prevent duplicate team assignments.
6. **`invitations` (Startup)** -> `startup_invitations`
   - Preserves invitation history, status transitions, and audit timestamps.
7. **`openRoles` (Startup)** -> `startup_open_roles`
   - Houses open positions and commitment expectations.
8. **`openRoles.skillsNeeded` (Startup)** -> `startup_open_role_skills`
   - Join table connecting role specifications to required skill tags.
9. **`milestones` (Startup)** -> `startup_milestones`
   - Tracks timeline accomplishments.
10. **`industryTags` (Startup)** -> `startup_industry_tags`
    - Composite primary key `(startup_id, industry_tag)` enabling exact tag filtering.

### 4.2 Embedded Objects Flattened into Columns

Scalar embedded subdocuments without distinct identity are flattened into their parent tables:

1. **`socialLinks` on Profile:**
   - Inlined as `social_linkedin`, `social_github`, `social_twitter`, and `social_portfolio`.
   - Avoids an additional JOIN when loading public profiles.
2. **`privacy` on Profile:**
   - Inlined as `privacy_hide_year`, `privacy_hide_branch`, and `privacy_allow_intro_requests`.
3. **`founderDetails` on Profile:**
   - Inlined as `founder_startup_name` and `founder_stage`.
4. **`joinerDetails` on Profile:**
   - Inlined scalar field `joiner_graduation_year`.
5. **`links` on Startup:**
   - Inlined as `link_website`, `link_demo`, `link_github`, and `link_pitch_deck`.

---

## 5. Enum Strategy

Two implementation strategies exist in PostgreSQL for enumerated values:

1. **Native PostgreSQL Enums (`CREATE TYPE enum_name AS ENUM (...)`):**
   - *Advantages:* Enforces strict type safety at the engine level; stored internally as a 4-byte integer, optimizing storage and indexing.
   - *Disadvantages:* Modifying enum values (especially removing or renaming) requires complex schema migrations (`ALTER TYPE ... ADD VALUE` cannot run inside transaction blocks prior to PG 12, and value deletion requires recreating the type).
2. **`VARCHAR(n)` with `CHECK` Constraints:**
   - *Advantages:* Highly flexible; modifying valid values requires a simple `ALTER TABLE ... DROP CONSTRAINT` and `ADD CONSTRAINT` within an atomic transaction. Fully supported across all migration tools and ORMs.
   - *Disadvantages:* Stored as character strings (slightly higher disk footprint, though negligible for standard datasets).

**Recommendation:**
Use **`VARCHAR` with `CHECK` constraints** for all enumerated values across Begin. This prevents migration lockouts when adding new onboarding roles, milestone types, or link types as the product evolves.

### Enumeration Specifications:

- `auth_role`: `CHECK (role IN ('USER', 'ADMIN'))`
- `otp_purpose`: `CHECK (purpose IN ('SIGNUP', 'LOGIN'))`
- `profile_role`: `CHECK (role IN ('FOUNDER', 'JOINER', 'BOTH'))`
- `availability_status`: `CHECK (availability_status IN ('Open to join', 'Looking for co-founder', 'Just exploring'))`
- `past_work_link_type`: `CHECK (link_type IN ('GitHub', 'Behance', 'Portfolio', 'Figma', 'Live Demo', 'Other'))`
- `startup_stage`: `CHECK (stage IN ('Idea', 'Building MVP', 'Launched', 'Has users'))`
- `startup_visibility`: `CHECK (visibility IN ('PUBLIC', 'STEALTH'))`
- `invitation_status`: `CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))`
- `open_role_type`: `CHECK (role_type IN ('co-founder', 'teammate', 'short-term collaboration'))`
- `open_role_status`: `CHECK (status IN ('OPEN', 'FILLED', 'CLOSED'))`
- `milestone_type`: `CHECK (milestone_type IN ('Idea validated', 'Prototype ready', 'First users', 'Launched', 'Won event', 'Custom update'))`
- `target_type` / `item_type`: `CHECK (target_type IN ('USER', 'STARTUP'))`
- `post_type`: `CHECK (post_type IN ('Update', 'Milestone', 'Looking For'))`

---

## 6. TTL Strategy for One-Time Passwords (OTPs)

MongoDB utilizes a background thread checking TTL indexes every 60 seconds to purge expired documents:
```javascript
emailOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

PostgreSQL does not possess built-in automated record eviction on index expiry. Three strategies address this:

### 6.1 Strategy A: PostgreSQL Extension (`pg_cron`)
A scheduled database extension executes directly inside the PostgreSQL cluster:
```sql
SELECT cron.schedule('cleanup-expired-otps', '*/5 * * * *', $$
    DELETE FROM email_otps 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
       OR (is_used = TRUE AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 day');
$$);
```
- *Pros:* Fully automated within the database infrastructure; runs independently of application server uptime.
- *Cons:* Requires root/superuser access to install `pg_cron` shared preload libraries on managed database providers (AWS RDS, Supabase, Neon support vary).

### 6.2 Strategy B: Application-Level Scheduled Job
A lightweight cron process running within the Node.js backend infrastructure (using `node-cron` or an existing scheduler):
```javascript
import cron from "node-cron";

export const initOtpCleanupJob = (otpRepository) => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      await otpRepository.deleteExpiredOTPs();
    } catch (err) {
      console.error("Failed to clean up expired OTP records:", err.message);
    }
  });
};
```
SQL query executed:
```sql
DELETE FROM email_otps 
WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours' 
   OR (is_used = TRUE AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour');
```
- *Pros:* Zero external database extension dependencies; portable across all cloud and local environments.
- *Cons:* Dependent on application process availability.

### 6.3 Strategy C: Query-Level Logical Expiration (Immediate)
The repository enforces logical expiration in all select and update queries:
```sql
SELECT * FROM email_otps 
WHERE email = $1 
  AND purpose = $2 
  AND is_used = FALSE 
  AND expires_at > CURRENT_TIMESTAMP;
```

**Recommended Production Strategy:**
Combine **Strategy C** for immediate application correctness with **Strategy B** (or Strategy A if hosted on supported infrastructure) running every 15 minutes to purge stale records and control storage growth.

---

## 7. Full-Text Search Strategy

The current Mongoose model defines a compound text index on Startup:
```javascript
startupSchema.index({ name: "text", pitch: "text", industryTags: "text" });
```

In PostgreSQL, search requirements can be satisfied through two primary mechanisms:

### 7.1 Option 1: Trigram Fuzzy Search (`pg_trgm`)
Trigram indexing breaks strings into three-character tuples:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_startups_name_trgm ON startups USING gin (name gin_trgm_ops);
CREATE INDEX idx_startups_pitch_trgm ON startups USING gin (pitch gin_trgm_ops);
```
- *Strengths:* Exceptional handling of partial matches, typos, autocomplete queries, and short campus project names (e.g., matching "dev" to "Developer").
- *Weaknesses:* Higher index build cost on large text fields.

### 7.2 Option 2: Full-Text Search (`tsvector` and `tsquery`)
Lexical linguistic search parsing words into stems and lexemes:
```sql
ALTER TABLE startups ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(pitch, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(problem, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(solution, '')), 'C')
) STORED;

CREATE INDEX idx_startups_search_vector ON startups USING gin (search_vector);
```
Query execution:
```sql
SELECT id, name, pitch, ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
FROM startups
WHERE search_vector @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC;
```
- *Strengths:* Native ranking (`ts_rank`), stop-word handling, stemming (e.g., "build" matches "building", "builder").
- *Weaknesses:* Does not handle partial prefixes or arbitrary character typos natively.

### 7.3 Recommended Unified Search Strategy
Implement a **hybrid approach**:
1. Add a generated `search_vector` column with a GIN index on `startups` for full-text multi-field search and ranking.
2. Add `pg_trgm` GIN indexes on `name` and `industry_tag` in `startup_industry_tags` to power real-time discovery autocomplete and typo-tolerant search bars.
