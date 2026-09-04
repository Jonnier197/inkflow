import { postApi } from '../services/api.js';
import { authStore } from '../utils/authStore.js';
import { navigate } from '../utils/router.js';

export async function renderPostDetailPage(container: HTMLElement, postId: number) {
  container.innerHTML = `<div class="loading-spinner">Cargando post...</div>`;
  const currentUser = authStore.getUser();

  try {
    const [post, comments] = await Promise.all([
      postApi.getById(postId),
      postApi.getComments(postId)
    ]);

    let likedState = !!post.user_has_liked;
    let likeCountState = Number(post.likes_count);

    container.innerHTML = `
      <div class="split-layout">

        <!-- ── Columna izquierda: contenido del post ── -->
        <div class="split-post">
          <article class="post-detail">
            <header class="post-detail-header">
              <div class="post-detail-meta">
                <a href="/profile/${post.user_id}" data-link class="post-author-link">
                  <img src="${post.avatar_url || `https://ui-avatars.com/api/?name=${post.username}&background=7c3aed&color=fff`}" alt="" />
                  <div>
                    <strong>@${post.username}</strong>
                    <span>${new Date(post.created_at).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </a>
                ${currentUser?.id === post.user_id ? `
                  <div class="post-detail-actions">
                    <button class="btn-secondary btn-sm" id="editPost">Editar</button>
                    <button class="btn-danger btn-sm" id="deletePost">Eliminar</button>
                  </div>
                ` : ''}
              </div>
              <h1 class="post-detail-title">${post.title}</h1>
              ${post.tags && post.tags.length > 0 ? `
                <div class="post-tags">
                  ${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>
              ` : ''}
            </header>

            ${post.image_url ? `<img src="${post.image_url}" class="post-detail-image" alt="Cover" />` : ''}

            <div class="post-detail-content">${post.content.replace(/\n/g, '<br>')}</div>

            <div class="post-detail-footer">
              <button class="post-action like-btn-detail${likedState ? ' liked' : ''}" id="likeBtn">
                <span id="likeIcon">${likedState ? '♥' : '♡'}</span>
                <span id="likeCount">${likeCountState}</span> me gusta
              </button>
              <span class="post-action">💬 <span id="commentCount">${comments.length}</span> comentarios</span>
            </div>
          </article>
        </div>

        <!-- ── Columna derecha: panel de comentarios con scroll propio ── -->
        <aside class="split-comments">
          <div class="comments-panel-header">
            <h3>Comentarios <span class="comments-count-badge" id="commentCountTitle">${comments.length}</span></h3>
          </div>

          <form id="commentForm" class="comment-form-inline">
            <img src="${currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.username || 'U'}&background=7c3aed&color=fff`}"
                 alt="" class="comment-avatar" />
            <div class="comment-input-wrap">
              <textarea id="commentContent" rows="2" placeholder="Escribe un comentario..."></textarea>
              <button type="submit" class="btn-primary btn-sm comment-submit" id="submitComment">Enviar</button>
            </div>
          </form>

          <div class="comments-scroll-area" id="commentsList"></div>
        </aside>

      </div>
    `;

    // ── Renderizar comentarios ──
    const commentsList = container.querySelector('#commentsList') as HTMLElement;

    function buildCommentEl(c: {
      id: number; user_id: number; username: string;
      avatar_url?: string; content: string; created_at: string;
    }): HTMLElement {
      const div = document.createElement('div');
      div.className = 'comment';
      div.id = `comment-${c.id}`;
      div.innerHTML = `
        <img src="${c.avatar_url || `https://ui-avatars.com/api/?name=${c.username}&background=7c3aed&color=fff`}"
             alt="" class="comment-avatar" />
        <div class="comment-body">
          <div class="comment-meta">
            <a href="/profile/${c.user_id}" data-link><strong>@${c.username}</strong></a>
            <span>${new Date(c.created_at).toLocaleDateString('es-CO')}</span>
            ${currentUser?.id === c.user_id
              ? `<button class="btn-text delete-comment-btn">eliminar</button>`
              : ''}
          </div>
          <p>${c.content}</p>
        </div>
      `;
      div.querySelector('.delete-comment-btn')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comentario?')) return;
        try {
          await postApi.deleteComment(c.id);
          div.remove();
          updateCommentCount(-1);
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : 'Error al eliminar comentario');
        }
      });
      return div;
    }

    comments.forEach(c => commentsList.appendChild(buildCommentEl(c)));

    function updateCommentCount(delta: number) {
      ['#commentCount', '#commentCountTitle'].forEach(sel => {
        const el = container.querySelector(sel);
        if (el) el.textContent = String(parseInt(el.textContent || '0') + delta);
      });
    }

    // ── Like ──
    const likeBtn = container.querySelector('#likeBtn') as HTMLButtonElement;
    likeBtn.addEventListener('click', async () => {
      likeBtn.disabled = true;
      try {
        const result = await postApi.toggleLike(postId);
        likedState = result.liked;
        likeCountState = likedState ? likeCountState + 1 : likeCountState - 1;
        container.querySelector('#likeIcon')!.textContent = likedState ? '♥' : '♡';
        container.querySelector('#likeCount')!.textContent = String(likeCountState);
        likeBtn.classList.toggle('liked', likedState);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al dar like');
      } finally {
        likeBtn.disabled = false;
      }
    });

    // ── Editar / Eliminar post ──
    container.querySelector('#editPost')?.addEventListener('click', () => navigate(`/edit/${postId}`));
    container.querySelector('#deletePost')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este post? Esta acción es irreversible.')) return;
      try {
        await postApi.delete(postId);
        navigate('/feed');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al eliminar el post');
      }
    });

    // ── Añadir comentario ──
    const commentForm = container.querySelector('#commentForm') as HTMLFormElement;
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = commentForm.querySelector('#commentContent') as HTMLTextAreaElement;
      const submitBtn = container.querySelector('#submitComment') as HTMLButtonElement;
      const content = textarea.value.trim();
      if (!content) return;
      submitBtn.disabled = true;
      submitBtn.textContent = '...';
      try {
        const comment = await postApi.addComment(postId, content);
        const enriched = {
          ...comment,
          username: comment.username || currentUser?.username || '',
          avatar_url: comment.avatar_url || currentUser?.avatar_url
        };
        const newEl = buildCommentEl(enriched);
        commentsList.appendChild(newEl);
        // Scroll al nuevo comentario dentro del panel
        commentsList.scrollTop = commentsList.scrollHeight;
        textarea.value = '';
        updateCommentCount(1);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al comentar');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar';
      }
    });

  } catch (err: unknown) {
    console.error(err);
    container.innerHTML = `<div class="error-state">Post no encontrado o error de conexión.</div>`;
  }
}
