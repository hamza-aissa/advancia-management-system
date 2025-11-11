# Advancia Management System - Client

Frontend application for the Advancia Management System.

## Features

- **User Authentication**: Secure login with JWT tokens
- **Role-Based UI**: Different interfaces for Agents, Consultants, Admins
- **Responsive Design**: Built with Material-UI for modern, responsive UI
- **TypeScript**: Full type safety throughout the application

## Tech Stack

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API

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
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Usage

### Development Mode
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## User Roles

### Agent
- Dashboard showing license management features
- Can view and manage licenses
- Receives license expiry notifications

### Consultant
- Dashboard showing contract management features
- Can view and manage contracts
- Receives contract expiry notifications

### Admin
- Full system overview dashboard
- Can monitor all licenses and contracts
- Receives escalated expiry notifications
- Can manage users and view reports

## License

ISC
