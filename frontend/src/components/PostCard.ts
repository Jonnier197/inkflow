import type { Post } from '../types/index.js';
import { authStore } from '../utils/authStore.js';
import { postApi } from '../services/api.js';
import { navigate } from '../utils/router.js';

export function renderPostCard(post: Post, onDelete?: () => void): HTMLElement {
  const currentUser = authStore.getUser();
  const isOwner = currentUser?.id === post.user_id;
  const card = document.createElement('article');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-header">
      <a href="/profile/${post.user_id}" data-link class="post-author">
        <img src="${post.avatar_url || `https://ui-avatars.com/api/?name=${post.username}&background=6366f1&color=fff`}" alt="" class="post-avatar" />
        <div>
          <span class="post-username">@${post.username}</span>
          <span class="post-date">${new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </a>
      ${isOwner ? `
        <div class="post-actions-owner">
          <button class="btn-icon edit-btn" title="Editar">✎</button>
          <button class="btn-icon delete-btn" title="Eliminar">✕</button>
        </div>
      ` : ''}
    </div>

    ${post.image_url ? `<img src="${post.image_url}" class="post-image" alt="Post image" loading="lazy" />` : ''}

    <div class="post-body">
      <h2 class="post-title">
        <a href="/post/${post.id}" data-link>${post.title}</a>
      </h2>
      <p class="post-excerpt">${post.content.slice(0, 200)}${post.content.length > 200 ? '…' : ''}</p>
      ${post.tags && post.tags.length > 0 ? `
        <div class="post-tags">
          ${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
      ` : ''}
    </div>

    <div class="post-footer">
      <button class="post-action like-btn ${post.user_has_liked ? 'liked' : ''}" data-post-id="${post.id}">
        <span class="like-icon">${post.user_has_liked ? '♥' : '♡'}</span>
        <span class="like-count">${post.likes_count}</span>
      </button>
      <a href="/post/${post.id}" data-link class="post-action">
        <span>💬</span>
        <span>${post.comments_count}</span>
      </a>
    </div>
  `;

  // Like toggle
  const likeBtn = card.querySelector('.like-btn') as HTMLButtonElement;
  likeBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const result = await postApi.toggleLike(post.id);
      const icon = likeBtn.querySelector('.like-icon')!;
      const count = likeBtn.querySelector('.like-count')!;
      const current = parseInt(count.textContent || '0');
      if (result.liked) {
        likeBtn.classList.add('liked');
        icon.textContent = '♥';
        count.textContent = String(current + 1);
      } else {
        likeBtn.classList.remove('liked');
        icon.textContent = '♡';
        count.textContent = String(current - 1);
      }
    } catch {}
  });

  // Delete
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('¿Eliminar este post?')) return;
    try {
      await postApi.delete(post.id);
      card.remove();
      onDelete?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  });

  // Edit
  const editBtn = card.querySelector('.edit-btn');
  editBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(`/edit/${post.id}`);
  });

  return card;
}
