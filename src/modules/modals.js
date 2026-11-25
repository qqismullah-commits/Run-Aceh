import { escapeHTML } from '../utils/formatters.js';

let lastFocusedElement = null;
let confirmCallback = null;

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type === 'warn' ? 'toast-item--warn' : ''}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    window.setTimeout(() => toast.remove(), 220);
  }, 2800);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.remove('is-hidden');
  document.body.classList.add('modal-open');

  const closeBtn = modal.querySelector('[data-close-modal]');
  if (closeBtn instanceof HTMLElement) {
    closeBtn.focus();
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('is-hidden');

  const anyOpen = document.querySelectorAll('.modal-backdrop:not(.is-hidden)').length > 0;
  if (!anyOpen) {
    document.body.classList.remove('modal-open');
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

export function openConfirmModal({ title, message, confirmLabel, onConfirm }) {
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMessage');
  const okBtn = document.getElementById('confirmModalOkBtn');
  if (!titleEl || !msgEl || !okBtn) return;

  titleEl.textContent = title;
  msgEl.textContent = message;
  okBtn.textContent = confirmLabel || 'Konfirmasi';
  confirmCallback = typeof onConfirm === 'function' ? onConfirm : null;

  openModal('confirmModal');
}

export function initModalSystem(onCloseDetail) {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const closeBtn = target.closest('[data-close-modal]');
    if (closeBtn) {
      const modal = closeBtn.closest('.modal-backdrop');
      if (modal) {
        if (modal.id === 'detailModal' && typeof onCloseDetail === 'function') {
          onCloseDetail();
        }
        closeModal(modal.id);
      }
      return;
    }

    if (target.classList.contains('modal-backdrop')) {
      if (target.id === 'detailModal' && typeof onCloseDetail === 'function') {
        onCloseDetail();
      }
      closeModal(target.id);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openModals = Array.from(document.querySelectorAll('.modal-backdrop:not(.is-hidden)'));
    const topModal = openModals[openModals.length - 1];
    if (topModal) {
      if (topModal.id === 'detailModal' && typeof onCloseDetail === 'function') {
        onCloseDetail();
      }
      closeModal(topModal.id);
    }
  });

  const confirmOkBtn = document.getElementById('confirmModalOkBtn');
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
      const cb = confirmCallback;
      confirmCallback = null;
      closeModal('confirmModal');
      if (cb) cb();
    });
  }
}

export function openWhatsAppDemoModal(entityName, contactText, lang = 'id') {
  const titleEl = document.getElementById('waModalTitle');
  const contactEl = document.getElementById('waModalContact');
  const draftEl = document.getElementById('waDraftMessage');
  if (!titleEl || !contactEl || !draftEl) return;

  titleEl.textContent = `${entityName} (${lang === 'en' ? 'Simulated Contact' : 'Simulasi Kontak'})`;
  contactEl.innerHTML = escapeHTML(contactText);
  draftEl.value =
    lang === 'en'
      ? `Hello ${entityName}, I would like to ask about availability and details (simulated inquiry).`
      : `Halo ${entityName}, saya ingin menanyakan informasi ketersediaan dan layanan (pesan simulasi).`;

  openModal('waDemoModal');
}
