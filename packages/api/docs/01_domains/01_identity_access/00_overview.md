# Identity & Access — Overview

## Purpose

Identity & Access is the domain responsible for establishing who the actor is, how the actor accesses the platform, where the actor is formally allowed to operate, and which baseline and exceptional access capabilities may apply within a valid operational context.

This domain does not own business rules of functional modules, but it provides the identity, authentication, membership, role, grant, invitation, and effective access foundations required by the rest of the platform.

## Submodules

### Auth
Handles authentication, session lifecycle, and identity verification through internal or external providers, resolving a secure authenticated context.

### Users
Represents the canonical global identity of a person within the platform, independently of memberships, sessions, or operational roles.

### Memberships
Manages the formal relationship between a user and a valid organizational scope, defining where the actor may operate.

### Roles
Defines reusable baseline capability sets that may be assigned within a valid organizational scope.

### Grants
Manages explicit access exceptions that allow or deny specific capabilities beyond the baseline defined by roles.

### Invitations
Manages controlled access invitations for onboarding users into organizational scopes, including acceptance, expiration, and conversion into memberships.

### Access Resolution
Resolves effective access by combining authenticated identity, valid membership context, assigned roles, and applicable grants.

## Domain flow

The Identity & Access domain is structured as a layered chain of responsibility:

- Users answers **who the person is**
- Auth answers **how the person proves identity and gains a valid session**
- Memberships answers **where the person may operate**
- Roles answers **which baseline capabilities apply**
- Grants answers **which explicit exceptions modify that baseline**
- Access Resolution answers **what the effective access result is**
- Invitations supports controlled onboarding into valid scopes and may materialize into memberships

