# Advancia Management System - API

Backend API for the Advancia Management System - a comprehensive platform for managing clients, licenses, and contracts with automated expiry notifications.

## Features

- **Role-Based Access Control**
  - Agent: Manages licenses only
  - Consultant: Manages contracts only
  - Admin: Supervises all activities
  - Executive: Receives critical expiry notifications

- **Automated Expiry Notifications**
  - Daily cron job checks for upcoming expirations
  - Notifications at 15, 10, and 6 days before expiry
  - Escalating recipient list based on urgency

- **RESTful API**
  - Authentication with JWT
  - CRUD operations for clients, licenses, and contracts
  - Protected routes with role-based authorization

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Scheduling**: node-cron
- **Email**: Nodemailer

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - Database connection (MongoDB)
   - JWT secret
   - Email settings (SMTP)
   - Executive email addresses

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (authenticated)

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client (admin only)

### Licenses (Agent & Admin only)
- `GET /api/licenses` - List all licenses
- `GET /api/licenses/:id` - Get license by ID
- `POST /api/licenses` - Create new license
- `PUT /api/licenses/:id` - Update license
- `DELETE /api/licenses/:id` - Delete license (admin only)

### Contracts (Consultant & Admin only)
- `GET /api/contracts` - List all contracts
- `GET /api/contracts/:id` - Get contract by ID
- `POST /api/contracts` - Create new contract
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract (admin only)

## Notification System

### Expiry Check Logic

The system runs a daily cron job that:
1. Checks all active licenses and contracts
2. Calculates days until expiration
3. Sends notifications based on the following rules:

| Days Before Expiry | Recipients | Frequency |
|-------------------|-----------|-----------|
| 15 days | Agent/Consultant (responsible party) | Daily |
| 10 days | Agent/Consultant + Admin | Daily |
| 6 days | Agent/Consultant + Admin + Executives | Daily |

### Cron Schedule

Default schedule: Daily at 9:00 AM (`0 9 * * *`)

Customize by setting `CRON_SCHEDULE` in `.env` file.

## User Roles

### Agent
- Can create, view, and modify licenses
- Cannot access contracts
- Receives license expiry notifications

### Consultant
- Can create, view, and modify contracts
- Cannot access licenses
- Receives contract expiry notifications

### Admin
- Can view all licenses and contracts
- Receives escalated notifications (10 and 6 days before expiry)
- Can delete any resource

### Executive
- No direct system access
- Receives critical notifications (6 days before expiry)
- Email addresses are configured in environment variables

## Email Configuration

Configure SMTP settings in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@advancia.com
```

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based authorization middleware
- Protected routes require valid authentication

## Development

### Project Structure
```
api/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── jobs/           # Cron jobs
│   ├── middleware/     # Auth & validation middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Application entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## License

ISC
