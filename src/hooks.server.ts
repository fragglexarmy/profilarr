import { config } from '$config';
import { logStartup } from './utils/logger/startup.ts';

// Initialize configuration on server startup
await config.init();

// Log startup banner
await logStartup();
