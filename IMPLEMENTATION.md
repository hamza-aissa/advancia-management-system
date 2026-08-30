# Notes d’implémentation

## Boucle produit

1. Détecter une licence ou un contrat proche de son échéance.
2. Identifier le responsable du département.
3. Enregistrer le contact ou la prochaine relance.
4. Renouveler ou enregistrer le refus.
5. Conserver l’activité et éviter les rappels en double.

## Frontend

Le frontend est une application Vite/React/TypeScript en français. L’interface utilise Tailwind CSS et des primitives shadcn, avec une présentation dense et neutre adaptée à un outil interne.

La fiche client constitue l’espace opérationnel principal:

- Agent: liste, création, modification, renouvellement, refus et archivage confirmé des licences.
- Consultant: création du contrat s’il est absent, modification des services, relance, renouvellement et refus.
- Administrateur: visibilité sur les deux ensembles, réaffectation et archivage.

## Backend

- Les routes licences refusent les Consultants.
- Les routes contrats refusent les Agents.
- Les collaborateurs voient le même annuaire client, mais pas les données opérationnelles de l’autre département.
- Un Agent ne peut modifier ou archiver qu’une licence qui lui appartient.
- Un Consultant ne peut modifier que son contrat.
- Une contrainte unique interdit plusieurs contrats pour le même client.
- Les comptes Agent/Consultant sont créés et désactivés par un Administrateur.
- Un compte désactivé ne peut plus se connecter et ses jetons existants sont rejetés.

## Catalogues

L’Administrateur maintient les offres de licences et les types de contrats. Si une base existante ne contient aucun catalogue, le démarrage crée des entrées génériques sans écraser les données existantes.

## Rappels

`ExpiryCheckerJob` est lancé après la connexion MongoDB. La configuration du cron et du fuseau est validée, les exécutions ne se chevauchent pas et une exécution tardive rattrape le niveau d’escalade atteint. `NotificationLog` assure la déduplication.

Mailpit fournit une livraison SMTP locale vérifiable. En production, la même interface utilise le serveur SMTP configuré par variables d’environnement.

## Tests

- Tests Vitest: validation, authentification, séparation des départements, périmètres, calculs et rappels.
- Tests Playwright: parcours Agent, Consultant, Administrateur et confirmation d’archivage.
- Les images Docker et le scénario Playwright restent à exécuter dans un environnement disposant de Docker.
