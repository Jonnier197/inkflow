import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

// initDatabase importa database.ts que importa reflect-metadata primero
import { initDatabase } from './config/database.js';

import { authRoutes }  from './routes/auth.routes.js';
import { userRoutes }  from './routes/user.routes.js';
import { postRoutes }  from './routes/post.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
  ajv: { customOptions: { removeAdditional: false, allowUnionTypes: true, strict: false } }
});

fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  if (!body || (body as string).trim() === '') { done(null, {}); return; }
  try { done(null, JSON.parse(body as string)); }
  catch (err) { done(err as Error, undefined); }
});

await fastify.register(cors, {
  origin: true, credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  sign: { expiresIn: '7d' }
});
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: { title: 'Social Blog API', description: 'Red Social Inkflow', version: '1.0.0' },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    tags: [
      { name: 'Auth' }, { name: 'Users' }, { name: 'Posts' },
      { name: 'Comments' }, { name: 'Admin' }
    ]
  }
});
await fastify.register(swaggerUi, {
  routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: true },
  staticCSP: true, transformSpecificationClone: true
});

await fastify.register(authRoutes,  { prefix: '/auth' });
await fastify.register(userRoutes,  { prefix: '/users' });
await fastify.register(postRoutes,  { prefix: '/posts' });
await fastify.register(adminRoutes, { prefix: '/admin' });

fastify.get('/health', { schema: { tags: ['Health'] } }, async () =>
  ({ status: 'ok', timestamp: new Date().toISOString() })
);

await initDatabase();

const port = parseInt(process.env.PORT || '3000');
try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`\n🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/docs\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
