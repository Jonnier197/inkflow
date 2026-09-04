import { authApi } from '../services/api.js';
import { authStore } from '../utils/authStore.js';
import { navigate } from '../utils/router.js';

export function renderLoginPage(container: HTMLElement) {
  container.innerHTML = `
    <div class="auth-layout">
      <div class="auth-side">
        <div class="auth-brand">
          <span class="brand-icon-lg">✦</span>
          <h1>Inkflow</h1>
          <p>Tu espacio para escribir, compartir y conectar con otros.</p>
        </div>
      </div>
      <div class="auth-form-side">
        <div class="auth-card">
          <h2>Bienvenido de vuelta</h2>
          <p class="auth-sub">Inicia sesión para continuar</p>
          <form id="loginForm" novalidate>
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input type="email" id="email" name="email" placeholder="tu@email.com" required />
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required />
            </div>
            <div id="loginError" class="form-error hidden"></div>
            <button type="submit" class="btn-primary btn-full" id="loginBtn">Iniciar sesión</button>
          </form>
          <p class="auth-switch">¿No tienes cuenta? <a href="/register" data-link>Regístrate</a></p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#loginForm') as HTMLFormElement;
  const errorDiv = container.querySelector('#loginError') as HTMLElement;
  const loginBtn = container.querySelector('#loginBtn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (form.querySelector('#email') as HTMLInputElement).value.trim();
    const password = (form.querySelector('#password') as HTMLInputElement).value;
    errorDiv.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Iniciando...';
    try {
      const data = await authApi.login({ email, password });
      authStore.login(data.token, data.user);
      navigate('/feed');
    } catch (err: unknown) {
      errorDiv.textContent = err instanceof Error ? err.message : 'Error al iniciar sesión';
      errorDiv.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Iniciar sesión';
    }
  });
}
