export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  role: string;
  is_banned: boolean;
  created_at?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image_url?: string;
  tags?: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  avatar_url?: string;
  likes_count: number;
  comments_count: number;
  user_has_liked?: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url?: string;
}

export interface AdminStats {
  totals: {
    users: number;
    posts: number;
    comments: number;
    likes: number;
    banned: number;
  };
  weekly: {
    new_users: number;
    new_posts: number;
  };
  top_posts: { id: number; title: string; username: string; likes_count: number; comments_count: number }[];
  activity: { date: string; posts: number }[];
}
