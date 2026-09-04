import { postApi } from '../services/api.js';
import { renderPostCard } from '../components/PostCard.js';

export async function renderFeedPage(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-layout">
      <main class="feed-main">
        <div class="feed-header">
          <h1>Tu Feed</h1>
          <p>Posts de personas que sigues</p>
        </div>
        <div id="feedPosts" class="posts-list">
          <div class="loading-spinner">Cargando posts...</div>
        </div>
        <div class="pagination-controls">
          <button id="loadMore" class="btn-secondary">Cargar más</button>
        </div>
      </main>
      <aside class="feed-sidebar">
        <div class="sidebar-card">
          <h3>Explorar</h3>
          <p>Descubre nuevas historias en la sección <a href="/explore" data-link>Explorar</a>.</p>
        </div>
      </aside>
    </div>
  `;

  let page = 1;
  const postsContainer = container.querySelector('#feedPosts') as HTMLElement;
  const loadMoreBtn = container.querySelector('#loadMore') as HTMLButtonElement;

  async function loadPosts(p: number) {
    try {
      const posts = await postApi.getFeed(p);
      if (p === 1) postsContainer.innerHTML = '';
      if (posts.length === 0) {
        if (p === 1) postsContainer.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>No hay posts aún. Sigue a alguien o <a href="/create" data-link>crea el primero</a>.</p>
          </div>`;
        loadMoreBtn.style.display = 'none';
        return;
      }
      posts.forEach(post => postsContainer.appendChild(renderPostCard(post)));
      if (posts.length < 10) loadMoreBtn.style.display = 'none';
    } catch (err: unknown) {
      postsContainer.innerHTML = `<div class="error-state">Error al cargar posts: ${err instanceof Error ? err.message : 'desconocido'}</div>`;
    }
  }

  loadMoreBtn.addEventListener('click', () => { page++; loadPosts(page); });
  await loadPosts(1);
}
