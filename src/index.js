import 'dotenv/config';
import Fastify from 'fastify';
import fp from 'fastify-plugin';
import serviceApp from './app.js';
import { logger } from './utils/index.js';

const app = Fastify({ loggerInstance: logger });

const bootstrap = async () => {
  app.register(fp(serviceApp));

  await app.ready();

  try {
    await app.listen({ port: +(process.env.PORT ?? 3000) });
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()