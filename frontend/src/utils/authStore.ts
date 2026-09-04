import type { User } from '../types/index.js';

interface AuthState {
  user: User | null;
  token: string | null;
}

// Decodifica el payload de un JWT sin librerías externas
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const state: AuthState = { user: null, token: localStorage.getItem('token') };

// Al cargar, leer usuario del localStorage y fusionar el role del JWT
const storedUser = localStorage.getItem('user');
if (storedUser) {
  try {
    const u = JSON.parse(storedUser) as User;
    // Si el token existe, leer role directamente del JWT (más fiable que el localStorage)
    if (state.token) {
      const payload = decodeJWT(state.token);
      if (payload?.role) u.role = payload.role as string;
    }
    state.user = u;
  } catch {}
}

export const authStore = {
  getUser: (): User | null => state.user,
  getToken: (): string | null => state.token,
  isLoggedIn: (): boolean => !!state.token,

  // Lee el role directamente del JWT, no del objeto user guardado
  isAdmin: (): boolean => {
    if (!state.token) return false;
    const payload = decodeJWT(state.token);
    return payload?.role === 'admin';
  },

  login(token: string, user: User) {
    // Fusionar role del JWT con el objeto user antes de guardar
    const payload = decodeJWT(token);
    if (payload?.role) user.role = payload.role as string;
    if (payload?.is_banned !== undefined) user.is_banned = payload.is_banned as boolean;

    state.token = token;
    state.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  updateUser(user: User) {
    // Preservar role del JWT al actualizar
    if (state.token) {
      const payload = decodeJWT(state.token);
      if (payload?.role) user.role = payload.role as string;
    }
    state.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
