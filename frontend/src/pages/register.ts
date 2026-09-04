import { authApi } from '../services/api.js';
import { authStore } from '../utils/authStore.js';
import { navigate } from '../utils/router.js';

export function renderRegisterPage(container: HTMLElement) {
  container.innerHTML = `
    <div class="auth-layout">
      <div class="auth-side">
        <div class="auth-brand">
          <span class="brand-icon-lg">✦</span>
          <h1>Inkflow</h1>
          <p>Únete a miles de escritores y lectores. Comparte tus ideas con el mundo.</p>
        </div>
      </div>
      <div class="auth-form-side">
        <div class="auth-card">
          <h2>Crear cuenta</h2>
          <p class="auth-sub">Es gratis y siempre lo será</p>
          <form id="registerForm" novalidate>
            <div class="form-group">
              <label for="username">Nombre de usuario</label>
              <input type="text" id="username" placeholder="@usuario" minlength="3" required />
            </div>
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input type="email" id="email" placeholder="tu@email.com" required />
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input type="password" id="password" placeholder="Mínimo 6 caracteres" minlength="6" required />
            </div>
            <div class="form-group">
              <label for="bio">Bio <span class="optional">(opcional)</span></label>
              <textarea id="bio" placeholder="Cuéntanos algo sobre ti..." rows="2"></textarea>
            </div>
            <div id="registerError" class="form-error hidden"></div>
            <button type="submit" class="btn-primary btn-full" id="registerBtn">Crear cuenta</button>
          </form>
          <p class="auth-switch">¿Ya tienes cuenta? <a href="/login" data-link>Inicia sesión</a></p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#registerForm') as HTMLFormElement;
  const errorDiv = container.querySelector('#registerError') as HTMLElement;
  const btn = container.querySelector('#registerBtn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (form.querySelector('#username') as HTMLInputElement).value.trim();
    const email = (form.querySelector('#email') as HTMLInputElement).value.trim();
    const password = (form.querySelector('#password') as HTMLInputElement).value;
    const bio = (form.querySelector('#bio') as HTMLTextAreaElement).value.trim();
    errorDiv.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';
    try {
      const data = await authApi.register({ username, email, password, bio });
      authStore.login(data.token, data.user);
      navigate('/feed');
    } catch (err: unknown) {
      errorDiv.textContent = err instanceof Error ? err.message : 'Error al registrarse';
      errorDiv.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Crear cuenta';
    }
  });
}
