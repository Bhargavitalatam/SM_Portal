# Grant Management Portal — Project Plan & User Stories

This document defines the Agile project planning artifacts, user stories, and acceptance criteria for the Grant Management Portal.

---

## Epic 1: User Authentication & Onboarding

### User Story 1: Email and Password Registration
**As a** new platform user,  
**I want to** register for an account using my email and password,  
**So that** I can access the Grant Management Portal securely.

#### Acceptance Criteria:
- ✓ The system accepts name, valid email address, and strong password via `POST /api/auth/register`.
- ✓ Password must be hashed securely using `bcrypt` before storing in the database.
- ✓ Upon registration, the user is automatically assigned the default `GRANTEE` role.
- ✓ The response returns HTTP 201 with the created user object excluding the password hash.

### User Story 2: OAuth 2.0 Third-Party Authentication
**As a** prospective grantee or grantor,  
**I want to** sign in using my GitHub account via OAuth 2.0,  
**So that** I do not need to manage another set of password credentials.

#### Acceptance Criteria:
- ✓ Navigating to `GET /api/auth/github` redirects the user to GitHub's authorization page.
- ✓ Upon authorization, GitHub redirects to `GET /api/auth/github/callback` with an authorization code.
- ✓ The server exchanges the authorization code for an access token, fetches profile details, and creates/links the user.
- ✓ A valid JWT containing `userId` and `roles` is issued upon successful authentication.

---

## Epic 2: Grant Management

### User Story 3: Grant Creation by Grantors
**As a** Grantor organization representative,  
**I want to** create new grant funding opportunities with titles, descriptions, and award amounts,  
**So that** qualified organizations and individuals can apply for funding.

#### Acceptance Criteria:
- ✓ Only users with the `GRANTOR` role can access `POST /api/grants`.
- ✓ The grant is created and linked directly to the authenticated user's ID as `grantor_id`.
- ✓ Unauthenticated requests receive HTTP 401, while unauthorized roles (e.g., `GRANTEE`) receive HTTP 403 Forbidden.

### User Story 4: Grant Lifecycle Management (Update and Delete)
**As a** Grantor who created a grant opportunity,  
**I want to** update the grant details or remove it when funding is exhausted,  
**So that** the public listings reflect accurate and current funding opportunities.

#### Acceptance Criteria:
- ✓ A `GRANTOR` can update (`PUT /api/grants/:id`) or delete (`DELETE /api/grants/:id`) grants they own.
- ✓ A `GRANTOR` attempting to modify a grant owned by another user receives HTTP 403 Forbidden.
- ✓ An `ADMIN` user has full permission to delete any grant across the platform.

---

## Epic 3: Application Submission & Review

### User Story 5: Application Submission by Grantees
**As a** Grantee applicant,  
**I want to** submit a project proposal for an available grant opportunity,  
**So that** my project can be evaluated for funding.

#### Acceptance Criteria:
- ✓ Users with the `GRANTEE` role can submit proposals via `POST /api/grants/:id/apply`.
- ✓ Duplicate applications from the same grantee for the same grant are prevented and return HTTP 409 Conflict.
- ✓ The application initial status is set automatically to `submitted`.

### User Story 6: Grantee Proposal Review by Grantors
**As a** Grantor,  
**I want to** view all applications submitted specifically for my grants,  
**So that** I can review proposals and award funding appropriately.

#### Acceptance Criteria:
- ✓ A `GRANTOR` can retrieve applications via `GET /api/grants/:id/applications` only for grants they created.
- ✓ Requests for applications of a grant owned by a different grantor return HTTP 403 Forbidden.

---

## Epic 4: Access Control & Role Administration

### User Story 7: Role Assignment by Administrators
**As a** System Administrator,  
**I want to** assign or revoke user roles (such as granting `GRANTOR` status),  
**So that** administrative control and user privileges are properly managed across the enterprise.

#### Acceptance Criteria:
- ✓ Only users with the `ADMIN` role can access `POST /api/users/:userId/roles`.
- ✓ Assigned roles immediately update user access permissions across protected endpoints.
