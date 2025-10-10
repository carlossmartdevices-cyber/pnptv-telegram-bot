import http from 'http';
import app from './app.js';
import { logger } from './config/logger.js';
import { primeFxCache } from './services/fxService.js';
import { launchBot } from './bot/index.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, async () => {
  logger.info(`Server listening on port ${port}`);
  await primeFxCache();
  launchBot();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
