import { adminApi } from '../services/api.js';
import { navigate } from '../utils/router.js';
import type { User, AdminStats } from '../types/index.js';

const PAGE_SIZE = 15;

interface DashboardState {
  stats: AdminStats | null;
  users: User[];
  deletedLog: { id: number; username: string; email: string; deletedAt: string }[];
  activeTab: 'overview' | 'users' | 'posts' | 'banned' | 'deleted';
  searchQuery: string;
  currentPage: number;
}

const state: DashboardState = {
  stats: null,
  users: [],
  deletedLog: JSON.parse(localStorage.getItem('admin_deleted_log') || '[]'),
  activeTab: 'overview',
  searchQuery: '',
  currentPage: 1,
};

export async function renderAdminDashboard(container: HTMLElement) {
  container.innerHTML = `<div class="loading-spinner">Cargando panel de administración...</div>`;
  try {
    const [stats, users] = await Promise.all([adminApi.getStats(), adminApi.getAllUsers()]);
    state.stats = stats;
    state.users = users;
    renderShell(container);
    renderTab(container);
  } catch (err: unknown) {
    container.innerHTML = `<div class="error-state">Error al cargar el panel: ${err instanceof Error ? err.message : 'desconocido'}</div>`;
  }
}

// ── Shell (sidebar + content area) ─────────────────────────────
function renderShell(container: HTMLElement) {
  const s = state.stats!;
  container.innerHTML = `
    <div class="adm-shell">
      <!-- SIDEBAR -->
      <aside class="adm-sidebar">
        <div class="adm-logo">
          <span class="adm-logo-icon">✦</span>
          <span>Inkflow</span>
          <span class="adm-logo-badge">Admin</span>
        </div>

        <nav class="adm-nav">
          ${navItem('overview', '◈', 'Overview')}
          ${navItem('users',    '👤', 'Usuarios',   s.totals.users)}
          ${navItem('posts',    '📝', 'Posts',       s.totals.posts)}
          ${navItem('banned',   '🚫', 'Baneados',    s.totals.banned, true)}
          ${navItem('deleted',  '🗑', 'Eliminados',  state.deletedLog.length)}
        </nav>

        <div class="adm-sidebar-footer">
          <button class="adm-back-btn" id="backBtn">← Volver al sitio</button>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="adm-main">
        <div class="adm-topbar">
          <div class="adm-topbar-left">
            <h2 class="adm-page-title" id="pageTitle">Overview</h2>
          </div>
          <div class="adm-topbar-right">
            <div class="adm-search-wrap">
              <span class="adm-search-icon">🔍</span>
              <input type="text" id="adminSearch" class="adm-search" placeholder="Buscar usuario, email..." autocomplete="off" />
              <button class="adm-search-clear hidden" id="clearSearch">✕</button>
            </div>
          </div>
        </div>
        <div class="adm-content" id="admContent"></div>
      </main>
    </div>
  `;

  // Nav clicks
  container.querySelectorAll('.adm-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = (item as HTMLElement).dataset.tab as DashboardState['activeTab'];
      state.activeTab = tab;
      state.searchQuery = '';
      state.currentPage = 1;
      const searchEl = container.querySelector('#adminSearch') as HTMLInputElement;
      if (searchEl) searchEl.value = '';
      container.querySelector('.adm-search-clear')?.classList.add('hidden');
      updateActiveNav(container);
      renderTab(container);
    });
  });

  // Back
  container.querySelector('#backBtn')?.addEventListener('click', () => navigate('/feed'));

  // Search
  const searchEl = container.querySelector('#adminSearch') as HTMLInputElement;
  const clearBtn = container.querySelector('#clearSearch') as HTMLButtonElement;
  let searchTimer: number;
  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.searchQuery = searchEl.value.trim().toLowerCase();
      state.currentPage = 1;
      clearBtn.classList.toggle('hidden', !state.searchQuery);
      renderTab(container);
    }, 220);
  });
  clearBtn?.addEventListener('click', () => {
    searchEl.value = '';
    state.searchQuery = '';
    clearBtn.classList.add('hidden');
    renderTab(container);
  });
}

function navItem(tab: string, icon: string, label: string, count?: number, danger = false): string {
  const active = state.activeTab === tab ? 'active' : '';
  const badge = count !== undefined ? `<span class="adm-nav-badge ${danger ? 'badge-danger' : ''}">${count.toLocaleString()}</span>` : '';
  return `
    <button class="adm-nav-item ${active} ${danger ? 'nav-danger' : ''}" data-tab="${tab}">
      <span class="adm-nav-icon">${icon}</span>
      <span class="adm-nav-label">${label}</span>
      ${badge}
    </button>
  `;
}

function updateActiveNav(container: HTMLElement) {
  container.querySelectorAll('.adm-nav-item').forEach(item => {
    const isActive = (item as HTMLElement).dataset.tab === state.activeTab;
    item.classList.toggle('active', isActive);
  });
  const titles: Record<string, string> = {
    overview: 'Overview', users: 'Gestión de Usuarios',
    posts: 'Gestión de Posts', banned: 'Usuarios Baneados', deleted: 'Registro de Eliminados'
  };
  const titleEl = container.querySelector('#pageTitle');
  if (titleEl) titleEl.textContent = titles[state.activeTab] || '';
}

// ── Tab router ──────────────────────────────────────────────────
function renderTab(container: HTMLElement) {
  updateActiveNav(container);
  const content = container.querySelector('#admContent') as HTMLElement;
  if (!content) return;
  switch (state.activeTab) {
    case 'overview': renderOverview(content); break;
    case 'users':    renderUsersTab(content, container); break;
    case 'posts':    renderPostsTab(content, container); break;
    case 'banned':   renderBannedTab(content, container); break;
    case 'deleted':  renderDeletedTab(content); break;
  }
}

// ── OVERVIEW ────────────────────────────────────────────────────
function renderOverview(content: HTMLElement) {
  const s = state.stats!;
  content.innerHTML = `
    <div class="adm-overview">
      <!-- Metric cards -->
      <div class="adm-metrics">
        ${metricCard('👥', 'Usuarios totales', s.totals.users, `+${s.weekly.new_users} esta semana`, 'purple')}
        ${metricCard('📝', 'Posts publicados', s.totals.posts, `+${s.weekly.new_posts} esta semana`, 'blue')}
        ${metricCard('💬', 'Comentarios', s.totals.comments, 'Total acumulado', 'teal')}
        ${metricCard('♥',  'Likes',       s.totals.likes,    'Total acumulado', 'pink')}
        ${metricCard('🚫', 'Suspendidos',  s.totals.banned,   'Cuentas inactivas', 'red')}
      </div>

      <div class="adm-overview-grid">
        <!-- Actividad chart -->
        <div class="adm-ov-card wide">
          <div class="adm-ov-card-header">
            <h3>Posts por día — últimos 14 días</h3>
          </div>
          ${renderBarChart(s.activity)}
        </div>

        <!-- Top posts -->
        <div class="adm-ov-card">
          <div class="adm-ov-card-header">
            <h3>🏆 Top 5 posts</h3>
          </div>
          <div class="adm-top-list">
            ${s.top_posts.length === 0 ? '<p class="adm-empty">Sin posts aún</p>' :
              s.top_posts.map((p, i) => `
                <div class="adm-top-item">
                  <span class="adm-rank rank-${i+1}">#${i+1}</span>
                  <div class="adm-top-info">
                    <span class="adm-top-title">${p.title}</span>
                    <span class="adm-top-meta">@${p.username} · ♥ ${p.likes_count} · 💬 ${p.comments_count}</span>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- Quick stats -->
        <div class="adm-ov-card">
          <div class="adm-ov-card-header"><h3>📊 Resumen rápido</h3></div>
          <div class="adm-quick-stats">
            <div class="adm-qs-row">
              <span>Promedio posts/usuario</span>
              <strong>${s.totals.users > 0 ? (s.totals.posts / s.totals.users).toFixed(1) : '0'}</strong>
            </div>
            <div class="adm-qs-row">
              <span>Promedio likes/post</span>
              <strong>${s.totals.posts > 0 ? (s.totals.likes / s.totals.posts).toFixed(1) : '0'}</strong>
            </div>
            <div class="adm-qs-row">
              <span>Promedio comentarios/post</span>
              <strong>${s.totals.posts > 0 ? (s.totals.comments / s.totals.posts).toFixed(1) : '0'}</strong>
            </div>
            <div class="adm-qs-row">
              <span>Tasa de suspensión</span>
              <strong class="${s.totals.banned > 0 ? 'text-danger' : ''}">
                ${s.totals.users > 0 ? ((s.totals.banned / s.totals.users) * 100).toFixed(1) : '0'}%
              </strong>
            </div>
            <div class="adm-qs-row">
              <span>Eliminados (sesión)</span>
              <strong>${state.deletedLog.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function metricCard(icon: string, label: string, value: number, sub: string, color: string): string {
  return `
    <div class="adm-metric metric-${color}">
      <div class="adm-metric-top">
        <span class="adm-metric-icon">${icon}</span>
        <span class="adm-metric-value">${value.toLocaleString()}</span>
      </div>
      <div class="adm-metric-label">${label}</div>
      <div class="adm-metric-sub">${sub}</div>
    </div>
  `;
}

function renderBarChart(activity: { date: string; posts: number }[]): string {
  if (activity.length === 0) return '<p class="adm-empty" style="padding:1rem">Sin actividad reciente</p>';
  const max = Math.max(...activity.map(a => Number(a.posts)), 1);
  return `
    <div class="adm-bar-chart">
      ${activity.map(a => {
        const pct = Math.max(Math.round((Number(a.posts) / max) * 100), 3);
        const label = new Date(a.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        return `
          <div class="adm-bar-col">
            <span class="adm-bar-val">${a.posts}</span>
            <div class="adm-bar-track"><div class="adm-bar-fill" style="height:${pct}%"></div></div>
            <span class="adm-bar-lbl">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── USERS TAB ───────────────────────────────────────────────────
function renderUsersTab(content: HTMLElement, shell: HTMLElement) {
  const all = state.users.filter(u => u.role !== 'admin');
  const filtered = filterUsers(all);
  const paged = paginate(filtered);

  content.innerHTML = `
    <div class="adm-tab-toolbar">
      <span class="adm-count">${filtered.length.toLocaleString()} usuario${filtered.length !== 1 ? 's' : ''}</span>
      <div class="adm-sort-row">
        <select id="sortUsers" class="adm-select">
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="posts">Por posts</option>
          <option value="followers">Por seguidores</option>
          <option value="az">A → Z</option>
        </select>
      </div>
    </div>
    ${renderUsersTable(paged, shell)}
    ${renderPagination(filtered.length)}
  `;
  attachTableEvents(content, shell);
  attachPaginationEvents(content, shell);

  content.querySelector('#sortUsers')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    sortUsers(val);
    renderUsersTab(content, shell);
  });
}

function sortUsers(by: string) {
  state.users.sort((a, b) => {
    if (by === 'newest') return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
    if (by === 'oldest') return new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime();
    if (by === 'posts') return (b.posts_count ?? 0) - (a.posts_count ?? 0);
    if (by === 'followers') return (b.followers_count ?? 0) - (a.followers_count ?? 0);
    if (by === 'az') return a.username.localeCompare(b.username);
    return 0;
  });
}

function filterUsers(users: User[]): User[] {
  if (!state.searchQuery) return users;
  const q = state.searchQuery;
  return users.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    String(u.id).includes(q)
  );
}

function paginate<T>(items: T[]): T[] {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function renderPagination(total: number): string {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return '';
  const btns = Array.from({ length: pages }, (_, i) => `
    <button class="adm-page-btn ${state.currentPage === i+1 ? 'active' : ''}" data-page="${i+1}">${i+1}</button>
  `).join('');
  return `
    <div class="adm-pagination">
      <button class="adm-page-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''}>‹</button>
      ${btns}
      <button class="adm-page-btn" data-page="${state.currentPage + 1}" ${state.currentPage === pages ? 'disabled' : ''}>›</button>
      <span class="adm-page-info">Página ${state.currentPage} de ${pages}</span>
    </div>
  `;
}

function attachPaginationEvents(content: HTMLElement, shell: HTMLElement) {
  content.querySelectorAll('.adm-page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt((btn as HTMLElement).dataset.page || '1');
      if (page < 1) return;
      state.currentPage = page;
      renderTab(shell);
    });
  });
}

function renderUsersTable(users: User[], _shell: HTMLElement): string {
  if (users.length === 0) return `<div class="adm-empty-state"><span>👤</span><p>No se encontraron usuarios</p></div>`;
  return `
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead><tr>
          <th>Usuario</th>
          <th>Email</th>
          <th class="th-num">Posts</th>
          <th class="th-num">Seguidores</th>
          <th>Registro</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${users.map(u => userRow(u)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function userRow(u: User): string {
  const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=7c3aed&color=fff&size=32`;
  return `
    <tr data-id="${u.id}" class="${u.is_banned ? 'row-banned' : ''}">
      <td>
        <div class="adm-user-cell">
          <img src="${avatar}" class="adm-avatar" alt="" />
          <div>
            <a href="/profile/${u.id}" data-link class="adm-username">@${u.username}</a>
            <span class="adm-uid">#${u.id}</span>
          </div>
        </div>
      </td>
      <td class="td-secondary">${u.email}</td>
      <td class="th-num">${u.posts_count ?? 0}</td>
      <td class="th-num">${u.followers_count ?? 0}</td>
      <td class="td-secondary">${new Date(u.created_at!).toLocaleDateString('es-CO')}</td>
      <td>
        <span class="adm-status ${u.is_banned ? 'status-banned' : 'status-active'}">
          ${u.is_banned ? 'Baneado' : 'Activo'}
        </span>
      </td>
      <td>
        <div class="adm-actions">
          <button class="adm-btn-ban ${u.is_banned ? 'is-banned' : ''}" data-id="${u.id}" data-banned="${u.is_banned}" title="${u.is_banned ? 'Reactivar' : 'Suspender'}">
            ${u.is_banned ? '✓ Reactivar' : '🚫 Suspender'}
          </button>
          <button class="adm-btn-del" data-id="${u.id}" data-name="${u.username}" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `;
}

function attachTableEvents(content: HTMLElement, shell: HTMLElement) {
  // Ban/Unban
  content.querySelectorAll('.adm-btn-ban').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id || '0');
      const isBanned = (btn as HTMLElement).dataset.banned === 'true';
      if (!confirm(`¿${isBanned ? 'Reactivar' : 'Suspender'} a este usuario?`)) return;
      try {
        const res = await adminApi.toggleBan(id, !isBanned);
        const idx = state.users.findIndex(u => u.id === id);
        if (idx >= 0) state.users[idx].is_banned = !isBanned;
        showToast(res.message);
        renderTab(shell);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Error', true);
      }
    });
  });

  // Delete user
  content.querySelectorAll('.adm-btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id || '0');
      const name = (btn as HTMLElement).dataset.name || '';
      if (!confirm(`¿Eliminar a @${name} permanentemente?`)) return;
      try {
        await adminApi.deleteUser(id);
        const idx = state.users.findIndex(u => u.id === id);
        const deleted = state.users[idx];
        state.deletedLog.unshift({ id, username: name, email: deleted?.email || '', deletedAt: new Date().toISOString() });
        localStorage.setItem('admin_deleted_log', JSON.stringify(state.deletedLog.slice(0, 100)));
        if (idx >= 0) state.users.splice(idx, 1);
        showToast(`@${name} eliminado`);
        renderTab(shell);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Error', true);
      }
    });
  });

  // Profile links
  content.querySelectorAll('.adm-username[data-link]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate((a as HTMLAnchorElement).getAttribute('href') || '/');
    });
  });
}

// ── POSTS TAB ───────────────────────────────────────────────────
function renderPostsTab(content: HTMLElement, shell: HTMLElement) {
  const s = state.stats!;
  const filtered = state.searchQuery
    ? s.top_posts.filter(p =>
        p.title.toLowerCase().includes(state.searchQuery) ||
        p.username.toLowerCase().includes(state.searchQuery))
    : s.top_posts;

  content.innerHTML = `
    <div class="adm-tab-toolbar">
      <span class="adm-count">Top ${filtered.length} posts más populares</span>
    </div>
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead><tr>
          <th>#</th><th>Título</th><th>Autor</th>
          <th class="th-num">♥ Likes</th><th class="th-num">💬 Comentarios</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${filtered.length === 0
            ? `<tr><td colspan="6" class="adm-empty">Sin resultados</td></tr>`
            : filtered.map((p, i) => `
              <tr>
                <td><span class="adm-rank rank-${i+1}">#${i+1}</span></td>
                <td><a href="/post/${p.id}" data-link class="adm-post-link">${p.title}</a></td>
                <td class="td-secondary">@${p.username}</td>
                <td class="th-num">${p.likes_count}</td>
                <td class="th-num">${p.comments_count}</td>
                <td>
                  <button class="adm-btn-del-post" data-id="${p.id}" title="Eliminar post">🗑 Eliminar</button>
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    <p class="adm-note">Solo se muestran los posts con más interacciones. Para ver todos los posts, navega a los perfiles de usuario.</p>
  `;

  content.querySelectorAll('.adm-btn-del-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id || '0');
      if (!confirm('¿Eliminar este post permanentemente?')) return;
      try {
        await adminApi.deletePost(id);
        const idx = s.top_posts.findIndex(p => p.id === id);
        if (idx >= 0) s.top_posts.splice(idx, 1);
        showToast('Post eliminado');
        renderPostsTab(content, shell);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Error', true);
      }
    });
  });

  content.querySelectorAll('.adm-post-link[data-link]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate((a as HTMLAnchorElement).getAttribute('href') || '/');
    });
  });
}

// ── BANNED TAB ──────────────────────────────────────────────────
function renderBannedTab(content: HTMLElement, shell: HTMLElement) {
  const banned = filterUsers(state.users.filter(u => u.is_banned));
  const paged = paginate(banned);

  content.innerHTML = `
    <div class="adm-tab-toolbar">
      <span class="adm-count">${banned.length} usuario${banned.length !== 1 ? 's' : ''} suspendido${banned.length !== 1 ? 's' : ''}</span>
    </div>
    ${banned.length === 0
      ? `<div class="adm-empty-state"><span>✅</span><p>No hay usuarios suspendidos</p></div>`
      : `
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr>
              <th>Usuario</th><th>Email</th>
              <th class="th-num">Posts</th><th>Registro</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              ${paged.map(u => `
                <tr data-id="${u.id}" class="row-banned">
                  <td>
                    <div class="adm-user-cell">
                      <img src="${u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=7c3aed&color=fff&size=32`}" class="adm-avatar" alt="" />
                      <span class="adm-username">@${u.username}</span>
                    </div>
                  </td>
                  <td class="td-secondary">${u.email}</td>
                  <td class="th-num">${u.posts_count ?? 0}</td>
                  <td class="td-secondary">${new Date(u.created_at!).toLocaleDateString('es-CO')}</td>
                  <td>
                    <div class="adm-actions">
                      <button class="adm-btn-ban is-banned" data-id="${u.id}" data-banned="true">✓ Reactivar</button>
                      <button class="adm-btn-del" data-id="${u.id}" data-name="${u.username}">🗑</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPagination(banned.length)}
      `}
  `;
  attachTableEvents(content, shell);
  attachPaginationEvents(content, shell);
}

// ── DELETED TAB ─────────────────────────────────────────────────
function renderDeletedTab(content: HTMLElement) {
  const log = state.deletedLog.filter(d =>
    !state.searchQuery ||
    d.username.toLowerCase().includes(state.searchQuery) ||
    d.email.toLowerCase().includes(state.searchQuery)
  );

  content.innerHTML = `
    <div class="adm-tab-toolbar">
      <span class="adm-count">${log.length} registro${log.length !== 1 ? 's' : ''} de eliminación</span>
      ${state.deletedLog.length > 0 ? `<button class="adm-clear-log" id="clearLog">Limpiar registro</button>` : ''}
    </div>
    ${log.length === 0
      ? `<div class="adm-empty-state"><span>🗑</span><p>No hay registros de eliminación aún</p></div>`
      : `
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr>
              <th>ID original</th><th>Username</th><th>Email</th><th>Eliminado el</th>
            </tr></thead>
            <tbody>
              ${log.map(d => `
                <tr class="row-deleted">
                  <td class="td-secondary">#${d.id}</td>
                  <td><span class="adm-deleted-name">@${d.username}</span></td>
                  <td class="td-secondary">${d.email}</td>
                  <td class="td-secondary">${new Date(d.deletedAt).toLocaleString('es-CO')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p class="adm-note">Este registro se guarda localmente en esta sesión del navegador.</p>
      `}
  `;

  content.querySelector('#clearLog')?.addEventListener('click', () => {
    if (!confirm('¿Limpiar el registro local de eliminaciones?')) return;
    state.deletedLog.length = 0;
    localStorage.removeItem('admin_deleted_log');
    renderDeletedTab(content);
  });
}

// ── Toast ───────────────────────────────────────────────────────
function showToast(msg: string, error = false) {
  document.querySelector('.admin-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `admin-toast ${error ? 'toast-error' : 'toast-success'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-visible'), 10);
  setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 300); }, 3000);
}
