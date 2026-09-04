import { FastifyRequest, FastifyReply } from 'fastify';
import { UserModel } from '../models/user.model.js';
import { FollowerModel } from '../models/social.model.js';

interface JWT { id: number; username: string; email: string; }

function toPublic(u: Record<string, unknown>) {
  return {
    id: u.id, username: u.username, email: u.email,
    bio: u.bio, avatar_url: u.avatarUrl,
    role: u.role, is_banned: u.isBanned, created_at: u.createdAt,
    followers_count: u.followersCount ?? 0,
    following_count: u.followingCount ?? 0,
    posts_count: u.postsCount ?? 0,
  };
}

export const UserController = {
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const profile = await UserModel.getProfile(id);
    if (!profile) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return reply.send(toPublic(profile as unknown as Record<string, unknown>));
  },

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const profile = await UserModel.getProfile(parseInt(id));
    if (!profile) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return reply.send(toPublic(profile as unknown as Record<string, unknown>));
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { username, bio, avatar_url } = request.body as { username?: string; bio?: string; avatar_url?: string };
    if (username) {
      const ex = await UserModel.findByUsername(username);
      if (ex && ex.id !== id) return reply.code(409).send({ error: 'El username ya está en uso' });
    }
    const updated = await UserModel.update(id, { username, bio, avatarUrl: avatar_url });
    if (!updated) return reply.code(400).send({ error: 'No se pudo actualizar' });
    return reply.send({
      id: updated.id, username: updated.username, email: updated.email,
      bio: updated.bio, avatar_url: updated.avatarUrl, role: updated.role, is_banned: updated.isBanned,
    });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    await UserModel.delete(id);
    return reply.code(204).send();
  },

  async search(request: FastifyRequest, reply: FastifyReply) {
    const { q } = request.query as { q: string };
    if (!q) return reply.code(400).send({ error: 'Parámetro q requerido' });
    const users = await UserModel.search(q);
    return reply.send(users.map(u => ({
      id: u.id, username: u.username, email: u.email,
      bio: u.bio, avatar_url: u.avatarUrl, role: u.role, is_banned: u.isBanned, created_at: u.createdAt,
    })));
  },

  async getFollowers(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const list = await FollowerModel.getFollowers(parseInt(id));
    return reply.send(list.map(u => ({ id: u.id, username: u.username, avatar_url: u.avatarUrl, bio: u.bio })));
  },

  async getFollowing(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const list = await FollowerModel.getFollowing(parseInt(id));
    return reply.send(list.map(u => ({ id: u.id, username: u.username, avatar_url: u.avatarUrl, bio: u.bio })));
  },

  async toggleFollow(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: targetId } = request.params as { id: string };
    if (parseInt(targetId) === id) return reply.code(400).send({ error: 'No puedes seguirte a ti mismo' });
    const result = await FollowerModel.toggle(id, parseInt(targetId));
    return reply.send(result);
  },
};
