import { t } from '../i18n/translations.js';
import { escapeHTML, formatIDR } from '../utils/formatters.js';
import { createIllustrationDataUrl, makePlaceholderImg } from '../utils/illustrations.js';
import { renderItinerary } from './itinerary.js';
import { showToast } from './modals.js';
import { store } from './store.js';

export function renderPackages() {
  const interestEl = document.getElementById('pkgInterestSelect');
  const maxBudgetEl = document.getElementById('pkgMaxBudgetInput');
  const grid = document.getElementById('packagesGrid');
  if (!grid) return;

  const interest = interestEl instanceof HTMLSelectElement ? interestEl.value : 'ALL';
  const maxBudget =
    maxBudgetEl instanceof HTMLInputElement && Number(maxBudgetEl.value) > 0
      ? Number(maxBudgetEl.value)
      : Infinity;

  const scored = store.paket
    .map((pkg) => {
      const interests = pkg.minatUtama || [];
      const matchesInterest = interest === 'ALL' || interests.includes(interest);
      const withinBudget = (Number(pkg.estimasiBiaya) || 0) <= maxBudget;
      let score = 0;
      if (matchesInterest) score += 2;
      if (withinBudget) score += 2;
      return { pkg, matchesInterest, withinBudget, score };
    })
    .filter((item) => item.matchesInterest && item.withinBudget)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-box">
        <p>${escapeHTML(t(store.lang, 'noPackageMatch'))}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = scored
    .map(({ pkg }) => {
      const title = store.lang === 'en' && pkg.namaEn ? pkg.namaEn : pkg.nama;
      const desc = store.lang === 'en' && pkg.deskripsiEn ? pkg.deskripsiEn : pkg.deskripsi;
      const destObjs = (pkg.daftarDestinasi || [])
        .map((id) => store.destinasi.find((d) => d.id === id))
        .filter(Boolean);
      const destNames = destObjs.map((d) => (store.lang === 'en' && d.namaEn ? d.namaEn : d.nama));
      const days = Number(pkg.durasi) || 1;
      const pkgImg =
        (destObjs[0] && destObjs[0].imageUrl) ||
        createIllustrationDataUrl(title, `${days} Hari · Paket Simulasi`, 'sea');
      const fallback = makePlaceholderImg(title);

      return `
        <article class="catalog-card">
          <div class="card-media">
            <img
              src="${escapeHTML(pkgImg)}"
              alt="${escapeHTML(title)}"
              loading="lazy"
              referrerpolicy="no-referrer"
              data-fallback="${escapeHTML(fallback)}"
              class="js-fallback-img"
            />
          </div>

          <div class="card-body">
            <div>
              <div class="meta-line">
                <span>${escapeHTML(t(store.lang, 'daysUnit', { days }))}</span>
                <span class="meta-sep" aria-hidden="true">·</span>
                <span>${escapeHTML((pkg.minatUtama || []).join(' / '))}</span>
              </div>
              <h3 class="card-title">${escapeHTML(title)}</h3>
              <p class="card-desc">${escapeHTML(desc)}</p>

              ${
                destNames.length
                  ? `<div class="card-notes">
                      <span><strong>${escapeHTML(t(store.lang, 'pkgRouteLabel'))}</strong> ${escapeHTML(
                      destNames.join(' → ')
                    )}</span>
                    </div>`
                  : ''
              }
            </div>

            <div class="card-footer">
              <div>
                <div class="price-label">${escapeHTML(t(store.lang, 'pkgEstimateLabel'))}</div>
                <div class="price-value tabular-nums">${escapeHTML(formatIDR(pkg.estimasiBiaya))}</div>
              </div>
              <button
                type="button"
                data-action="apply-package"
                data-id="${escapeHTML(pkg.id)}"
                class="btn btn-accent btn-sm"
              >
                ${escapeHTML(t(store.lang, 'usePackageBtn'))}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

export function applyPackageToItinerary(pkgId) {
  const pkg = store.paket.find((p) => p.id === pkgId);
  if (!pkg) return;

  const days = Math.min(5, Math.max(1, Number(pkg.durasi) || 2));
  store.itinerary.jumlahHari = days;
  store.itinerary.namaPerjalanan = store.lang === 'en' && pkg.namaEn ? pkg.namaEn : pkg.nama;
  store.itinerary.daftarAktivitas = (pkg.daftarDestinasi || []).map((destId, index) => {
    const d = store.destinasi.find((item) => item.id === destId);
    return {
      uid: `act-pkg-${Date.now()}-${index}`,
      hari: Math.min(days, (index % days) + 1),
      tipeItem: 'destinasi',
      itemId: destId,
      nama: d ? d.nama : `Destinasi (${destId})`,
      biayaSatuan: d ? Number(d.estimasiBiaya) || 0 : 0,
    };
  });

  renderItinerary();
  showToast(
    store.lang === 'en'
      ? `Package "${pkg.namaEn || pkg.nama}" loaded into Itinerary.`
      : `Paket "${pkg.nama}" dimuat ke Itinerary.`
  );
  document.getElementById('itinerary-section')?.scrollIntoView({ behavior: 'smooth' });
}

export function bindPackageEvents() {
  const interestEl = document.getElementById('pkgInterestSelect');
  const maxBudgetEl = document.getElementById('pkgMaxBudgetInput');
  const grid = document.getElementById('packagesGrid');

  interestEl?.addEventListener('change', renderPackages);
  maxBudgetEl?.addEventListener('input', renderPackages);

  grid?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest('[data-action="apply-package"]');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (id) applyPackageToItinerary(id);
    }
  });
}
