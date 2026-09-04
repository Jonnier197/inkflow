import { userApi } from '../services/api.js';
import { authStore } from '../utils/authStore.js';
import { navigate } from '../utils/router.js';

export async function renderSettingsPage(container: HTMLElement) {
  const currentUser = authStore.getUser();

  container.innerHTML = `
    <div class="settings-layout">
      <div class="settings-card">
        <h1>Configuración de perfil</h1>
        <div class="settings-avatar-preview">
          <img id="avatarPreview"
            src="${currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.username}&background=6366f1&color=fff&size=80`}"
            alt="Avatar" class="profile-avatar-lg" />
        </div>
        <form id="settingsForm" novalidate>
          <div class="form-group">
            <label>Nombre de usuario</label>
            <input type="text" id="username" value="${currentUser?.username || ''}" minlength="3" required />
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" value="${currentUser?.email || ''}" disabled />
            <small>El correo no puede ser modificado</small>
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea id="bio" rows="3">${currentUser?.bio || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Avatar URL</label>
            <input type="url" id="avatar_url" value="${currentUser?.avatar_url || ''}" placeholder="https://..." />
          </div>
          <div id="settingsError" class="form-error hidden"></div>
          <div id="settingsSuccess" class="form-success hidden">¡Perfil actualizado correctamente!</div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelSettingsBtn">Cancelar</button>
            <button type="submit" class="btn-primary" id="saveBtn">Guardar cambios</button>
          </div>
        </form>

        <hr class="settings-divider" />
        <div class="danger-zone">
          <h3>Zona de peligro</h3>
          <p>Eliminar tu cuenta es irreversible. Se borrarán todos tus posts, comentarios y likes.</p>
          <button class="btn-danger" id="deleteAccountBtn">Eliminar mi cuenta</button>
          <div id="deleteError" class="form-error hidden" style="margin-top:0.75rem"></div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#cancelSettingsBtn')?.addEventListener('click', () => history.back());

  // Avatar preview en tiempo real
  const avatarInput = container.querySelector('#avatar_url') as HTMLInputElement;
  const avatarPreview = container.querySelector('#avatarPreview') as HTMLImageElement;
  avatarInput?.addEventListener('input', () => {
    if (avatarInput.value) avatarPreview.src = avatarInput.value;
  });

  const form = container.querySelector('#settingsForm') as HTMLFormElement;
  const errorDiv = container.querySelector('#settingsError') as HTMLElement;
  const successDiv = container.querySelector('#settingsSuccess') as HTMLElement;
  const saveBtn = container.querySelector('#saveBtn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (form.querySelector('#username') as HTMLInputElement).value.trim();
    const bio = (form.querySelector('#bio') as HTMLTextAreaElement).value.trim();
    const avatar_url = (form.querySelector('#avatar_url') as HTMLInputElement).value.trim() || undefined;

    if (!username) {
      errorDiv.textContent = 'El nombre de usuario es obligatorio';
      errorDiv.classList.remove('hidden');
      return;
    }

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      const updated = await userApi.updateMe({ username, bio, avatar_url });
      authStore.updateUser(updated);
      successDiv.classList.remove('hidden');
      // Actualizar preview de avatar en navbar
      const navAvatar = document.querySelector('.nav-avatar') as HTMLImageElement;
      if (navAvatar && updated.avatar_url) navAvatar.src = updated.avatar_url;
    } catch (err: unknown) {
      errorDiv.textContent = err instanceof Error ? err.message : 'Error al guardar';
      errorDiv.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  });

  // Eliminar cuenta — bug fix: manejar respuesta 204 (sin body)
  const deleteAccountBtn = container.querySelector('#deleteAccountBtn') as HTMLButtonElement;
  const deleteError = container.querySelector('#deleteError') as HTMLElement;

  deleteAccountBtn.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro? Esta acción es irreversible y eliminará toda tu información.')) return;
    if (!confirm('Última confirmación. ¿Eliminar cuenta definitivamente?')) return;

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = 'Eliminando...';
    deleteError.classList.add('hidden');

    try {
      const token = authStore.getToken();
      // Llamada directa fetch para manejar 204 sin body correctamente
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        authStore.logout();
        navigate('/register');
      } else {
        let msg = 'Error al eliminar la cuenta';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {}
        deleteError.textContent = msg;
        deleteError.classList.remove('hidden');
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.textContent = 'Eliminar mi cuenta';
      }
    } catch (err: unknown) {
      deleteError.textContent = err instanceof Error ? err.message : 'Error de conexión';
      deleteError.classList.remove('hidden');
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = 'Eliminar mi cuenta';
    }
  });
}
