# Advancia Management System

A comprehensive Clients, Licenses, and Contracts Management System with automated expiry notifications and role-based access control.

## 📋 Overview

This system helps companies manage their clients, licenses, and contracts with automatic expiry tracking and email notifications. It features role-based access control with four distinct user roles, each with specific responsibilities and access levels.

### Key Features

- ✅ **Client Management**: Centralized database of all clients
- 📜 **License Management**: Agent-controlled license assignment and tracking
- 📄 **Contract Management**: Consultant-managed contract lifecycle
- 🔔 **Automated Notifications**: Daily cron job checking for upcoming expirations
- 👥 **Role-Based Access**: Four distinct user roles with specific permissions
- 📧 **Email Alerts**: Escalating notification system (15, 10, 6 days before expiry)
- 🔒 **Secure Authentication**: JWT-based authentication system

## 🏗️ Architecture

The project consists of two main components:

- **API** (`/api`): Node.js + Express + MongoDB backend
- **Client** (`/client`): React + TypeScript frontend

## 👥 User Roles

### 1. Agent
- **Responsibility**: Manages client licenses only
- **Permissions**:
  - Assign (affecter) licenses to clients
  - Renew or modify existing licenses
  - Track upcoming license expirations
- **Access**: NO access to contracts

### 2. Consultant
- **Responsibility**: Manages client contracts only
- **Permissions**:
  - Create and manage contracts for clients
  - Renew, modify, or terminate contracts
  - Track contract expiration dates
- **Access**: NO access to licenses

### 3. Admin
- **Responsibility**: Supervises both agents and consultants
- **Permissions**:
  - View all activities and reports
  - Monitor system operations and user actions
  - Delete any resource
- **Access**: Full read access, limited write access

### 4. Executive
- **Responsibility**: High-level observer
- **Permissions**:
  - Receives critical expiry notifications only
  - Email addresses are hardcoded in configuration
- **Access**: NO direct system access (email notifications only)

## 🔔 Notification System

### Expiry Check Schedule

A daily cron job (default: 9:00 AM) checks all active licenses and contracts.

### Notification Rules

| Days Before Expiry | Recipients | Frequency | Description |
|-------------------|-----------|-----------|-------------|
| **15 days** | Consultant (contracts) or Agent (licenses) | Daily | Internal reminder to responsible party |
| **10 days** | Consultant/Agent + Admin | Daily | Escalated warning |
| **6 days** | Consultant/Agent + Admin + Executives | Daily | Critical stage notification |

### Important Notes

⚠️ **The system does NOT notify clients directly.** All notifications are internal only, sent to:
- Agents (for licenses)
- Consultants (for contracts)
- Admins (escalated notifications)
- Executives (critical notifications)

## 🚀 Quick Start

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

## 🧪 Testing

```bash
# API tests
cd api
npm test

# Client tests
cd client
npm test
```

## 🔐 Security

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Protected API endpoints
- CORS configuration

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
