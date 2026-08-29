# Advancia client

Vite + React + TypeScript frontend for the Advancia renewal operations demo.

## Run locally

```bash
cp .env.example .env
npm ci
npm run dev
```

The API defaults to `http://localhost:5000/api`. Override it with:

```env
VITE_API_URL=http://localhost:5000/api
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `src/lib/api.ts`: typed Axios client, JWT injection, canonical error handling
- `src/contexts/auth-context.tsx`: session restore and authentication lifecycle
- `src/components/ui`: shadcn/ui-compatible primitives
- `src/components/app-shell.tsx`: responsive, role-aware navigation
- `src/pages`: login and feature route extension points

There is no public registration route. Interactive roles are Agent, Consultant, and Admin.
