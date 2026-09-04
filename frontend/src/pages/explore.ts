import { postApi } from '../services/api.js';
import { renderPostCard } from '../components/PostCard.js';

export async function renderExplorePage(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-layout">
      <main class="feed-main">
        <div class="feed-header">
          <h1>Explorar</h1>
          <p>Descubre posts de toda la comunidad</p>
        </div>
        <div id="explorePosts" class="posts-list">
          <div class="loading-spinner">Cargando...</div>
        </div>
        <div class="pagination-controls">
          <button id="loadMoreExplore" class="btn-secondary">Cargar más</button>
        </div>
      </main>
    </div>
  `;

  let page = 1;
  const postsContainer = container.querySelector('#explorePosts') as HTMLElement;
  const loadMoreBtn = container.querySelector('#loadMoreExplore') as HTMLButtonElement;

  async function loadPosts(p: number) {
    try {
      const posts = await postApi.getAll(p);
      if (p === 1) postsContainer.innerHTML = '';
      if (posts.length === 0) {
        if (p === 1) postsContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">🌐</span><p>No hay posts publicados aún.</p></div>`;
        loadMoreBtn.style.display = 'none';
        return;
      }
      posts.forEach(post => postsContainer.appendChild(renderPostCard(post)));
      if (posts.length < 10) loadMoreBtn.style.display = 'none';
    } catch (err: unknown) {
      postsContainer.innerHTML = `<div class="error-state">${err instanceof Error ? err.message : 'Error'}</div>`;
    }
  }

  loadMoreBtn.addEventListener('click', () => { page++; loadPosts(page); });
  await loadPosts(1);
}
