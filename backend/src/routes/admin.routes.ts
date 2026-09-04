import { FastifyInstance } from 'fastify';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const sec = { security: [{ bearerAuth: [] }] };

export async function adminRoutes(fastify: FastifyInstance) {
  // Todas las rutas aquí requieren rol admin
  fastify.get('/stats', {
    preHandler: [requireAdmin],
    schema: { ...sec, tags: ['Admin'], summary: 'Estadísticas globales de la plataforma' }
  }, AdminController.getStats);

  fastify.get('/users', {
    preHandler: [requireAdmin],
    schema: { ...sec, tags: ['Admin'], summary: 'Listar todos los usuarios' }
  }, AdminController.getAllUsers);

  fastify.patch('/users/:id/ban', {
    preHandler: [requireAdmin],
    schema: {
      ...sec, tags: ['Admin'], summary: 'Banear o desbanear usuario',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object', required: ['banned'],
        properties: { banned: { type: 'boolean' } }
      }
    }
  }, AdminController.toggleBan);

  fastify.delete('/users/:id', {
    preHandler: [requireAdmin],
    schema: {
      ...sec, tags: ['Admin'], summary: 'Eliminar usuario permanentemente',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, AdminController.deleteUser);

  fastify.delete('/posts/:id', {
    preHandler: [requireAdmin],
    schema: {
      ...sec, tags: ['Admin'], summary: 'Eliminar cualquier post',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    }
  }, AdminController.deletePost);
}
