import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model.js';

export const AuthController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const { username, email, password, bio, avatar_url } = request.body as {
      username: string; email: string; password: string; bio?: string; avatar_url?: string;
    };
    if (await UserModel.findByEmail(email))
      return reply.code(409).send({ error: 'El email ya está registrado' });
    if (await UserModel.findByUsername(username))
      return reply.code(409).send({ error: 'El username ya está en uso' });

    const passwordHash = await bcrypt.hash(password, 12);
    const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
    const user = await UserModel.create({ username, email, passwordHash, bio, avatarUrl: avatar_url, role });

    const token = await reply.jwtSign({ id: user.id, username: user.username, email: user.email, role: user.role });
    return reply.code(201).send({
      token,
      user: { id: user.id, username: user.username, email: user.email, bio: user.bio, avatar_url: user.avatarUrl, role: user.role, is_banned: user.isBanned },
    });
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as { email: string; password: string };
    const user = await UserModel.findByEmail(email);
    if (!user) return reply.code(401).send({ error: 'Credenciales inválidas' });
    if (user.isBanned) return reply.code(403).send({ error: 'Tu cuenta ha sido suspendida.' });
    if (!await bcrypt.compare(password, user.passwordHash))
      return reply.code(401).send({ error: 'Credenciales inválidas' });

    const token = await reply.jwtSign({ id: user.id, username: user.username, email: user.email, role: user.role });
    return reply.send({
      token,
      user: { id: user.id, username: user.username, email: user.email, bio: user.bio, avatar_url: user.avatarUrl, role: user.role, is_banned: user.isBanned },
    });
  },
};
