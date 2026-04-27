# Identity & Access — Integration Plan

## Purpose

This document defines the phased integration plan for the Identity & Access domain.

The goal is to move from isolated submodule correctness to a backend-ready Identity & Access foundation that can safely support frontend consumers such as Partners Web, Shopper Mobile App, and Shopper Web App.

---

## Phase 0 — Technical Baseline

Validate that the backend is connected to real infrastructure.

### Scope

- Prisma connected to PostgreSQL/Supabase;
- schema synchronized with the database;
- Prisma Client generated successfully;
- Prisma Studio can inspect real tables;
- smoke integration tests can write/read real data.

### Status

Closed operationally.

### Pending hardening

- replace `prisma db push` with formal Prisma migrations;
- define a dedicated test database;
- optimize test data cleaners by submodule.

---

## Phase 1 — Internal Persistence by Submodule

Validate that each Identity & Access submodule works correctly against real persistence.

### Scope

- Users ↔ Prisma/PostgreSQL;
- Auth ↔ Prisma/PostgreSQL;
- Memberships ↔ Prisma/PostgreSQL;
- Roles ↔ Prisma/PostgreSQL;
- Grants ↔ Prisma/PostgreSQL;
- Invitations ↔ Prisma/PostgreSQL;
- Access Resolution ↔ real readers/repositories.

### Objective

- replace purely isolated or mocked wiring with real repositories where appropriate;
- validate that the Prisma schema supports domain expectations;
- detect gaps between code, schema, constraints, and repositories.

### Acceptance criteria

Each submodule must have:

- at least one happy-path test using real service/repository wiring;
- at least one meaningful error/constraint test;
- final state verification from the database;
- scoped cleanup of integration test data.

---

## Phase 2 — Cross-Module Flows with Real Services

Validate that Identity & Access submodules work together through real application services.

### Core flows

- Auth → Users;
- Invitations → Users → Memberships;
- Memberships → Roles;
- Memberships → Grants;
- Auth → Memberships → Roles/Grants → Access Resolution.

### Objective

- prove that submodules collaborate correctly;
- validate transaction boundaries;
- validate lifecycle transitions;
- validate effective access decisions from real persisted data.

### Acceptance criteria

- invitation acceptance can materialize a user/membership;
- authenticated user can resolve a valid operational context;
- roles and grants affect effective permissions correctly;
- revoked/suspended/expired entities block access as expected.

---

## Phase 3 — External Identity Provider Integration

Integrate external identity providers into the internal Auth pipeline.

### Scope

- Firebase token validation;
- Google sign-in;
- Apple sign-in;
- email/phone verification flows;
- provider identity linking and conflict handling.

### Objective

External providers must feed the internal canonical identity model without owning it.

The internal `User` remains the canonical identity. Provider identities are linked through `AuthIdentity`.

### Acceptance criteria

- provider token validates successfully;
- provider subject maps to `AuthIdentity`;
- canonical `User` is resolved or linked correctly;
- sessions are issued internally;
- conflicts are rejected safely.

---

## Phase 4 — Backend E2E / API Readiness

Validate the backend through real HTTP/API surfaces.

### Scope

- controllers;
- guards;
- DTO validation;
- authenticated request context;
- authorization decisions;
- error responses;
- API contracts for frontend consumers.

### Objective

Prepare Identity & Access to be consumed by frontend applications.

### Acceptance criteria

- login/session endpoints behave correctly;
- protected endpoints reject unauthenticated access;
- access resolution endpoints return stable contracts;
- frontend-relevant errors are consistent;
- API responses are documented and predictable.

---

## Phase 5 — Consumer Readiness

Prepare Identity & Access for integration with actual frontend products.

### Primary consumer

- Partners Web.

### Later consumers

- Shopper Mobile App;
- Shopper Web App;
- POS or internal operational surfaces if required.

### Scope

- frontend auth contract;
- session persistence strategy;
- active membership context selection;
- role/capability-driven navigation;
- unauthorized/forbidden handling;
- logout/session expiration UX expectations.

### Acceptance criteria

- frontend can authenticate a user;
- frontend can fetch current user/session context;
- frontend can resolve active operational context;
- frontend can evaluate permissions;
- frontend can render UI based on effective capabilities.

---

## Backend Integration Strategy After Identity & Access

Identity & Access should be completed to frontend-readiness before scaling into business modules.

Recommended sequence:

1. Identity & Access readiness;
2. Core Business:
   - Tenants;
   - Stores;
   - Store Settings;
   - Fiscal Configuration;
   - Operational Settings;
3. Partners Web MVP for administrative operation;
4. Commercial Master Data:
   - Catalog;
   - Pricing;
   - Customers;
5. Operations:
   - Inventory;
   - Carts;
   - Checkout Sessions;
   - Orders;
   - POS;
   - Cash & Expenses;
   - Agent Transactions;
6. Shopper Mobile App and Shopper Web App once catalog, checkout, and order flows are stable.

---

## Strategic Principle

Do not build the entire backend before any frontend validation.

Instead, build backend domains in vertical readiness layers:

1. foundation domain ready;
2. minimal frontend consumer validates real usage;
3. next backend domain expands capability;
4. frontend evolves with real operational feedback.

For the MVP, Partners Web should be the first frontend consumer because it validates tenant, store, settings, catalog, pricing, inventory, and operational administration before exposing flows to shoppers.