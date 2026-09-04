import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique, Check
} from 'typeorm';
import { UserEntity } from './User.entity.js';

@Entity('followers')
@Unique(['followerId', 'followingId'])
@Check('"follower_id" <> "following_id"')
export class FollowerEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'follower_id' })
  followerId!: number;

  @Column({ type: 'int', name: 'following_id' })
  followingId!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  followingUser!: UserEntity;
}
