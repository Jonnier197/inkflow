import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const sec = { security: [{ bearerAuth: [] }] };

export async function userRoutes(fastify: FastifyInstance) {
  // Rutas estáticas primero
  fastify.get('/me', { preHandler: [authenticate], schema: { ...sec, tags: ['Users'], summary: 'Mi perfil' } }, UserController.getMe);

  fastify.put('/me', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Users'], summary: 'Actualizar perfil',
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3 },
          bio: { type: 'string' },
          avatar_url: { type: 'string', nullable: true }
        }
      }
    }
  }, UserController.update);

  fastify.delete('/me', { preHandler: [authenticate], schema: { ...sec, tags: ['Users'], summary: 'Eliminar cuenta' } }, UserController.delete);

  fastify.get('/search', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Users'], summary: 'Buscar usuarios',
      querystring: { type: 'object', required: ['q'], properties: { q: { type: 'string' } } }
    }
  }, UserController.search);

  // Rutas dinámicas /:id al final
  fastify.get('/:id', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Users'], summary: 'Perfil de usuario', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, UserController.getProfile);

  // FOLLOW — sin schema de body para que Fastify no active validación de content-type
  fastify.post('/:id/follow', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Users'], summary: 'Seguir/dejar de seguir', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, UserController.toggleFollow);

  fastify.get('/:id/followers', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Users'], summary: 'Seguidores', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, UserController.getFollowers);

  fastify.get('/:id/following', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Users'], summary: 'Siguiendo', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, UserController.getFollowing);
}
