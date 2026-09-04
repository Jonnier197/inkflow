import { addRoute, initRouter, navigate } from './utils/router.js';
import { authStore } from './utils/authStore.js';
import { renderNavbar } from './components/Navbar.js';
import { renderLoginPage } from './pages/login.js';
import { renderRegisterPage } from './pages/register.js';
import { renderFeedPage } from './pages/feed.js';
import { renderExplorePage } from './pages/explore.js';
import { renderCreatePostPage } from './pages/createPost.js';
import { renderPostDetailPage } from './pages/postDetail.js';
import { renderProfilePage } from './pages/profile.js';
import { renderSettingsPage } from './pages/settings.js';
import { renderAdminDashboard } from './pages/adminDashboard.js';

const navbarEl = document.getElementById('navbar')!;
const appEl = document.getElementById('app')!;

function requireAuth(fn: (container: HTMLElement, params?: Record<string, string>) => void) {
  return (params?: Record<string, string>) => {
    if (!authStore.isLoggedIn()) { navigate('/login'); return; }
    renderNavbar(navbarEl);
    fn(appEl, params);
  };
}

function requireAdmin(fn: (container: HTMLElement) => void) {
  return () => {
    if (!authStore.isLoggedIn()) { navigate('/login'); return; }
    if (!authStore.isAdmin()) { navigate('/feed'); return; }
    renderNavbar(navbarEl);
    fn(appEl);
  };
}

function publicRoute(fn: (container: HTMLElement) => void) {
  return () => {
    if (authStore.isLoggedIn()) { navigate('/feed'); return; }
    navbarEl.innerHTML = '';
    fn(appEl);
  };
}

addRoute('/login', publicRoute(renderLoginPage));
addRoute('/register', publicRoute(renderRegisterPage));

addRoute('/', requireAuth((c) => renderFeedPage(c)));
addRoute('/feed', requireAuth((c) => renderFeedPage(c)));
addRoute('/explore', requireAuth((c) => renderExplorePage(c)));
addRoute('/create', requireAuth((c) => renderCreatePostPage(c)));
addRoute('/edit/:id', requireAuth((c, params) => renderCreatePostPage(c, parseInt(params?.id || '0'))));
addRoute('/post/:id', requireAuth((c, params) => renderPostDetailPage(c, parseInt(params?.id || '0'))));
addRoute('/profile/:id', requireAuth((c, params) => renderProfilePage(c, parseInt(params?.id || '0'))));
addRoute('/settings', requireAuth((c) => renderSettingsPage(c)));
addRoute('/admin', requireAdmin((c) => renderAdminDashboard(c)));

initRouter();
