# SeedGuard Backend

This folder contains a starter backend service for account storage and authentication.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start the API server:
   ```bash
   npm start
   ```

3. The API will run at `http://localhost:3001` by default.

## Available routes

- `POST /api/signup` - create a new account
- `POST /api/login` - authenticate an existing account
- `GET /api/health` - check service status

## Storage

Accounts are stored in `backend/data/users.json` for initial development.

## Notes

This is a development prototype. For production, the next step is to replace file-based storage with a database and add secure session handling.
