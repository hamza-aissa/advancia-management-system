# Demo deployment

This setup runs the React frontend, Express API, and MongoDB with one Docker
Compose project. It is intended for a portfolio demo and local evaluation, not
as a production security baseline.

## Start the stack

Prerequisite: Docker with the Compose plugin.

```bash
cp .env.example .env
docker compose up --build -d
```

Open <http://localhost:8080>. The API is also exposed locally at
<http://127.0.0.1:5000/health> for diagnostics. MongoDB is not exposed to the
host. Its data persists in the `mongo_data` named volume.

Inspect status and logs:

```bash
docker compose ps
docker compose logs -f api web
```

Stop the services without deleting demo data:

```bash
docker compose down
```

## Seed demo data

Seeding clears and recreates application data. Run it deliberately after the
stack is healthy, not on every restart:

```bash
docker compose --profile seed run --rm seed
```

The seed credentials are printed by the command. Do not use demo credentials
on an internet-facing deployment.

## Environment strategy

- `VITE_API_URL` is a Vite build-time variable. The default `/api` keeps all
  browser traffic same-origin and should be used for the Compose deployment.
- `API_UPSTREAM` is resolved by Nginx at container startup. It defaults to
  `api:5000`, allowing the API container/service address to change without
  rebuilding the frontend image.
- If the frontend and API must be hosted on separate public origins, build the
  frontend with the public API URL, for example
  `VITE_API_URL=https://api.example.com/api docker compose build web`. The API
  must then explicitly allow the frontend origin through its CORS policy.
- Vite variables cannot be changed in already-built JavaScript. Prefer the
  same-origin `/api` proxy approach; rebuild only for a truly separate origin.

Before any public deployment, replace `JWT_SECRET` with a long random value and
configure the API's allowed origin. SMTP variables may remain empty when email
delivery is not part of the demo. Store real SMTP credentials in the host's
secret/environment manager, never in Git.

## Image design

- The API image compiles TypeScript separately and ships only production
  dependencies plus `dist`.
- The frontend image builds static Vite assets and serves them from an
  unprivileged Nginx process with SPA fallback.
- MongoDB and both application containers have health checks. Startup waits for
  dependency health rather than relying on timing.

## Developer workflows

Docker is optional for application development. Existing `npm run dev` commands
and component-level `.env` files continue to work. The Compose files use only
root-level `.env`; they do not overwrite `api/.env` or `client/.env`.
