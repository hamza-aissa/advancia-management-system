import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/advancia',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    },
    from: process.env.EMAIL_FROM || 'noreply@advancia.com'
  },
  
  // Executive emails (hardcoded as per requirements)
  executiveEmails: process.env.EXECUTIVE_EMAILS 
    ? process.env.EXECUTIVE_EMAILS.split(',').map(e => e.trim())
    : ['executive1@advancia.com', 'executive2@advancia.com'],
  
  // Cron schedule (daily at 9 AM)
  cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *',
  
  // Notification thresholds (days before expiry)
  notificationThresholds: [15, 10, 6]
};
