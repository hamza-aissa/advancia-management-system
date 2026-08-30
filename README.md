# Advancia — suivi interne des renouvellements

Application interne en français pour suivre les licences et contrats clients, attribuer chaque renouvellement à un responsable et éviter les pertes liées aux échéances oubliées.

## Règles métier

| Rôle | Périmètre |
|---|---|
| Agent | Clients partagés et licences uniquement |
| Consultant | Clients partagés et contrats uniquement |
| Administrateur | Supervision des deux départements, affectations, archivage, catalogues et comptes |
| Direction | Rappels critiques par e-mail uniquement, aucun accès applicatif |

- Un client peut avoir plusieurs licences et un seul contrat actif.
- Le contrat contient une ou plusieurs lignes de service chiffrées.
- L’archivage conserve l’historique; il ne supprime pas physiquement les données.
- Les rappels sont escaladés à J-15, J-10 et J-6, avec déduplication par cycle de renouvellement.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, composants shadcn
- API: Express 5, TypeScript, MongoDB/Mongoose
- Authentification: JWT, comptes créés uniquement par un Administrateur
- Planification: `node-cron`, fuseau `Africa/Tunis` par défaut
- Démo SMTP: Mailpit
- E2E: Playwright

## Démarrage local

```bash
cp -n .env.example .env
docker-compose -f ./compose.yaml up -d --build
docker-compose -f ./compose.yaml --profile seed run --rm seed
```

- Application: `http://localhost:8080`
- API: `http://localhost:5000/health`
- Boîte de réception des rappels: `http://localhost:8025`

Comptes de démonstration, mot de passe `password123`:

- `agent@advancia.com`
- `consultant@advancia.com`
- `admin@advancia.com`

Le seed réinitialise les données de démonstration. Sans seed, une base vide reçoit automatiquement une offre de licence et un type de contrat génériques, modifiables dans **Catalogues**.

## Rappels

Le cron démarre avec l’API. En Docker local, les e-mails sont réellement remis à Mailpit sans identifiants externes. Pour un hébergement, remplacez `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` et `EMAIL_FROM` par le SMTP de l’organisation.

L’Administrateur peut consulter l’état, l’historique et déclencher une vérification depuis **Supervision**.

## Vérification

```bash
cd api && npm ci && npm test && npm run build
cd ../client && npm ci && npm run lint && npm run build
cd ..
docker-compose -f ./compose.yaml --profile e2e run --rm e2e
```

Le scénario E2E suppose que la stack est démarrée et que le seed a été exécuté.

## API principale

- `POST /api/auth/login`, `GET /api/auth/profile`
- `GET|POST|PATCH /api/clients`
- `GET|POST|PATCH|DELETE /api/licenses`
- `GET|POST|PATCH|DELETE /api/contracts`
- `GET|POST|PATCH /api/catalog/*`
- `GET|POST|PATCH /api/users` (Administrateur)
- `GET /api/notifications/status|history`, `POST /api/notifications/run` (Administrateur)

Il n’existe pas d’inscription publique.
