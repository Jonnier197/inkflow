
import { AppDataSource } from '../config/database.js';
import { UserEntity } from '../entities/User.entity.js';

const repo = () => AppDataSource.getRepository(UserEntity);

export const UserModel = {
  findById:       (id: number)       => repo().findOne({ where: { id } }),
  findByEmail:    (email: string)    => repo().findOne({ where: { email } }),
  findByUsername: (username: string) => repo().findOne({ where: { username } }),

  async create(data: {
    username: string; email: string; passwordHash: string;
    bio?: string; avatarUrl?: string; role?: string;
  }) {
    const user = repo().create({
      username:     data.username,
      email:        data.email,
      passwordHash: data.passwordHash,
      bio:          data.bio      ?? null,
      avatarUrl:    data.avatarUrl ?? null,
      role:         data.role     ?? 'user',
    });
    return repo().save(user);
  },

  async update(id: number, data: { username?: string; bio?: string; avatarUrl?: string }) {
    const patch: Partial<UserEntity> = {};
    if (data.username  !== undefined) patch.username  = data.username;
    if (data.bio       !== undefined) patch.bio       = data.bio;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
    if (Object.keys(patch).length === 0) return repo().findOne({ where: { id } });
    await repo().update(id, patch);
    return repo().findOne({ where: { id } });
  },

  async delete(id: number) {
    const result = await repo().delete(id);
    return (result.affected ?? 0) > 0;
  },

  async setBanned(id: number, isBanned: boolean) {
    await repo().update(id, { isBanned });
    return repo().findOne({ where: { id } });
  },

  async getProfile(id: number) {
    return repo()
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .loadRelationCountAndMap('u.followersCount', 'u.followers')
      .loadRelationCountAndMap('u.followingCount', 'u.following')
      .loadRelationCountAndMap('u.postsCount',     'u.posts')
      .getOne();
  },

  async search(term: string) {
    return repo()
      .createQueryBuilder('u')
      .where('u.username ILIKE :t OR u.email ILIKE :t', { t: `%${term}%` })
      .limit(20)
      .getMany();
  },

  async findAllAdmin() {
    return repo()
      .createQueryBuilder('u')
      .loadRelationCountAndMap('u.postsCount',     'u.posts')
      .loadRelationCountAndMap('u.followersCount', 'u.followers')
      .loadRelationCountAndMap('u.followingCount', 'u.following')
      .orderBy('u.createdAt', 'DESC')
      .getMany();
  },
};
