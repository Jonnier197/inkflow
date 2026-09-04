import { userApi } from '../services/api.js';
import { postApi } from '../services/api.js';
import { authStore } from '../utils/authStore.js';
import { renderPostCard } from '../components/PostCard.js';
import { navigate } from '../utils/router.js';

export async function renderProfilePage(container: HTMLElement, userId: number) {
  container.innerHTML = `<div class="loading-spinner">Cargando perfil...</div>`;
  const currentUser = authStore.getUser();
  const isOwnProfile = currentUser?.id === userId;

  try {
    const [profile, posts] = await Promise.all([
      userApi.getProfile(userId),
      postApi.getByUser(userId)
    ]);

    container.innerHTML = `
      <div class="profile-layout">
        <div class="profile-header">
          <img src="${profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=6366f1&color=fff&size=128`}"
            class="profile-avatar-lg" alt="Avatar" />
          <div class="profile-info">
            <h1>@${profile.username}</h1>
            ${profile.bio ? `<p class="profile-bio">${profile.bio}</p>` : ''}
            <div class="profile-stats">
              <span><strong>${profile.posts_count ?? 0}</strong> posts</span>
              <button class="profile-stat-link" id="showFollowers">
                <strong>${profile.followers_count ?? 0}</strong> seguidores
              </button>
              <button class="profile-stat-link" id="showFollowing">
                <strong>${profile.following_count ?? 0}</strong> siguiendo
              </button>
            </div>
            ${isOwnProfile
              ? `<button class="btn-secondary" id="editProfileBtn">Editar perfil</button>`
              : `<button class="btn-primary" id="followBtn">Cargando...</button>`}
          </div>
        </div>

        <div id="profileSubSection" class="profile-sub hidden"></div>

        <div class="profile-posts">
          <h2>Posts</h2>
          <div id="userPosts" class="posts-list">
            ${posts.length === 0
              ? `<div class="empty-state"><span class="empty-icon">✍️</span><p>Sin posts aún.</p></div>`
              : ''}
          </div>
        </div>
      </div>
    `;

    const userPostsContainer = container.querySelector('#userPosts') as HTMLElement;
    posts.forEach(p => userPostsContainer.appendChild(renderPostCard(p)));

    // Botón Seguir / Dejar de seguir
    if (!isOwnProfile) {
      const followBtn = container.querySelector('#followBtn') as HTMLButtonElement;
      followBtn.disabled = true;

      // Comprobamos si ya seguimos a este usuario
      let isFollowing = false;
      try {
        const followers = await userApi.getFollowers(userId);
        isFollowing = followers.some(f => f.id === currentUser?.id);
      } catch {}

      followBtn.disabled = false;
      followBtn.textContent = isFollowing ? 'Dejar de seguir' : 'Seguir';
      followBtn.className = isFollowing ? 'btn-secondary' : 'btn-primary';

      followBtn.addEventListener('click', async () => {
        followBtn.disabled = true;
        const prevText = followBtn.textContent;
        followBtn.textContent = '...';
        try {
          const result = await userApi.toggleFollow(userId);
          isFollowing = result.following;
          followBtn.textContent = isFollowing ? 'Dejar de seguir' : 'Seguir';
          followBtn.className = isFollowing ? 'btn-secondary' : 'btn-primary';
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : 'Error al seguir/dejar de seguir');
          followBtn.textContent = prevText;
        } finally {
          followBtn.disabled = false;
        }
      });
    }

    container.querySelector('#editProfileBtn')?.addEventListener('click', () => navigate('/settings'));

    // Panel de seguidores / siguiendo
    const subSection = container.querySelector('#profileSubSection') as HTMLElement;

    async function showUserList(title: string, fetchFn: () => Promise<{ id: number; username: string; avatar_url?: string }[]>) {
      subSection.innerHTML = `<p class="loading-inline">Cargando...</p>`;
      subSection.classList.remove('hidden');
      try {
        const list = await fetchFn();
        subSection.innerHTML = `
          <div class="subsection-header">
            <h3>${title}</h3>
            <button class="btn-text close-sub" title="Cerrar">✕</button>
          </div>
          ${list.length === 0
            ? '<p class="subsection-empty">Ninguno aún.</p>'
            : list.map(u => `
              <a href="/profile/${u.id}" data-link class="user-list-item">
                <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=6366f1&color=fff`}" alt="" />
                <span>@${u.username}</span>
              </a>
            `).join('')}
        `;
        subSection.querySelector('.close-sub')?.addEventListener('click', () => {
          subSection.classList.add('hidden');
        });
      } catch {
        subSection.innerHTML = `<p style="color:var(--color-text-muted)">Error al cargar.</p>`;
      }
    }

    container.querySelector('#showFollowers')?.addEventListener('click', () =>
      showUserList('Seguidores', () => userApi.getFollowers(userId))
    );
    container.querySelector('#showFollowing')?.addEventListener('click', () =>
      showUserList('Siguiendo', () => userApi.getFollowing(userId))
    );

  } catch (err: unknown) {
    console.error(err);
    container.innerHTML = `<div class="error-state">Perfil no encontrado.</div>`;
  }
}
