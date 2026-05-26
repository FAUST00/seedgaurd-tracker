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

- `POST /api/signup` - create a new account with one unique email and one unique username
- `POST /api/login` - authenticate an existing account by username
- `GET /api/profile/:userId` - load a user's saved streak/profile data
- `POST /api/profile/:userId` - save a user's streak/profile data
- `GET /api/health` - check service status

## Storage

Accounts are stored in `backend/data/users.json` for initial development.
Streak/profile data is stored in `backend/data/user-data.json`.

The GitHub Pages frontend can create local accounts in the browser without this server. To save accounts across devices, deploy this backend separately and point the frontend at that API host.

## Notes

This is a development prototype. For production, the next step is to replace file-based storage with a database and add secure session handling.
