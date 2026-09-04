import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Registrar nuevo usuario',
      description: 'Crea un nuevo usuario y retorna token JWT. No requiere autenticación.',
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50, description: 'Nombre de usuario único' },
          email: { type: 'string', format: 'email', description: 'Correo electrónico único' },
          password: { type: 'string', minLength: 6, description: 'Contraseña (mínimo 6 caracteres)' },
          bio: { type: 'string', description: 'Biografía opcional' },
          avatar_url: { type: 'string', description: 'URL del avatar' }
        }
      },
      response: {
        201: {
          description: 'Usuario creado exitosamente',
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                username: { type: 'string' },
                email: { type: 'string' },
                bio: { type: 'string' },
                avatar_url: { type: 'string' }
              }
            }
          }
        },
        409: { description: 'Email o username ya registrado', type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, AuthController.register);

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      description: 'Autentica al usuario y retorna token JWT. No requiere autenticación.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                username: { type: 'string' },
                email: { type: 'string' },
                bio: { type: 'string' },
                avatar_url: { type: 'string' }
              }
            }
          }
        },
        401: { description: 'Credenciales inválidas', type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, AuthController.login);
}
