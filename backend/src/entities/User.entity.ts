import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 50 })
  username!: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', name: 'avatar_url', nullable: true, length: 500 })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', default: 'user', length: 20 })
  role!: string;

  @Column({ type: 'boolean', name: 'is_banned', default: false })
  isBanned!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany('PostEntity', 'user')
  posts!: unknown[];

  @OneToMany('CommentEntity', 'user')
  comments!: unknown[];

  @OneToMany('LikeEntity', 'user')
  likes!: unknown[];

  @OneToMany('FollowerEntity', 'follower')
  following!: unknown[];

  @OneToMany('FollowerEntity', 'followingUser')
  followers!: unknown[];
}
