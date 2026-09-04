import { FastifyInstance } from 'fastify';
import { PostController } from '../controllers/post.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const sec = { security: [{ bearerAuth: [] }] };
const pages = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', default: 1 },
      limit: { type: 'integer', default: 10 }
    }
  }
};

export async function postRoutes(fastify: FastifyInstance) {
  fastify.get('/feed', { preHandler: [authenticate], schema: { ...sec, ...pages, tags: ['Posts'], summary: 'Feed personalizado' } }, PostController.getFeed);
  fastify.get('/', { preHandler: [authenticate], schema: { ...sec, ...pages, tags: ['Posts'], summary: 'Todos los posts' } }, PostController.getAll);

  fastify.post('/', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Posts'], summary: 'Crear post',
      body: {
        type: 'object', required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          content: { type: 'string', minLength: 1 },
          image_url: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          published: { type: 'boolean', default: true }
        }
      }
    }
  }, PostController.create);

  // Rutas de comentarios con prefijo fijo ANTES de /:id
  fastify.put('/comments/:commentId', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Comments'], summary: 'Actualizar comentario',
      params: { type: 'object', properties: { commentId: { type: 'string' } } },
      body: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } }
    }
  }, PostController.updateComment);

  fastify.delete('/comments/:commentId', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Comments'], summary: 'Eliminar comentario',
      params: { type: 'object', properties: { commentId: { type: 'string' } } }
    }
  }, PostController.deleteComment);

  fastify.get('/user/:id', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Posts'], summary: 'Posts de un usuario', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, PostController.getByUser);

  // Rutas dinámicas /:id al final
  fastify.get('/:id', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Posts'], summary: 'Post por ID', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, PostController.getById);

  fastify.put('/:id', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Posts'], summary: 'Actualizar post',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' }, content: { type: 'string' },
          image_url: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          published: { type: 'boolean' }
        }
      }
    }
  }, PostController.update);

  fastify.delete('/:id', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Posts'], summary: 'Eliminar post', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, PostController.delete);

  // LIKE — sin schema de body para que Fastify no active validación de content-type
  fastify.post('/:id/like', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Posts'], summary: 'Like/unlike post', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, PostController.toggleLike);

  fastify.get('/:id/comments', {
    preHandler: [authenticate],
    schema: { ...sec, tags: ['Comments'], summary: 'Comentarios del post', params: { type: 'object', properties: { id: { type: 'string' } } } }
  }, PostController.getComments);

  fastify.post('/:id/comments', {
    preHandler: [authenticate],
    schema: {
      ...sec, tags: ['Comments'], summary: 'Agregar comentario',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['content'], properties: { content: { type: 'string', minLength: 1 } } }
    }
  }, PostController.addComment);
}
