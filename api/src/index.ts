import { connectDB } from './config/database';
import { config } from './config';
import { expiryCheckerJob } from './jobs/expiryChecker';
import { app } from './app';
import { ensureDefaultCatalogs } from './services/catalogBootstrap';

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    await ensureDefaultCatalogs();

    // Start cron job
    expiryCheckerJob.start();

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔔 Rappels : ${config.cronSchedule} (${config.cronTimezone})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
