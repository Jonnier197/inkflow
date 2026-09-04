import { FastifyRequest, FastifyReply } from 'fastify';
import { PostModel } from '../models/post.model.js';
import { CommentModel, LikeModel } from '../models/social.model.js';

interface JWT { id: number; username: string; email: string; }

function mapPost(p: Record<string, unknown>) {
  return {
    id: p.id, user_id: p.userId, title: p.title, content: p.content,
    image_url: p.imageUrl, tags: p.tags, published: p.published,
    created_at: p.createdAt, updated_at: p.updatedAt,
    username: (p.user as Record<string, unknown>)?.username ?? '',
    avatar_url: (p.user as Record<string, unknown>)?.avatarUrl ?? null,
    likes_count: p.likesCount ?? 0,
    comments_count: p.commentsCount ?? 0,
    user_has_liked: p.userHasLiked ?? false,
  };
}

function mapComment(c: Record<string, unknown>) {
  return {
    id: c.id, post_id: c.postId, user_id: c.userId, content: c.content,
    created_at: c.createdAt, updated_at: c.updatedAt,
    username: (c.user as Record<string, unknown>)?.username ?? '',
    avatar_url: (c.user as Record<string, unknown>)?.avatarUrl ?? null,
  };
}

export const PostController = {
  async getFeed(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { page, limit } = request.query as { page?: string; limit?: string };
    const posts = await PostModel.feed(id, parseInt(page || '1'), parseInt(limit || '10'));
    return reply.send(posts.map(p => mapPost(p as unknown as Record<string, unknown>)));
  },

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { page, limit } = request.query as { page?: string; limit?: string };
    const posts = await PostModel.findAll(parseInt(page || '1'), parseInt(limit || '10'), id);
    return reply.send(posts.map(p => mapPost(p as unknown as Record<string, unknown>)));
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: postId } = request.params as { id: string };
    const post = await PostModel.findById(parseInt(postId), id);
    if (!post) return reply.code(404).send({ error: 'Post no encontrado' });
    return reply.send(mapPost(post as unknown as Record<string, unknown>));
  },

  async getByUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const posts = await PostModel.findByUser(parseInt(id));
    return reply.send(posts.map(p => mapPost(p as unknown as Record<string, unknown>)));
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { title, content, image_url, tags, published } = request.body as {
      title: string; content: string; image_url?: string; tags?: string[]; published?: boolean;
    };
    const post = await PostModel.create({ userId: id, title, content, imageUrl: image_url, tags, published });
    return reply.code(201).send(mapPost(post as unknown as Record<string, unknown>));
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: postId } = request.params as { id: string };
    const body = request.body as { title?: string; content?: string; image_url?: string | null; tags?: string[]; published?: boolean; removeImage?: boolean };
    const post = await PostModel.update(parseInt(postId), id, {
      title: body.title, content: body.content,
      imageUrl: body.image_url, tags: body.tags,
      published: body.published, removeImage: body.removeImage,
    });
    if (!post) return reply.code(404).send({ error: 'Post no encontrado o sin permiso' });
    return reply.send(mapPost(post as unknown as Record<string, unknown>));
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: postId } = request.params as { id: string };
    const deleted = await PostModel.delete(parseInt(postId), id);
    if (!deleted) return reply.code(404).send({ error: 'Post no encontrado o sin permiso' });
    return reply.code(204).send();
  },

  async toggleLike(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: postId } = request.params as { id: string };
    const result = await LikeModel.toggle(id, parseInt(postId));
    return reply.send(result);
  },

  async getComments(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const comments = await CommentModel.findByPost(parseInt(id));
    return reply.send(comments.map(c => mapComment(c as unknown as Record<string, unknown>)));
  },

  async addComment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { id: postId } = request.params as { id: string };
    const { content } = request.body as { content: string };
    const comment = await CommentModel.create({ postId: parseInt(postId), userId: id, content });
    return reply.code(201).send(mapComment(comment as unknown as Record<string, unknown>));
  },

  async updateComment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { commentId } = request.params as { commentId: string };
    const { content } = request.body as { content: string };
    const comment = await CommentModel.update(parseInt(commentId), id, content);
    if (!comment) return reply.code(404).send({ error: 'Comentario no encontrado o sin permiso' });
    return reply.send(mapComment(comment as unknown as Record<string, unknown>));
  },

  async deleteComment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.user as JWT;
    const { commentId } = request.params as { commentId: string };
    const deleted = await CommentModel.delete(parseInt(commentId), id);
    if (!deleted) return reply.code(404).send({ error: 'Comentario no encontrado o sin permiso' });
    return reply.code(204).send();
  },
};
