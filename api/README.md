# API Advancia

API Express/TypeScript/MongoDB de l’application Advancia.

```bash
cp .env.example .env
npm ci
npm run dev
```

Scripts: `npm run build`, `npm test`, `npm run seed`, `npm run test:expiry`.

L’API n’expose aucune inscription publique. Les comptes opérationnels sont gérés par l’Administrateur via `/api/users`. Voir le [README principal](../README.md) pour les règles métier, les variables et les commandes Docker.
