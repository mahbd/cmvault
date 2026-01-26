# CMVault - Rust + Svelte Edition

The project now runs on a lightweight Rust backend (Actix Web + SQLx + PostgreSQL) with a Svelte UI. The terminal autocompleter still talks to the same API surface (`/api/suggest`, `/api/learn`, etc.) but everything is backed by Rust.

## Stack
- **Backend:** Rust, Actix Web, SQLx, PostgreSQL
- **Frontend:** SvelteKit, Vite
- **Auth:** API tokens via `Authorization: Bearer <token>` header
- **Terminal:** Zsh plugin in `autocompleter/` still works against the new API

Legacy Next.js files have been parked under `legacy-next/` for reference.

## Quickstart
1. **Env:** copy `.env.example` to `.env` and set:
   - `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/cmvault`
   - `ADMIN_API_TOKEN=<strong token>` (bootstraps an API token)
   - Frontend reads `VITE_API_URL` and `VITE_API_TOKEN` for requests.

2. **Backend (Actix):**
   ```bash
   cd backend
   cargo run
   ```
   Migrations run automatically on startup. Default bind is `0.0.0.0:8080`.

3. **Frontend (Svelte):**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host
   ```
   Point the UI at the backend via `VITE_API_URL`/`VITE_API_TOKEN` (read from the repo root `.env` because Vite is configured with `envDir: '..'`).

## Database migrations
- Migrations live in `backend/migrations/` and are applied automatically when you run `cargo run` in `backend/`.
- To run them manually, install SQLx CLI and execute:
  ```bash
  cd backend
  cargo install sqlx-cli --no-default-features --features native-tls,postgres
  sqlx migrate run
  ```

## API surface
- `GET /health` – heartbeat
- `GET /api/commands?q=` – list commands (public + your token)
- `POST /api/commands` – create command (requires token)
- `DELETE /api/commands/:id` – delete your command
- `POST /api/suggest` – suggestion strings for the autocompleter
- `POST /api/learn` – log executed command
- `GET /api/learned` – list learned snippets (paginated via `limit`/`offset`)
- `POST /api/learned/:id/promote` – turn learned item into a saved command
- `POST /api/device-codes` – create a 6-digit code for pairing
- `POST /api/exchange-token` – swap a code for an API token
- `POST /api/register` – email/password signup, returns a personal API token
- `POST /api/login` – email/password login, returns a fresh API token

## Autocompleter
The Zsh plugin in `autocompleter/install.sh` keeps working. Flow with the new auth:
- Get a token: login/register in the web UI, then create an API token (or create a 6-digit device code via the UI/API).
- Run the installer and paste the token or device code when prompted; device codes are swapped via `POST /api/exchange-token`.
- Suggestions: `POST /api/suggest` with your token.
- Learning mode: `POST /api/learn`.

## License
MIT – see [LICENSE](LICENSE).
