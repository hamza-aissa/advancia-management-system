import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case UserRole.AGENT:
        return 'Agent';
      case UserRole.CONSULTANT:
        return 'Consultant';
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.EXECUTIVE:
        return 'Executive';
      default:
        return 'User';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.AGENT:
        return 'You can manage client licenses, assign new licenses, and track license expirations.';
      case UserRole.CONSULTANT:
        return 'You can manage client contracts, create new contracts, and monitor contract renewals.';
      case UserRole.ADMIN:
        return 'You have full system access to monitor all licenses, contracts, and user activities.';
      case UserRole.EXECUTIVE:
        return 'You receive critical notifications about upcoming expirations.';
      default:
        return '';
    }
  };

  const getAvailableFeatures = (role: UserRole) => {
    switch (role) {
      case UserRole.AGENT:
        return [
          { title: 'Manage Licenses', icon: <AssignmentIcon />, description: 'Create, update, and track licenses' },
          { title: 'View Clients', icon: <PeopleIcon />, description: 'Access client information' }
        ];
      case UserRole.CONSULTANT:
        return [
          { title: 'Manage Contracts', icon: <DescriptionIcon />, description: 'Create, update, and track contracts' },
          { title: 'View Clients', icon: <PeopleIcon />, description: 'Access client information' }
        ];
      case UserRole.ADMIN:
        return [
          { title: 'Monitor All', icon: <DashboardIcon />, description: 'View all licenses and contracts' },
          { title: 'Manage Users', icon: <PeopleIcon />, description: 'Manage system users' },
          { title: 'View Reports', icon: <AssignmentIcon />, description: 'Access system reports' }
        ];
      default:
        return [];
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button variant="outlined" color="error" onClick={logout}>
          Logout
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {user?.firstName} {user?.lastName}!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Role: <strong>{user && getRoleName(user.role)}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user && getRoleDescription(user.role)}
        </Typography>
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Available Features
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 3
        }}
      >
        {user && getAvailableFeatures(user.role).map((feature, index) => (
          <Card key={index}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="div">
                  {feature.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          🔔 Notification System
        </Typography>
        <Typography variant="body2">
          The system automatically monitors expiring licenses and contracts. You will receive email notifications:
        </Typography>
        <Box component="ul" sx={{ mt: 1 }}>
          <li>
            <Typography variant="body2">
              <strong>15 days before expiry:</strong> Notification to responsible party (Agent/Consultant)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>10 days before expiry:</strong> Escalated to Administrators
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>6 days before expiry:</strong> Critical alert including Executives
            </Typography>
          </li>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;
