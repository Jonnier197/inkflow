import { postApi } from '../services/api.js';
import { navigate } from '../utils/router.js';
import type { Post } from '../types/index.js';

export async function renderCreatePostPage(container: HTMLElement, postId?: number) {
  container.innerHTML = `<div class="loading-spinner">Cargando...</div>`;

  let existing: Post | null = null;
  if (postId) {
    try { existing = await postApi.getById(postId); } catch {}
  }

  const hasExistingImage = !!(existing?.image_url);

  container.innerHTML = `
    <div class="create-layout">
      <div class="create-card">
        <h1>${existing ? 'Editar Post' : 'Nuevo Post'}</h1>
        <form id="postForm" novalidate>
          <div class="form-group">
            <label>Título</label>
            <input type="text" id="title" placeholder="Un título llamativo..." maxlength="200" required
              value="${existing?.title || ''}" />
          </div>
          <div class="form-group">
            <label>Contenido</label>
            <textarea id="content" rows="12" placeholder="Escribe tu historia aquí..." required>${existing?.content || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Imagen URL <span class="optional">(opcional)</span></label>
            ${hasExistingImage ? `
              <div class="image-preview-wrapper" id="imagePreviewWrapper">
                <img src="${existing!.image_url}" alt="Imagen actual" class="image-thumb" />
                <div class="image-controls">
                  <span class="image-current-label">Imagen actual</span>
                  <button type="button" class="btn-danger btn-sm" id="removeImageBtn">✕ Quitar imagen</button>
                </div>
              </div>
              <input type="hidden" id="removeImage" value="false" />
              <input type="url" id="image_url" placeholder="O ingresa una nueva URL..." value="" class="mt-1" />
            ` : `
              <input type="url" id="image_url" placeholder="https://..." value="" />
            `}
          </div>
          <div class="form-group">
            <label>Tags <span class="optional">(separados por coma)</span></label>
            <input type="text" id="tags" placeholder="tecnología, programación, vida..."
              value="${existing?.tags?.join(', ') || ''}" />
          </div>
          <div class="form-group form-check">
            <label>
              <input type="checkbox" id="published" ${existing?.published !== false ? 'checked' : ''} />
              Publicar inmediatamente
            </label>
          </div>
          <div id="postError" class="form-error hidden"></div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancelar</button>
            <button type="submit" class="btn-primary" id="submitBtn">
              ${existing ? 'Guardar cambios' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#postForm') as HTMLFormElement;
  const errorDiv = container.querySelector('#postError') as HTMLElement;
  const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;

  container.querySelector('#cancelBtn')?.addEventListener('click', () => history.back());

  // Botón para quitar imagen existente
  const removeImageBtn = container.querySelector('#removeImageBtn');
  const removeImageInput = container.querySelector('#removeImage') as HTMLInputElement | null;
  const imagePreviewWrapper = container.querySelector('#imagePreviewWrapper');

  removeImageBtn?.addEventListener('click', () => {
    if (removeImageInput) removeImageInput.value = 'true';
    imagePreviewWrapper?.remove();
    removeImageBtn.remove();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (form.querySelector('#title') as HTMLInputElement).value.trim();
    const content = (form.querySelector('#content') as HTMLTextAreaElement).value.trim();
    const imageUrlInput = (form.querySelector('#image_url') as HTMLInputElement)?.value.trim();
    const removeImage = removeImageInput?.value === 'true';
    const tagsRaw = (form.querySelector('#tags') as HTMLInputElement).value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const published = (form.querySelector('#published') as HTMLInputElement).checked;

    if (!title || !content) {
      errorDiv.textContent = 'Título y contenido son obligatorios';
      errorDiv.classList.remove('hidden');
      return;
    }

    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = existing ? 'Guardando...' : 'Publicando...';

    try {
      if (existing) {
        // Pasamos removeImage para que el backend borre la imagen si el usuario la quitó
        const updateBody: Record<string, unknown> = { title, content, tags, published };
        if (removeImage) {
          updateBody.removeImage = true;
          updateBody.image_url = null;
        } else if (imageUrlInput) {
          updateBody.image_url = imageUrlInput;
        }
        await postApi.update(existing.id, updateBody as Parameters<typeof postApi.update>[1]);
        navigate(`/post/${existing.id}`);
      } else {
        const image_url = imageUrlInput || undefined;
        const post = await postApi.create({ title, content, image_url, tags, published });
        navigate(`/post/${post.id}`);
      }
    } catch (err: unknown) {
      errorDiv.textContent = err instanceof Error ? err.message : 'Error al guardar';
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = existing ? 'Guardar cambios' : 'Publicar';
    }
  });
}
