import { AppDataSource } from '../config/database.js';
import { PostEntity }    from '../entities/Post.entity.js';

const repo = () => AppDataSource.getRepository(PostEntity);

function baseQuery(userId?: number) {
  const qb = repo()
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.user', 'u')
    .loadRelationCountAndMap('p.likesCount',    'p.likesList')
    .loadRelationCountAndMap('p.commentsCount', 'p.comments')
    .where('p.published = true')
    .orderBy('p.createdAt', 'DESC');

  if (userId) {
    qb.addSelect(sq =>
      sq.select('COUNT(*)')
        .from('likes', 'ul')
        .where('ul.post_id = p.id AND ul.user_id = :uid', { uid: userId }),
      'userLikeCount'
    );
  }
  return qb;
}

function attachLike(
  { raw, entities }: { raw: Record<string, unknown>[]; entities: PostEntity[] },
  userId?: number
) {
  if (!userId) return entities as (PostEntity & { userHasLiked?: boolean })[];
  return entities.map((e, i) => ({
    ...e,
    userHasLiked: parseInt(String(raw[i]?.userLikeCount ?? '0'), 10) > 0,
  }));
}

export const PostModel = {
  async findAll(page = 1, limit = 10, userId?: number) {
    const rows = await baseQuery(userId)
      .skip((page - 1) * limit).take(limit).getRawAndEntities();
    return attachLike(rows, userId);
  },

  async findById(id: number, userId?: number) {
    const rows = await baseQuery(userId)
      .andWhere('p.id = :id', { id }).getRawAndEntities();
    return attachLike(rows, userId)[0] ?? null;
  },

  async findByUser(userId: number) {
    return repo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .loadRelationCountAndMap('p.likesCount',    'p.likesList')
      .loadRelationCountAndMap('p.commentsCount', 'p.comments')
      .where('p.userId = :userId', { userId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
  },

  async create(data: {
    userId: number; title: string; content: string;
    imageUrl?: string | null; tags?: string[]; published?: boolean;
  }) {
    const post = repo().create({
      userId:    data.userId,
      title:     data.title,
      content:   data.content,
      imageUrl:  data.imageUrl ?? null,
      tags:      data.tags?.length ? data.tags : null,
      published: data.published ?? true,
    });
    return repo().save(post);
  },

  async update(id: number, userId: number, data: {
    title?: string; content?: string; imageUrl?: string | null;
    tags?: string[]; published?: boolean; removeImage?: boolean;
  }) {
    const patch: Partial<PostEntity> = {};
    if (data.title     !== undefined) patch.title     = data.title;
    if (data.content   !== undefined) patch.content   = data.content;
    if (data.tags      !== undefined) patch.tags      = data.tags?.length ? data.tags : null;
    if (data.published !== undefined) patch.published = data.published;
    if (data.removeImage || data.imageUrl === null || data.imageUrl === '') {
      patch.imageUrl = null;
    } else if (data.imageUrl !== undefined) {
      patch.imageUrl = data.imageUrl;
    }
    if (Object.keys(patch).length === 0) return repo().findOne({ where: { id } });
    await repo().update({ id, userId }, patch);
    return repo().findOne({ where: { id } });
  },

  async delete(id: number, userId: number) {
    const result = await repo().delete({ id, userId });
    return (result.affected ?? 0) > 0;
  },

  async feed(userId: number, page = 1, limit = 10) {
    const rows = await repo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .loadRelationCountAndMap('p.likesCount',    'p.likesList')
      .loadRelationCountAndMap('p.commentsCount', 'p.comments')
      .addSelect(sq =>
        sq.select('COUNT(*)')
          .from('likes', 'ul')
          .where('ul.post_id = p.id AND ul.user_id = :uid', { uid: userId }),
        'userLikeCount'
      )
      .where('p.published = true')
      .andWhere(
        'p.userId = :userId OR p.userId IN ' +
        '(SELECT following_id FROM followers WHERE follower_id = :userId)',
        { userId }
      )
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit).take(limit)
      .getRawAndEntities();
    return attachLike(rows, userId);
  },
};
