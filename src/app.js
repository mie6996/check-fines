import path from 'path';
import AutoLoad from '@fastify/autoload';
import RateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function (app, opts) {
  app.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({ prefix: "/api/v1/" }, opts)
  })

  app.register(RateLimit, {
    max: config.apiRateLimit,
    timeWindow: '1 minute'
  })
}