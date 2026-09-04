import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { UserEntity }     from '../entities/User.entity.js';
import { PostEntity }     from '../entities/Post.entity.js';
import { CommentEntity }  from '../entities/Comment.entity.js';
import { LikeEntity }     from '../entities/Like.entity.js';
import { FollowerEntity } from '../entities/Follower.entity.js';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: false }, // Neon siempre requiere SSL
  synchronize: false,
  logging: false,
  entities: [UserEntity, PostEntity, CommentEntity, LikeEntity, FollowerEntity],
});

export async function initDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('✅ TypeORM conectado a PostgreSQL');
  }
  return AppDataSource;
}
