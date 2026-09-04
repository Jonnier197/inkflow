import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Token inválido o expirado' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: number; role: string };
    if (payload.role !== 'admin') {
      reply.code(403).send({ error: 'Acceso denegado: se requiere rol de administrador' });
    }
  } catch {
    reply.code(401).send({ error: 'Token inválido o expirado' });
  }
}
