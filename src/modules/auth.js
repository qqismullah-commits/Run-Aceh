import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase.js';
import { t } from '../i18n/translations.js';
import { escapeHTML, formatIDR } from '../utils/formatters.js';
import { closeModal, openModal, showToast } from './modals.js';
import { store } from './store.js';

const authState = {
  user: null,
  ready: false,
  registrations: [],
  unsubscribeRegs: null,
  isSubmitting: false,
};

const ALLOWED_JERSEY_SIZES = new Set(['S', 'M', 'L', 'XL']);
const ALLOWED_PAYMENT_METHODS = new Set(['QRIS', 'Transfer Bank', 'Virtual Account']);

function sanitizeStr(val, maxLen, fallback = '') {
  const str = String(val ?? '').trim();
  return (str || fallback).slice(0, maxLen);
}

export function getCurrentUser() {
  return authState.user;
}

export function getRegistrationForRun(runId) {
  return (
    authState.registrations.find((r) => r.runId === runId && r.status === 'registered') || null
  );
}

export function isRegisteredForRun(runId) {
  return Boolean(getRegistrationForRun(runId));
}

function generateRegistrationNumber(runName) {
  const distMatch = String(runName || '').match(/(\d+\s*k)/i);
  const distCode = distMatch ? distMatch[1].replace(/\s+/g, '').toUpperCase() : 'RUN';
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `RUN-${distCode}-${suffix}`.replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

async function syncUserProfile(user) {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = sanitizeStr(
    user.displayName || user.email?.split('@')[0],
    120,
    'Pelari RUN ACEH'
  );
  const email = sanitizeStr(user.email, 254, 'user@runaceh.local');
  const photoURL = user.photoURL ? sanitizeStr(user.photoURL, 500) : '';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const payload = {
        uid: user.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(userRef, payload);
    } else {
      const payload = {
        displayName,
        email,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await updateDoc(userRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

function detachRegistrationsListener() {
  if (typeof authState.unsubscribeRegs === 'function') {
    authState.unsubscribeRegs();
    authState.unsubscribeRegs = null;
  }
}

function attachRegistrationsListener(uid) {
  detachRegistrationsListener();
  const regsPath = `users/${uid}/registrations`;
  const regsQuery = query(
    collection(db, 'users', uid, 'registrations'),
    where('userId', '==', uid)
  );

  authState.unsubscribeRegs = onSnapshot(
    regsQuery,
    (snapshot) => {
      authState.registrations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAuthUI();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, regsPath);
    }
  );
}

export async function loginWithGoogle({ keepCurrentModal = false } = {}) {
  if (authState.isSubmitting) return null;
  authState.isSubmitting = true;
  renderAuthUI();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    authState.user = result.user;
    showToast(
      store.lang === 'en'
        ? `Signed in as ${result.user.displayName || result.user.email}.`
        : `Berhasil masuk sebagai ${result.user.displayName || result.user.email}.`
    );
    if (!keepCurrentModal) {
      closeModal('authModal');
    }
    return result.user;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      showToast(
        store.lang === 'en' ? 'Sign-in cancelled.' : 'Proses masuk dibatalkan.',
        'warn'
      );
    } else {
      console.error('Auth error:', error);
      showToast(
        store.lang === 'en'
          ? 'Sign-in failed. Please try again.'
          : 'Gagal masuk dengan Google. Silakan coba lagi.',
        'warn'
      );
    }
    return null;
  } finally {
    authState.isSubmitting = false;
    renderAuthUI();
  }
}

export async function logoutUser() {
  if (authState.isSubmitting) return;
  authState.isSubmitting = true;
  renderAuthUI();

  try {
    detachRegistrationsListener();
    await signOut(auth);
    authState.registrations = [];
    closeModal('authModal');
    showToast(store.lang === 'en' ? 'Signed out.' : 'Anda telah keluar.');
  } catch (error) {
    console.error('Sign-out error:', error);
    showToast(store.lang === 'en' ? 'Failed to sign out.' : 'Gagal keluar akun.', 'warn');
  } finally {
    authState.isSubmitting = false;
    renderAuthUI();
  }
}

export async function completeRunPaymentAndRegister({
  dest,
  participantName,
  jerseySize,
  paymentMethod,
}) {
  if (!dest) return null;

  let user = authState.user;
  if (!user) {
    user = await loginWithGoogle({ keepCurrentModal: true });
    if (!user) return null;
  }

  const cleanName = sanitizeStr(participantName || user.displayName, 120, 'Pelari RUN ACEH');
  const cleanSize = ALLOWED_JERSEY_SIZES.has(jerseySize) ? jerseySize : 'M';
  const cleanMethod = ALLOWED_PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : 'QRIS';
  const regNumber = generateRegistrationNumber(dest.nama);
  const fee = Math.min(100000000, Math.max(0, Number(dest.estimasiBiaya) || 0));

  const regPath = `users/${user.uid}/registrations/${dest.id}`;
  const regRef = doc(db, 'users', user.uid, 'registrations', dest.id);

  try {
    await syncUserProfile(user);
    const payload = {
      userId: user.uid,
      runId: sanitizeStr(dest.id, 128),
      runName: sanitizeStr(dest.nama, 120, 'RUN ACEH'),
      participantName: cleanName,
      registrationNumber: regNumber,
      jerseySize: cleanSize,
      paymentMethod: cleanMethod,
      paymentStatus: 'paid',
      estimasiBiaya: fee,
      status: 'registered',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(regRef, payload);

    const localReceipt = { id: dest.id, ...payload };
    authState.registrations = [
      ...authState.registrations.filter((r) => r.runId !== dest.id),
      localReceipt,
    ];
    renderAuthUI();

    showToast(
      store.lang === 'en'
        ? `Payment completed! Reg No: ${regNumber}`
        : `Pembayaran selesai! No. Pendaftaran: ${regNumber}`
    );
    return localReceipt;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, regPath);
    return null;
  }
}

export async function cancelRunRegistration(runId) {
  const user = authState.user;
  if (!user || !runId) return;

  const regPath = `users/${user.uid}/registrations/${runId}`;
  const regRef = doc(db, 'users', user.uid, 'registrations', runId);
  try {
    await deleteDoc(regRef);
    showToast(
      store.lang === 'en' ? 'Registration cancelled.' : 'Pendaftaran lari dibatalkan.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, regPath);
  }
}

export function openAuthModal() {
  renderAuthModalBody();
  openModal('authModal');
}

function renderAuthModalBody() {
  const titleEl = document.getElementById('authModalTitle');
  const bodyEl = document.getElementById('authModalBody');
  if (!bodyEl) return;

  const user = authState.user;
  if (!user) {
    if (titleEl) {
      titleEl.textContent = store.lang === 'en' ? 'Runner Account Sign In' : 'Masuk Akun Pelari';
    }
    bodyEl.innerHTML = `
      <p style="font-size: 0.9375rem; color: var(--color-text-secondary);">
        ${
          store.lang === 'en'
            ? 'Sign in with your Google account to save your runner profile and register for RUN ACEH distance categories.'
            : 'Masuk dengan akun Google Anda untuk menyimpan profil pelari dan memesan kategori lari RUN ACEH.'
        }
      </p>
      <button
        id="googleSignInBtn"
        type="button"
        class="btn btn-primary"
        style="width: 100%;"
        ${authState.isSubmitting ? 'disabled' : ''}
      >
        ${
          authState.isSubmitting
            ? store.lang === 'en'
              ? 'Signing in...'
              : 'Sedang masuk...'
            : store.lang === 'en'
            ? 'Continue with Google'
            : 'Masuk dengan Google'
        }
      </button>
    `;
    return;
  }

  if (titleEl) {
    titleEl.textContent = store.lang === 'en' ? 'My Runner Account' : 'Akun Pelari Saya';
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Pelari';
  const email = user.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const regs = authState.registrations.filter((r) => r.status === 'registered');

  const regsHtml =
    regs.length === 0
      ? `<p style="font-size: 0.875rem; color: var(--color-text-muted); padding: 0.75rem; background: var(--color-surface-subtle); border-radius: var(--radius-sm); border: var(--border-hairline);">
          ${
            store.lang === 'en'
              ? 'No run registrations yet. Click Book RUN on any category to register and pay.'
              : 'Belum ada pendaftaran lari. Klik Pesan RUN pada pilihan lari untuk mendaftar dan melakukan pembayaran.'
          }
        </p>`
      : regs
          .map(
            (reg) => `
            <div class="activity-row" style="padding: 0.75rem;">
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--color-emerald-950); font-size: 0.9375rem;">${escapeHTML(reg.runName)}</div>
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.125rem;">
                  ${escapeHTML(reg.participantName || displayName)} · <strong style="font-family: var(--font-mono); color: var(--color-emerald-900);">${escapeHTML(reg.registrationNumber || '-')}</strong>
                </div>
                <div class="tabular-nums" style="font-size: 0.75rem; color: var(--color-emerald-800); font-weight: 600; margin-top: 0.125rem;">
                  Selesai Pembayaran · ${escapeHTML(formatIDR(reg.estimasiBiaya))}
                </div>
              </div>
              <button
                type="button"
                data-action="cancel-reg"
                data-run-id="${escapeHTML(reg.runId)}"
                class="btn btn-danger btn-sm"
              >
                ${store.lang === 'en' ? 'Cancel' : 'Batalkan'}
              </button>
            </div>
          `
          )
          .join('');

  bodyEl.innerHTML = `
    <div class="auth-profile-card">
      ${
        user.photoURL
          ? `<img src="${escapeHTML(user.photoURL)}" alt="${escapeHTML(displayName)}" class="auth-avatar" referrerpolicy="no-referrer" />`
          : `<div class="auth-avatar auth-avatar--fallback">${escapeHTML(initial)}</div>`
      }
      <div style="min-width: 0; flex: 1;">
        <div style="font-weight: 700; color: var(--color-emerald-950); font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(displayName)}</div>
        <div style="font-size: 0.8125rem; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(email)}</div>
      </div>
    </div>

    <div>
      <div class="field-label" style="margin-bottom: 0.5rem;">
        ${store.lang === 'en' ? 'My Registered Runs' : 'Pendaftaran Lari Saya'} (${regs.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${regsHtml}
      </div>
    </div>

    <div class="modal-footer-actions" style="justify-content: flex-end;">
      <button
        id="authLogoutBtn"
        type="button"
        class="btn btn-danger btn-sm"
        ${authState.isSubmitting ? 'disabled' : ''}
      >
        ${store.lang === 'en' ? 'Sign Out' : 'Keluar'}
      </button>
    </div>
  `;
}

export function renderAuthUI() {
  const headerBtn = document.getElementById('headerAuthBtn');
  if (headerBtn) {
    const user = authState.user;
    if (!authState.ready) {
      headerBtn.textContent = t(store.lang, 'loginBtn');
    } else if (!user) {
      headerBtn.innerHTML = `<span>${escapeHTML(t(store.lang, 'loginBtn'))}</span>`;
      headerBtn.classList.remove('auth-user-btn--signed-in');
    } else {
      const name = user.displayName || user.email?.split('@')[0] || 'Akun';
      const firstWord = name.split(' ')[0].slice(0, 14);
      const initial = name.charAt(0).toUpperCase();
      headerBtn.innerHTML = user.photoURL
        ? `<img src="${escapeHTML(user.photoURL)}" alt="" class="header-auth-avatar" referrerpolicy="no-referrer" /><span>${escapeHTML(firstWord)}</span>`
        : `<span class="header-auth-initial">${escapeHTML(initial)}</span><span>${escapeHTML(firstWord)}</span>`;
      headerBtn.classList.add('auth-user-btn--signed-in');
    }
  }

  const orderAuthGate = document.getElementById('orderAuthGateBox');
  const nameInput = document.getElementById('bookingParticipantName');
  const goToPayBtn = document.getElementById('modalGoToPaymentBtn');
  if (orderAuthGate) {
    orderAuthGate.classList.toggle('is-hidden', Boolean(authState.user));
  }
  if (goToPayBtn) {
    goToPayBtn.textContent = authState.user
      ? store.lang === 'en'
        ? 'Proceed to Payment →'
        : 'Lanjut ke Pembayaran →'
      : store.lang === 'en'
      ? 'Sign In & Continue →'
      : 'Login & Lanjut Pembayaran →';
  }
  if (
    authState.user &&
    nameInput instanceof HTMLInputElement &&
    !nameInput.value.trim() &&
    authState.user.displayName
  ) {
    nameInput.value = authState.user.displayName;
  }

  const payAuthHint = document.getElementById('payAuthHint');
  const confirmPayBtn = document.getElementById('modalConfirmPayBtn');
  if (payAuthHint && confirmPayBtn) {
    payAuthHint.classList.add('is-hidden');
    confirmPayBtn.textContent = store.lang === 'en' ? 'Pay Now' : 'Bayar Sekarang';
  }

  // Strictly block Step 2 (payment page) when signed out
  if (!authState.user) {
    const step1 = document.getElementById('runOrderStep1');
    const step2 = document.getElementById('runOrderStep2');
    if (step2 && !step2.classList.contains('is-hidden')) {
      step2.classList.add('is-hidden');
      step1?.classList.remove('is-hidden');
      document.querySelectorAll('#checkoutStepBar [data-step-indicator]').forEach((el) => {
        const n = Number(el.getAttribute('data-step-indicator'));
        el.classList.toggle('is-active', n === 1);
        el.classList.toggle('is-done', false);
      });
    }
  }

  const authModal = document.getElementById('authModal');
  if (authModal && !authModal.classList.contains('is-hidden')) {
    renderAuthModalBody();
  }
}

export function initAuth() {
  const headerBtn = document.getElementById('headerAuthBtn');
  const authBody = document.getElementById('authModalBody');
  const step1LoginBtn = document.getElementById('orderStep1LoginBtn');

  headerBtn?.addEventListener('click', () => {
    openAuthModal();
  });

  step1LoginBtn?.addEventListener('click', () => {
    loginWithGoogle({ keepCurrentModal: true });
  });

  authBody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('#googleSignInBtn')) {
      loginWithGoogle();
      return;
    }

    if (target.closest('#authLogoutBtn')) {
      logoutUser();
      return;
    }

    const cancelBtn = target.closest('[data-action="cancel-reg"]');
    if (cancelBtn) {
      const runId = cancelBtn.getAttribute('data-run-id');
      if (runId) cancelRunRegistration(runId);
    }
  });

  onAuthStateChanged(auth, async (user) => {
    authState.user = user;
    authState.ready = true;

    if (user) {
      try {
        await syncUserProfile(user);
        attachRegistrationsListener(user.uid);
      } catch (err) {
        console.error('Failed syncing user profile:', err);
      }
    } else {
      detachRegistrationsListener();
      authState.registrations = [];
    }

    renderAuthUI();
  });
}
