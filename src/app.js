import path from 'path';
import AutoLoad from '@fastify/autoload';
import RateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function (app, opts) {
  app.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({ prefix: "/api/v1/" }, opts)
  })

  app.register(RateLimit, {
    max: 2,
    timeWindow: '1 minute'
  })
}