import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import licenseRoutes from './routes/licenses';
import contractRoutes from './routes/contracts';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import catalogRoutes from './routes/catalogs';
import { errorHandler, notFoundHandler } from './utils/errors';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api/', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/licenses', licenseRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/catalog', catalogRoutes);

  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  const staticDir = process.env.STATIC_DIR;
  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

export const app = createApp();
