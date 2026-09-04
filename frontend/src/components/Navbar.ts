import { authStore } from '../utils/authStore.js';
import { navigate } from '../utils/router.js';

export function renderNavbar(container: HTMLElement) {
  const user = authStore.getUser();
  const isLoggedIn = authStore.isLoggedIn();
  const isAdmin = authStore.isAdmin();

  container.innerHTML = `
    <nav class="navbar">
      <div class="navbar-brand">
        <a href="/" data-link class="brand-logo">
          <span class="brand-icon">✦</span>
          <span>Inkflow</span>
        </a>
        ${isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
      </div>
      <div class="navbar-search">
        <input type="text" id="searchInput" placeholder="Buscar usuarios..." autocomplete="off" />
        <div id="searchDropdown" class="search-dropdown hidden"></div>
      </div>
      <div class="navbar-actions">
        ${isLoggedIn ? `
          <a href="/feed" data-link class="nav-btn">Feed</a>
          <a href="/explore" data-link class="nav-btn">Explorar</a>
          ${isAdmin ? `<a href="/admin" data-link class="nav-btn nav-btn-admin">⚙ Admin</a>` : ''}
          <a href="/create" data-link class="nav-btn nav-btn-primary">+ Post</a>
          <div class="nav-avatar-wrapper">
            <img src="${user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=6366f1&color=fff`}"
                 class="nav-avatar" id="avatarBtn" alt="Avatar" />
            <div class="avatar-dropdown" id="avatarDropdown">
              <a href="/profile/${user?.id}" data-link>Mi Perfil</a>
              <a href="/settings" data-link>Configuración</a>
              ${isAdmin ? `<a href="/admin" data-link>Panel Admin</a>` : ''}
              <button id="logoutBtn">Cerrar sesión</button>
            </div>
          </div>
        ` : `
          <a href="/login" data-link class="nav-btn">Iniciar sesión</a>
          <a href="/register" data-link class="nav-btn nav-btn-primary">Registrarse</a>
        `}
      </div>
    </nav>
  `;

  const avatarBtn = container.querySelector('#avatarBtn');
  const avatarDropdown = container.querySelector('#avatarDropdown');
  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown?.classList.toggle('show');
  });
  document.addEventListener('click', () => avatarDropdown?.classList.remove('show'));

  container.querySelector('#logoutBtn')?.addEventListener('click', () => {
    authStore.logout();
    navigate('/login');
  });

  const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
  const searchDropdown = container.querySelector('#searchDropdown') as HTMLElement;
  let searchTimeout: number;

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { searchDropdown.classList.add('hidden'); return; }
    searchTimeout = window.setTimeout(async () => {
      try {
        const { userApi } = await import('../services/api.js');
        const users = await userApi.search(q);
        searchDropdown.innerHTML = users.length === 0
          ? '<p class="search-empty">Sin resultados</p>'
          : users.map(u => `
            <a href="/profile/${u.id}" data-link class="search-result">
              <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=6366f1&color=fff`}" alt="" />
              <span>@${u.username}</span>
              ${u.is_banned ? '<span class="badge-banned">Baneado</span>' : ''}
            </a>
          `).join('');
        searchDropdown.classList.remove('hidden');
      } catch {}
    }, 350);
  });
  document.addEventListener('click', (e) => {
    if (!searchInput?.contains(e.target as Node)) searchDropdown.classList.add('hidden');
  });
}
