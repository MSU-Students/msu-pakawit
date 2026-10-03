# Implementation Plan: Ticket #1 - Username/Password Login

## Objective
Initialize backend user and authentication modules. `UserModule` owns user accounts and role management; `AuthModule` implements username/password login, verifies a one-way password hash, and returns a signed bearer access token with a safe user profile.

## Current State
- The API is a NestJS application using TypeORM and PostgreSQL.
- `AppModule` imports the existing domain modules; there is no authentication or user-management module yet.
- `User` is currently defined in `modules/guardrails/entities/user.entity.ts` and contains unique `msuIdNumber` and `email` fields, but no username or credential hash. Guardrails entities refer to it directly.
- The `users` table is empty during Sprint 0. Use TypeORM `synchronize=true` for this sprint's schema changes; do not add a migration script.
- Backend tests use Jest and mocked TypeORM repositories.

## Scope and Decisions
- Add a `UserModule` under `api/src/modules/users/` to own the canonical `User` entity, account lifecycle, and role management. Move the entity out of `guardrails` and update its consumers; do not create a second user table.
- Add an `AuthModule` under `api/src/modules/auth/` for login, credential verification, JWT issuance, and authentication guards needed by protected user-management routes.
- Add a unique, free-form username and a password-hash field to `User`. Validate a trimmed, non-empty username with bounded length and a general allowed-character set that is not tied to current or future user types, MSU ID, email, or role.
- Store only a password hash, using Argon2id (or the repository-approved equivalent), never plaintext passwords.
- Provide user-management operations for account creation, retrieval/update, and role assignment. Protect user-management routes with authentication and restrict role changes and administrative account operations to `ADMIN` users.
- Add `POST /api/auth/login` accepting `{ "username": "...", "password": "..." }`.
- On success, return a signed JWT access token and a safe user profile containing only `id`, `username`, `fullName`, and `role`. Do not expose the password hash or other private account data.
- Use a generic `401 Unauthorized` response for unknown usernames, invalid passwords, and inactive accounts. Do not reveal which credential check failed.
- Keep self-service public registration, password reset, refresh tokens, logout/revocation, and frontend changes out of this ticket. Account provisioning belongs to `UserModule` and must be authenticated/authorized or handled by a controlled bootstrap process.

## Implementation Tasks
1. **Establish user-module ownership and Sprint 0 schema setup**
   - Move `User` into `modules/users/entities/`, create `UserModule` and `UserService`, and update `AppModule`, guardrails imports/relations, tests, and developer documentation to reflect the new ownership.
   - Add username/password-hash columns and username uniqueness to the entity. Since the `users` table is empty in Sprint 0, rely on `synchronize=true`; do not create a TypeORM migration script.
   - Apply the same username normalization and format validation at the DTO and persistence boundaries. Keep these rules independent of user type and role.
   - Login must fail safely for accounts without provisioned credentials.

2. **Add authentication dependencies and configuration**
   - Add the Nest JWT package and an Argon2 implementation to the API workspace.
   - Configure the signing secret and token lifetime through environment configuration; fail startup or auth initialization when required production secrets are missing. Never commit a real secret.
   - Document the required environment variable names and development setup in the existing environment documentation.

3. **Implement user account and role management**
   - Add `UserController` and DTOs for user provisioning, reading/updating profiles, and role assignment. Follow the repository's chosen API surface and make each operation's authorization explicit.
   - Add safe user response DTOs; never expose password hashes or return TypeORM entities directly from management endpoints.
   - Add JWT authentication and an `ADMIN` authorization check for administrative user and role-management operations. Keep normal user profile access limited to the caller unless explicitly authorized otherwise.
   - Define and implement a controlled initial-admin bootstrap path so the first administrator can be created without an unauthenticated role-escalation endpoint.

4. **Implement the auth module and login flow**
   - Add a validated login DTO with non-empty username/password constraints and Swagger metadata.
   - Add `AuthModule`, `AuthController`, and `AuthService`; register the module in `AppModule` and use `UserService` for credential lookup rather than accessing the user repository directly.
   - Find an active user by username, verify the submitted password against the stored hash, and sign a JWT with the user's stable ID and role as claims. Ensure authorization uses current/valid role information according to the selected token strategy.
   - Return the token, token type, expiry information, and safe profile. Keep credential failures indistinguishable to callers.

5. **Add focused tests and verify the API**
   - Unit-test user creation and lookup, role assignment authorization, attempts to assign invalid roles, and safe response serialization.
   - Unit-test successful login, bad password, unknown username, inactive user, malformed DTO, and safe response serialization.
   - Verify the signed token has the expected subject/claims and configured expiry without embedding credentials or password hashes; test protected user routes for unauthenticated, non-admin, and admin callers.
   - Add HTTP-level tests for `POST /api/auth/login` and the user-management/role-management routes, then run the API test suite and production build.
   - Verify the generated Swagger document includes the auth and user-management contracts.

## Acceptance Criteria
- `POST /api/auth/login` accepts a valid username/password pair for an active, provisioned account and returns a verifiable, expiring bearer token.
- A dedicated `UserModule` owns user persistence and account/role management; guardrails consumes the user entity without owning it.
- Protected user-management routes enforce authentication, and role changes/admin operations require an administrator. The initial administrator is provisioned through a controlled process.
- Invalid credentials and inactive accounts return the same generic `401` response.
- Passwords are persisted only as Argon2id hashes; plaintext passwords and hashes never appear in logs or responses.
- User profile responses contain no credential fields.
- During Sprint 0, the empty `users` table is created or updated using `synchronize=true`; no TypeORM migration script is added.
- Usernames are free-form within general format constraints and are not coupled to a current or future user type.
- DTO validation rejects missing or empty credentials, and focused tests plus the API build pass.
- Existing guardrails behavior and user relationships remain intact after the entity move.

## Open Questions / Risks
- **Username format:** Agree on exact username length and allowed-character rules while keeping validation general and user-type-neutral.
- **Account provisioning:** Although the table is empty in Sprint 0, define how initial users receive usernames and password hashes; login must fail safely for unprovisioned accounts.
- **Administrator bootstrap:** Decide how to establish the first `ADMIN` account without exposing a public privilege-escalation path.
- **Role authorization:** Define whether role claims are trusted for the full access-token lifetime or checked against current database state, especially after an administrator changes a user's role.
- **Token contract:** Confirm the access-token lifetime and whether the API should return `accessToken` or `token`, so future client integration can consume a stable contract.
