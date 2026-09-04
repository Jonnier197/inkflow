import { FastifyRequest, FastifyReply } from 'fastify';
import { UserModel } from '../models/user.model.js';
import { AppDataSource } from '../config/database.js';
import { PostEntity } from '../entities/Post.entity.js';
import { UserEntity } from '../entities/User.entity.js';

export const AdminController = {

  // Una sola query con subconsultas correlacionadas para todos los conteos
  async getStats(_request: FastifyRequest, reply: FastifyReply) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // 1. Todos los totales en una sola query con subconsultas
    const [totalsRow] = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users    WHERE role     != 'admin')  AS users,
        (SELECT COUNT(*)::int FROM posts)                               AS posts,
        (SELECT COUNT(*)::int FROM comments)                            AS comments,
        (SELECT COUNT(*)::int FROM likes)                               AS likes,
        (SELECT COUNT(*)::int FROM users    WHERE is_banned = true)     AS banned,
        (SELECT COUNT(*)::int FROM users
           WHERE created_at >= $1 AND role != 'admin')                  AS new_users,
        (SELECT COUNT(*)::int FROM posts
           WHERE created_at >= $1)                                      AS new_posts
    `, [sevenDaysAgo]);

    // 2. Top 5 posts con joins — QueryBuilder para aprovechar TypeORM
    const topPosts = await AppDataSource
      .getRepository(PostEntity)
      .createQueryBuilder('p')
      .innerJoin('p.user', 'u')
      .addSelect('u.username', 'username')
      .loadRelationCountAndMap('p.likesCount',    'p.likesList')
      .loadRelationCountAndMap('p.commentsCount', 'p.comments')
      .orderBy('p.createdAt', 'DESC')
      .take(5)
      .getMany();

    // 3. Actividad últimos 14 días — agrupada por día
    const activity = await AppDataSource
      .getRepository(PostEntity)
      .createQueryBuilder('p')
      .select("DATE(p.created_at)", 'date')
      .addSelect('COUNT(*)', 'posts')
      .where('p.created_at >= :from', { from: fourteenDaysAgo })
      .groupBy('DATE(p.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return reply.send({
      totals: {
        users:    totalsRow.users,
        posts:    totalsRow.posts,
        comments: totalsRow.comments,
        likes:    totalsRow.likes,
        banned:   totalsRow.banned,
      },
      weekly: {
        new_users: totalsRow.new_users,
        new_posts: totalsRow.new_posts,
      },
      top_posts: topPosts.map(p => ({
        id:             p.id,
        title:          p.title,
        username:       p.user?.username ?? '',
        likes_count:    (p as unknown as Record<string,number>).likesCount    ?? 0,
        comments_count: (p as unknown as Record<string,number>).commentsCount ?? 0,
      })),
      activity: activity.map(a => ({ date: a.date, posts: parseInt(a.posts, 10) })),
    });
  },

  async getAllUsers(_request: FastifyRequest, reply: FastifyReply) {
    const users = await UserModel.findAllAdmin();
    return reply.send(users.map(u => ({
      id:              u.id,
      username:        u.username,
      email:           u.email,
      bio:             u.bio,
      avatar_url:      u.avatarUrl,
      role:            u.role,
      is_banned:       u.isBanned,
      created_at:      u.createdAt,
      posts_count:     (u as unknown as Record<string,number>).postsCount     ?? 0,
      followers_count: (u as unknown as Record<string,number>).followersCount ?? 0,
      following_count: (u as unknown as Record<string,number>).followingCount ?? 0,
    })));
  },

  async toggleBan(request: FastifyRequest, reply: FastifyReply) {
    const { id }     = request.params as { id: string };
    const { banned } = request.body   as { banned: boolean };
    const admin      = request.user   as { id: number };
    const targetId   = parseInt(id);

    if (targetId === admin.id)
      return reply.code(400).send({ error: 'No puedes banearte a ti mismo' });

    const target = await UserModel.findById(targetId);
    if (!target)               return reply.code(404).send({ error: 'Usuario no encontrado' });
    if (target.role === 'admin') return reply.code(400).send({ error: 'No se puede banear a otro administrador' });

    const updated = await UserModel.setBanned(targetId, banned);
    return reply.send({
      message: banned
        ? `Usuario @${updated?.username} suspendido`
        : `Usuario @${updated?.username} reactivado`,
      user: updated,
    });
  },

  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    const { id }   = request.params as { id: string };
    const admin    = request.user   as { id: number };
    const targetId = parseInt(id);

    if (targetId === admin.id)
      return reply.code(400).send({ error: 'No puedes eliminarte a ti mismo' });

    const target = await UserModel.findById(targetId);
    if (!target)                 return reply.code(404).send({ error: 'Usuario no encontrado' });
    if (target.role === 'admin') return reply.code(400).send({ error: 'No se puede eliminar a otro administrador' });

    await UserModel.delete(targetId);
    return reply.code(204).send();
  },

  async deletePost(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await AppDataSource
      .getRepository(PostEntity)
      .delete(parseInt(id));

    if ((result.affected ?? 0) === 0)
      return reply.code(404).send({ error: 'Post no encontrado' });

    return reply.code(204).send();
  },

  // Eliminar cualquier usuario por username (utilidad admin extra)
  async deleteUserByUsername(request: FastifyRequest, reply: FastifyReply) {
    const { username } = request.params as { username: string };
    const user = await AppDataSource
      .getRepository(UserEntity)
      .findOne({ where: { username } });

    if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });
    await AppDataSource.getRepository(UserEntity).remove(user);
    return reply.code(204).send();
  },
};
