import './styles/main.css';

import { STORAGE_KEYS } from './data/seedData.js';
import { I18N, t } from './i18n/translations.js';
import { initAuth, renderAuthUI } from './modules/auth.js';
import {
  bindCatalogEvents,
  renderCulinaryAndAccommodation,
  renderDestinations,
  updateStatsAndBadges,
} from './modules/catalog.js';
import { bindCrudEvents, renderCrudTable } from './modules/crud.js';
import { bindItineraryEvents, renderItinerary } from './modules/itinerary.js';
import { bindMapEvents, renderRegionCards } from './modules/map.js';
import { initModalSystem, showToast } from './modules/modals.js';
import { bindPackageEvents, renderPackages } from './modules/packages.js';
import { persistKey, store, subscribe } from './modules/store.js';
import { copyTextToClipboard } from './utils/formatters.js';

function applyLanguage() {
  const dict = I18N[store.lang] || I18N.id;
  document.documentElement.lang = store.lang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (key && dict[key] !== undefined) {
      node.innerHTML = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key && dict[key] !== undefined && node instanceof HTMLInputElement) {
      node.placeholder = dict[key];
    }
  });

  const regionAllOpt = document.querySelector('#regionSelect option[value="ALL"]');
  if (regionAllOpt) regionAllOpt.textContent = t(store.lang, 'allRegions');

  const sortMap = {
    featured: 'sortFeatured',
    priceAsc: 'sortPriceAsc',
    priceDesc: 'sortPriceDesc',
    nameAsc: 'sortNameAsc',
  };
  Object.entries(sortMap).forEach(([val, key]) => {
    const opt = document.querySelector(`#sortSelect option[value="${val}"]`);
    if (opt) opt.textContent = t(store.lang, key);
  });

  const pkgAllOpt = document.querySelector('#pkgInterestSelect option[value="ALL"]');
  if (pkgAllOpt) pkgAllOpt.textContent = t(store.lang, 'allInterests');

  const idBtn = document.getElementById('langIdBtn');
  const enBtn = document.getElementById('langEnBtn');
  idBtn?.classList.toggle('is-active', store.lang === 'id');
  idBtn?.setAttribute('aria-pressed', store.lang === 'id' ? 'true' : 'false');
  enBtn?.classList.toggle('is-active', store.lang === 'en');
  enBtn?.setAttribute('aria-pressed', store.lang === 'en' ? 'true' : 'false');

  persistKey(STORAGE_KEYS.LANG, store.lang);
  refreshAllViews();
}

function refreshAllViews() {
  updateStatsAndBadges();
  renderDestinations();
  renderRegionCards();
  renderCulinaryAndAccommodation();
  renderItinerary();
  renderPackages();
  renderCrudTable();
  renderAuthUI();
}

function bindGlobalUtilities() {
  document.getElementById('langIdBtn')?.addEventListener('click', () => {
    if (store.lang !== 'id') {
      store.lang = 'id';
      applyLanguage();
    }
  });

  document.getElementById('langEnBtn')?.addEventListener('click', () => {
    if (store.lang !== 'en') {
      store.lang = 'en';
      applyLanguage();
    }
  });

  document.getElementById('copyWaDraftBtn')?.addEventListener('click', async () => {
    const ta = document.getElementById('waDraftMessage');
    if (!(ta instanceof HTMLTextAreaElement)) return;
    const ok = await copyTextToClipboard(ta.value);
    if (ok) {
      showToast(
        store.lang === 'en'
          ? 'Simulated message draft copied.'
          : 'Draf pesan simulasi disalin ke clipboard.'
      );
    } else {
      ta.select();
      showToast(
        store.lang === 'en'
          ? 'Please copy the draft text manually.'
          : 'Silakan salin teks draf secara manual.',
        'warn'
      );
    }
  });

  // Resilient fallback for any image load failure without inline onerror attributes
  document.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLImageElement &&
        target.classList.contains('js-fallback-img') &&
        target.dataset.fallback &&
        target.src !== target.dataset.fallback
      ) {
        target.src = target.dataset.fallback;
      }
    },
    true
  );
}

function bootstrap() {
  subscribe(() => refreshAllViews());

  initModalSystem(() => {
    store.activeModalDestId = null;
  });

  bindGlobalUtilities();
  bindCatalogEvents(() => renderRegionCards());
  bindMapEvents();
  bindItineraryEvents();
  bindPackageEvents();
  bindCrudEvents();
  initAuth();

  applyLanguage();
}

document.addEventListener('DOMContentLoaded', bootstrap);
