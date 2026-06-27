# Grant Management Portal

A secure, production-grade Grant Management Portal built with **Node.js, Express, PostgreSQL, Redis, and Docker Compose**. Features Role-Based Access Control (RBAC), OAuth 2.0 (GitHub) authentication, JWT sessions, and test suites with code coverage analysis.

---

## Architecture Overview
The application follows the classic **Model-View-Controller (MVC)** architectural pattern:
- **Model Layer**: Built with Sequelize ORM representing `User`, `Role`, `UserRole`, `Grant`, and `Application`.
- **View Layer**: RESTful JSON serialization layer.
- **Controller & Route Layer**: Modular Express routers handling HTTP input, validation with `express-validator`, business logic delegation, and error handling.

Services are containerized using Docker and orchestrated via Docker Compose:
- `app`: Express Application Server (multi-stage Node 20 image)
- `db`: PostgreSQL 16 database with auto-seeding on startup
- `cache`: Redis 7 in-memory cache

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker Engine & Docker Compose installed

### Launching the Application
1. Clone the repository and navigate to the project root:
   ```bash
   cd SM_Portal
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Build and launch containers:
   ```bash
   docker-compose up --build
   ```
4. The application will start at `http://localhost:3000`. Health check endpoint: `http://localhost:3000/health`.

---

## Role-Based Access Control (RBAC)
The portal supports three distinct roles:
1. **ADMIN**: Full system oversight, user role assignment (`POST /api/users/:userId/roles`), grant deletion override.
2. **GRANTOR**: Create, update, and delete owned grants; view applications for owned grants.
3. **GRANTEE**: View available grants; submit application proposals.

### Initial Seed Data
On container startup, the database is automatically initialized and seeded with default roles (`ADMIN`, `GRANTOR`, `GRANTEE`) and a default administrator account:
- **Email**: `admin@grantportal.com`
- **Password**: `Admin@123456`

---

## API Reference

### Authentication
- `POST /api/auth/register` — Register a new user (`GRANTEE` by default)
- `POST /api/auth/login` — Login with email/password, returns JWT access token
- `GET /api/auth/github` — Initiate GitHub OAuth 2.0 authorization
- `GET /api/auth/github/callback` — OAuth 2.0 redirect callback endpoint

### Grants
- `GET /api/grants` — List all active grants (Authenticated)
- `GET /api/grants/:id` — Get specific grant by ID (Authenticated)
- `POST /api/grants` — Create a new grant opportunity (GRANTOR)
- `PUT /api/grants/:id` — Update grant details (GRANTOR owner)
- `DELETE /api/grants/:id` — Delete a grant (GRANTOR owner / ADMIN)

### Applications
- `POST /api/grants/:id/apply` — Submit project proposal (GRANTEE)
- `GET /api/grants/:id/applications` — View applications for grant (GRANTOR owner)
- `GET /api/applications/:appId` — View application details (GRANTEE owner / GRANTOR owner)
- `PATCH /api/applications/:appId/status` — Update application status (GRANTOR owner)

### User Administration
- `GET /api/users` — List all system users (ADMIN)
- `POST /api/users/:userId/roles` — Assign role to user (ADMIN)
- `DELETE /api/users/:userId/roles/:roleName` — Remove role from user (ADMIN)

---

## Running Tests & Coverage

To execute the Jest test suite and generate the code coverage report locally:
```bash
npm run test:coverage
```
Coverage reports will be output to the `/coverage` directory.
