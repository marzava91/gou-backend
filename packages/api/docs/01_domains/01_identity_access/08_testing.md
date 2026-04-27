// packages\api\docs\01_domains\01_identity_access\08_testing.md

# Identity & Access — Testing Strategy

## Purpose

This document defines the testing strategy for the Identity & Access domain.

The goal is to validate the domain progressively across three levels:

1. domain correctness through unit tests;
2. real persistence through Prisma/PostgreSQL integration tests;
3. cross-module behavior through service-level integration tests.

---

## Testing Layers

### 1. Unit tests

Validate isolated domain behavior:

- domain rules;
- policies;
- validators;
- service logic with mocked dependencies;
- DTO/controller surface when applicable.

Location:

packages/api/src/modules/01-identity-and-access/**/__tests__/

Current status:

- Users: covered at policy/controller level;
- Auth: covered at controller/account-linking/service level;
- Memberships: covered at rules/service level;
- Roles: covered at rules/service level;
- Grants: covered at rules/service level;
- Invitations: covered at service level;
- Access Resolution: covered at mapper/rules/controller level.

---

### 2. Database integration tests

Validate real persistence against PostgreSQL/Supabase using Prisma Client.

These tests validate:

- Prisma schema compatibility;
- table creation and relationships;
- inserts and reads against the real database;
- basic multi-table consistency;
- cleanup strategy for integration data.

Location:

packages/api/src/integrations/__tests__/identity-access/

Naming convention:

*.integration.spec.ts

Execution convention:

pnpm jest <file-name>.integration.spec.ts --runInBand

Required test conventions:

- use `jest.setTimeout(30000)`;
- use `beforeAll` for connection and initial cleanup;
- use `afterAll` for cleanup and disconnection;
- avoid `beforeEach` while the cleaner is still broad and expensive;
- use test data prefixed with `integration-test-`;
- avoid destructive `deleteMany({})` without scoped filters.

---

## Current Database Integration Coverage

### Users

File:

users.integration.spec.ts

Validated:

- creates a `User` in the real database;
- reads the created user by id;
- validates persisted email.

Status: done.

---

### Auth

File:

auth.integration.spec.ts

Validated:

- creates canonical user;
- creates `AuthIdentity`;
- creates `AuthSession`;
- validates relationship between user, identity, and session;
- validates session provider and status.

Status: done.

---

### Invitations / Memberships

File:

invitations-memberships.integration.spec.ts

Validated:

- creates `Invitation`;
- creates `User`;
- creates `Membership`;
- links `Membership.invitationId` to the created invitation;
- validates persisted relationship between invitation, user, and membership.

Status: done.

---

## Phase 0 Closure

Phase 0 validated the real technical baseline.

Confirmed:

- Prisma is configured for PostgreSQL;
- Prisma can connect to the configured database;
- schema synchronization was successful;
- Prisma Studio can inspect the database;
- real insert/read flows work;
- initial database integration tests run successfully.

Evidence:

- `pnpm jest "src/integrations/__tests__/identity-access" --runInBand`
- Result: 3 test suites passed, 3 tests passed.
- Covered:
  - `users.integration.spec.ts`
  - `auth.integration.spec.ts`
  - `invitations-memberships.integration.spec.ts`

Phase 0 status: closed operationally.

Important limitation:

Phase 0 proves database connectivity and baseline persistence, but does not yet prove service-level integration, provider integration, or frontend end-to-end behavior.

Pending hardening:

- split broad database cleanup into smaller cleaners per submodule;
- define a dedicated test database;
- replace `prisma db push` workflow with formal Prisma migrations.

Hardening timing:

- cleaner split: early Phase 1;
- dedicated test database: before provider/frontend integration;
- formal migrations: before production-grade release workflow.

---

## Phase 1 Scope

Phase 1 validates each Identity & Access submodule against real persistence.

The target is to move from:

Prisma direct integration tests

to:

service/repository integration tests

Each submodule should prove that its real application service works correctly with real persistence.

Target files:

users.service.integration.spec.ts  
auth.service.integration.spec.ts  
memberships.service.integration.spec.ts  
invitations.service.integration.spec.ts  
roles.service.integration.spec.ts  
grants.service.integration.spec.ts  
access-resolution.integration.spec.ts  

---

## Phase 1 Acceptance Criteria

A submodule is considered integrated with the database when it has:

- at least one happy-path test using the real service or repository;
- at least one meaningful error or constraint test;
- final state verification directly from the database;
- scoped cleanup of test data;
- documented gaps between domain expectations and Prisma/schema behavior.

---

## Phase 1 Recommended Order

1. Users service integration;
2. Auth service integration;
3. Memberships service integration;
4. Invitations service integration;
5. Roles service integration;
6. Grants service integration;
7. Access Resolution with real readers.

---

## Cleanup Strategy

Current helper:

packages/api/src/integrations/setup/test-db-cleaner.ts

Current strategy:

- remove records containing `integration-test-`;
- clean dependent tables before parent tables;
- keep deletion scoped to test data only.

Known limitation:

- the current cleaner is broad and can be slow;
- it should be split by submodule during Phase 1.

Recommended future helpers:

cleanUsersTestData  
cleanAuthTestData  
cleanMembershipsTestData  
cleanInvitationsTestData  
cleanRolesTestData  
cleanGrantsTestData  
cleanAccessResolutionTestData  

---

## Provider Integration Boundary

External identity providers are out of scope for Phase 1.

Not included yet:

- Firebase real token validation;
- Google sign-in integration;
- Apple sign-in integration;
- frontend authentication flows.

These belong to later provider-integration phases after the internal Identity & Access core is stable against real persistence.

---

## Long-Term Testing Roadmap

### Current

- unit tests;
- database integration tests with Prisma direct access.

### Next

- service-level integration tests;
- repository-level integration tests;
- transaction boundary validation;
- domain error mapping from Prisma errors.

### Later

- provider integration tests;
- backend e2e tests;
- frontend e2e flows;
- production-like test database pipeline.