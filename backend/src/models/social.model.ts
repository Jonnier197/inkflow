
import { AppDataSource } from '../config/database.js';
import { CommentEntity }  from '../entities/Comment.entity.js';
import { LikeEntity }     from '../entities/Like.entity.js';
import { FollowerEntity } from '../entities/Follower.entity.js';
import { UserEntity }     from '../entities/User.entity.js';

export const CommentModel = {
  findByPost: (postId: number) =>
    AppDataSource.getRepository(CommentEntity)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .where('c.postId = :postId', { postId })
      .orderBy('c.createdAt', 'ASC')
      .getMany(),

  async create(data: { postId: number; userId: number; content: string }) {
    const repo = AppDataSource.getRepository(CommentEntity);
    const saved = await repo.save(repo.create(data));
    return repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .where('c.id = :id', { id: saved.id })
      .getOne() as Promise<CommentEntity>;
  },

  async update(id: number, userId: number, content: string) {
    const repo = AppDataSource.getRepository(CommentEntity);
    const result = await repo.update({ id, userId }, { content });
    if ((result.affected ?? 0) === 0) return null;
    return repo.findOne({ where: { id } });
  },

  async delete(id: number, userId: number) {
    const result = await AppDataSource.getRepository(CommentEntity).delete({ id, userId });
    return (result.affected ?? 0) > 0;
  },
};

export const LikeModel = {
  async toggle(userId: number, postId: number) {
    const repo = AppDataSource.getRepository(LikeEntity);
    const existing = await repo.findOne({ where: { userId, postId } });
    if (existing) { await repo.remove(existing); return { liked: false }; }
    await repo.save(repo.create({ userId, postId }));
    return { liked: true };
  },
};

export const FollowerModel = {
  async toggle(followerId: number, followingId: number) {
    const repo = AppDataSource.getRepository(FollowerEntity);
    const existing = await repo.findOne({ where: { followerId, followingId } });
    if (existing) { await repo.remove(existing); return { following: false }; }
    await repo.save(repo.create({ followerId, followingId }));
    return { following: true };
  },

  getFollowers: (userId: number) =>
    AppDataSource.getRepository(UserEntity)
      .createQueryBuilder('u')
      .innerJoin('followers', 'f', 'f.follower_id = u.id AND f.following_id = :userId', { userId })
      .select(['u.id', 'u.username', 'u.avatarUrl', 'u.bio'])
      .getMany(),

  getFollowing: (userId: number) =>
    AppDataSource.getRepository(UserEntity)
      .createQueryBuilder('u')
      .innerJoin('followers', 'f', 'f.following_id = u.id AND f.follower_id = :userId', { userId })
      .select(['u.id', 'u.username', 'u.avatarUrl', 'u.bio'])
      .getMany(),

  async isFollowing(followerId: number, followingId: number) {
    const count = await AppDataSource.getRepository(FollowerEntity)
      .count({ where: { followerId, followingId } });
    return count > 0;
  },
};
