const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const hasBody = options.body !== undefined;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

export const authApi = {
  register: (body: { username: string; email: string; password: string; bio?: string }) =>
    request<{ token: string; user: import('../types/index.js').User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: import('../types/index.js').User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};

export const userApi = {
  getMe: () => request<import('../types/index.js').User>('/users/me'),
  updateMe: (body: { username?: string; bio?: string; avatar_url?: string }) =>
    request<import('../types/index.js').User>('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
  deleteMe: () => request<void>('/users/me', { method: 'DELETE' }),
  getProfile: (id: number) => request<import('../types/index.js').User>(`/users/${id}`),
  search: (q: string) => request<import('../types/index.js').User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  toggleFollow: (id: number) => request<{ following: boolean }>(`/users/${id}/follow`, { method: 'POST', body: '{}' }),
  getFollowers: (id: number) => request<import('../types/index.js').User[]>(`/users/${id}/followers`),
  getFollowing: (id: number) => request<import('../types/index.js').User[]>(`/users/${id}/following`),
};

export const postApi = {
  getFeed: (page = 1) => request<import('../types/index.js').Post[]>(`/posts/feed?page=${page}`),
  getAll: (page = 1) => request<import('../types/index.js').Post[]>(`/posts?page=${page}`),
  getById: (id: number) => request<import('../types/index.js').Post>(`/posts/${id}`),
  getByUser: (userId: number) => request<import('../types/index.js').Post[]>(`/posts/user/${userId}`),
  create: (body: { title: string; content: string; image_url?: string; tags?: string[]; published?: boolean }) =>
    request<import('../types/index.js').Post>('/posts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<{ title: string; content: string; image_url: string | null; tags: string[]; published: boolean; removeImage: boolean }>) =>
    request<import('../types/index.js').Post>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id: number) => request<{ liked: boolean }>(`/posts/${id}/like`, { method: 'POST', body: '{}' }),
  getComments: (postId: number) => request<import('../types/index.js').Comment[]>(`/posts/${postId}/comments`),
  addComment: (postId: number, content: string) =>
    request<import('../types/index.js').Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (commentId: number) => request<void>(`/posts/comments/${commentId}`, { method: 'DELETE' }),
};

export const adminApi = {
  getStats: () => request<import('../types/index.js').AdminStats>('/admin/stats'),
  getAllUsers: () => request<import('../types/index.js').User[]>('/admin/users'),
  toggleBan: (id: number, banned: boolean) =>
    request<{ message: string; user: import('../types/index.js').User }>(`/admin/users/${id}/ban`, {
      method: 'PATCH', body: JSON.stringify({ banned })
    }),
  deleteUser: (id: number) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  deletePost: (id: number) => request<void>(`/admin/posts/${id}`, { method: 'DELETE' }),
};
