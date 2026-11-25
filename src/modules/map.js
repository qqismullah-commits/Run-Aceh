import { REGIONS } from '../data/seedData.js';
import { t } from '../i18n/translations.js';
import { escapeHTML, mapsSearchUrl } from '../utils/formatters.js';
import { getRegionThumbnail, makePlaceholderImg } from '../utils/illustrations.js';
import { renderDestinations } from './catalog.js';
import { showToast } from './modals.js';
import { store } from './store.js';

export function selectRegionFromMap(region) {
  const nextRegion = store.selectedRegion === region ? 'ALL' : region;
  store.selectedRegion = nextRegion;
  const regionSelect = document.getElementById('regionSelect');
  if (regionSelect instanceof HTMLSelectElement) {
    regionSelect.value = nextRegion;
  }

  renderDestinations();
  renderRegionCards();
  showToast(
    nextRegion === 'ALL'
      ? store.lang === 'en'
        ? 'Showing all regions.'
        : 'Menampilkan semua wilayah.'
      : store.lang === 'en'
      ? `Region filter active: ${nextRegion}`
      : `Filter wilayah aktif: ${nextRegion}`
  );

  const destSection = document.getElementById('destinasi-section');
  destSection?.scrollIntoView({ behavior: 'smooth' });
}

export function renderRegionCards() {
  const container = document.getElementById('regionCardsList');
  if (!container) return;

  container.innerHTML = REGIONS.map((reg) => {
    const count = store.destinasi.filter((d) => d.wilayah === reg).length;
    const isSelected = store.selectedRegion === reg;
    const thumb = getRegionThumbnail(reg);
    const fallback = makePlaceholderImg(reg);

    return `
      <div class="region-row ${isSelected ? 'is-selected' : ''}">
        <div class="region-row-info">
          <img
            src="${escapeHTML(thumb)}"
            alt="${escapeHTML(reg)}"
            data-fallback="${escapeHTML(fallback)}"
            class="region-thumb js-fallback-img"
          />
          <div style="min-width: 0;">
            <button
              type="button"
              data-action="select-region"
              data-region="${escapeHTML(reg)}"
              class="region-name-btn"
            >
              ${escapeHTML(reg)}
            </button>
            <div class="region-count tabular-nums">${escapeHTML(
              t(store.lang, 'registeredCount', { count })
            )}</div>
          </div>
        </div>
        <div class="region-actions">
          <button
            type="button"
            data-action="select-region"
            data-region="${escapeHTML(reg)}"
            class="btn btn-primary btn-sm"
          >
            ${escapeHTML(t(store.lang, 'filterBtn'))}
          </button>
          <a
            href="${escapeHTML(mapsSearchUrl(`${reg} Aceh`))}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary btn-sm"
          >
            ${escapeHTML(t(store.lang, 'mapsBtn'))} ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

export function bindMapEvents() {
  const svgMap = document.getElementById('acehSvgMap');
  const regionList = document.getElementById('regionCardsList');

  svgMap?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const pin = target.closest('.map-pin[data-region]');
    if (pin) {
      const region = pin.getAttribute('data-region');
      if (region) selectRegionFromMap(region);
    }
  });

  svgMap?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const pin = target.closest('.map-pin[data-region]');
    if (pin) {
      event.preventDefault();
      const region = pin.getAttribute('data-region');
      if (region) selectRegionFromMap(region);
    }
  });

  regionList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest('[data-action="select-region"]');
    if (btn) {
      const region = btn.getAttribute('data-region');
      if (region) selectRegionFromMap(region);
    }
  });
}
