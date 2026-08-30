# Advancia — suivi interne des renouvellements

Application interne en français pour éviter la perte de clients liée aux échéances de licences et de contrats.

## 📋 Overview

This system helps companies manage their clients, licenses, and contracts with automatic expiry tracking and email notifications. It features role-based access control with four distinct user roles, each with specific responsibilities and access levels.

### Key Features

- **Annuaire client partagé** entre Agents et Consultants
- **Licences** gérées uniquement par les Agents à partir d'offres définies par l'Admin
- **Contrats** gérés uniquement par les Consultants à partir de types définis par l'Admin
- **Services chiffrés** ajoutés par le Consultant; total calculé automatiquement
- **Un seul contrat par client**, renouvelé dans le même dossier avec historique
- **Plusieurs licences par client**, y compris pour un client qui possède aussi un contrat
- **Rappels automatiques** et escalades internes à J-15, J-10 et J-6
- **Authentification JWT** et permissions par rôle

## 🏗️ Architecture

The project consists of two main components:

- **API** (`/api`): Node.js + Express + MongoDB backend
- **Client** (`/client`): React + TypeScript frontend

## 👥 User Roles

### 1. Agent
- **Responsibility**: Manages client licenses only
- **Permissions**:
  - Assign (affecter) licenses to clients
  - Create and update shared client records
  - Select licence offers maintained by the Admin
  - Renew or modify existing licenses
  - Track upcoming license expirations
- **Access**: NO access to contracts

### 2. Consultant
- **Responsibility**: Manages client contracts only
- **Permissions**:
  - Create and manage contracts for clients
  - Create and update shared client records
  - Select a contract type and compose priced service lines
  - Renew, modify, or terminate contracts
  - Track contract expiration dates
- **Access**: NO access to licenses

### 3. Admin
- **Responsibility**: Supervises both agents and consultants
- **Permissions**:
  - View all activities and reports
  - Monitor system operations and user actions
  - Delete any resource
  - Maintain the licence-offer and contract-type catalogues
- **Access**: Full read access, limited write access

### 4. Executive
- **Responsibility**: High-level observer
- **Permissions**:
  - Receives critical expiry notifications only
  - Email addresses are supplied through `EXECUTIVE_EMAILS`
- **Access**: NO direct system access (email notifications only)

## 🔔 Notification System

### Expiry Check Schedule

A daily cron job (default: 09:00 in `Africa/Tunis`) checks all active licenses and contracts. The schedule and IANA timezone are validated at startup. Runs cannot overlap, and a late run catches the current escalation level instead of requiring an exact calendar day.

### Notification Rules

| Days Before Expiry | Recipients | Frequency | Description |
|-------------------|-----------|-----------|-------------|
| **15 days** | Agent (licenses) or Consultant (contracts) | Once per renewal cycle | Internal reminder to responsible party |
| **10 days** | Responsible employee + Admin | Once per renewal cycle | Escalated warning |
| **6 days** | Responsible employee + Admin + Executives | Once per renewal cycle | Critical stage notification |

### Important Notes

⚠️ **The system does NOT notify clients directly.** All notifications are internal only, sent to:
- Agents (for licenses)
- Consultants (for contracts)
- Admins (escalated notifications)
- Executives (critical notifications)

The unique notification history prevents duplicates. With no SMTP credentials, reminders are explicitly stored as `simulated`, never as sent. Administrators can inspect `GET /api/notifications/status`, run a check with `POST /api/notifications/run`, and review `GET /api/notifications/history`.

## 🚀 Démarrage avec Docker Compose

```bash
cp -n .env.example .env
docker-compose -f ./compose.yaml up -d --build
docker-compose -f ./compose.yaml --profile seed run --rm seed
```

Ouvrez `http://localhost:8080`. La commande de seed réinitialise les données de démonstration et crée aussi les deux catalogues.

Le cron est actif dans le conteneur API. Sans identifiants SMTP, les rappels sont enregistrés comme **simulés**. Pour envoyer réellement les e-mails, renseignez `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` et `EMAIL_FROM` dans `.env`, puis redémarrez le service API.

## 🚀 Démarrage sans Docker

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/hamza-aissa/advancia-management-system.git
cd advancia-management-system
```

2. **Set up the API**
```bash
cd api
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Set up the Client**
```bash
cd ../client
npm install
cp .env.example .env
# Edit .env with your API URL
npm start
```

4. **Configure MongoDB**

Make sure MongoDB is running and update the `MONGO_URI` in `api/.env`.

5. **Configure Email**

Update email settings in `api/.env` for SMTP configuration.

## 📁 Project Structure

```
advancia-management-system/
├── api/                      # Backend API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── jobs/            # Cron jobs (expiry checker)
│   │   ├── middleware/      # Auth & validation
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (email service)
│   │   ├── types/           # TypeScript types
│   │   └── index.ts         # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── client/                   # Frontend application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app component
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── README.md                 # This file
```

## 🔧 Configuration

### API Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/advancia
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@advancia.com

EXECUTIVE_EMAILS=exec1@company.com,exec2@company.com
CRON_SCHEDULE=0 9 * * *
```

### Client Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client (admin only)

### Licenses (Agent & Admin only)
- `GET /api/licenses` - List all licenses
- `POST /api/licenses` - Create license
- `GET /api/licenses/:id` - Get license details
- `PUT /api/licenses/:id` - Update license
- `DELETE /api/licenses/:id` - Delete license (admin only)

### Contracts (Consultant & Admin only)
- `GET /api/contracts` - List all contracts
- `POST /api/contracts` - Create contract
- `GET /api/contracts/:id` - Get contract details
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract (admin only)

### Catalogues
- `GET /api/catalog/license-offers` - Offres actives (Agent et Admin)
- `POST /api/catalog/license-offers` - Créer une offre (Admin)
- `GET /api/catalog/contract-types` - Types actifs (Consultant et Admin)
- `POST /api/catalog/contract-types` - Créer un type (Admin)

## 🧪 Testing

### Build Verification

Run the test script to verify both API and Client build successfully:

```bash
./test.sh
```

### Database Seeding

To populate the database with test data:

```bash
cd api
npm run seed
```

This creates:
- 3 test users (agent, consultant, admin) with password: `password123`
- 8 shared clients
- 7 licence offers and 7 licences covering every urgency state
- 7 contract types and 7 contracts with priced services

### Test Credentials

After seeding:
- **Agent**: agent@advancia.com / password123
- **Consultant**: consultant@advancia.com / password123
- **Admin**: admin@advancia.com / password123

### Manual Expiry Check

To manually test the expiry checker (without waiting for the cron schedule):

```bash
cd api
npm run test:expiry
```

This checks all licenses and contracts. Without SMTP credentials it creates clearly labelled simulated notification-history entries.

## 🔐 Security

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Protected API endpoints
- CORS configuration
- Rate limiting:
  - Authentication endpoints: 5 requests per 15 minutes
  - Write operations: 30 requests per 15 minutes
  - General API: 100 requests per 15 minutes

## 📖 Documentation

For detailed documentation, see:
- [API Documentation](./api/README.md)
- [Client Documentation](./client/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

ISC

## 👨‍💻 Author

Hamza Aissa

## 🙏 Acknowledgments

Built with:
- Node.js & Express
- React & TypeScript
- MongoDB & Mongoose
- Material-UI
- JWT Authentication
- Nodemailer
- node-cron
