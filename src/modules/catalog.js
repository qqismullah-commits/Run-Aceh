import { CATEGORIES, STORAGE_KEYS } from '../data/seedData.js';
import { t } from '../i18n/translations.js';
import {
  copyTextToClipboard,
  escapeHTML,
  formatIDR,
  mapsSearchUrl,
  safeExternalUrl,
} from '../utils/formatters.js';
import { makePlaceholderImg } from '../utils/illustrations.js';
import {
  completeRunPaymentAndRegister,
  getCurrentUser,
  getRegistrationForRun,
  loginWithGoogle,
  openAuthModal,
  renderAuthUI,
} from './auth.js';
import { closeModal, openModal, openWhatsAppDemoModal, showToast } from './modals.js';
import { persistKey, store } from './store.js';

export function isFavorite(itemId, tipeItem = 'destinasi') {
  return store.favorit.some((f) => f.itemId === itemId && f.tipeItem === tipeItem);
}

export function toggleFavorite(itemId, tipeItem = 'destinasi') {
  const idx = store.favorit.findIndex((f) => f.itemId === itemId && f.tipeItem === tipeItem);
  if (idx >= 0) {
    store.favorit.splice(idx, 1);
    showToast(store.lang === 'en' ? 'Removed from favorites.' : 'Dihapus dari favorit.');
  } else {
    store.favorit.unshift({
      id: `fav-${Date.now()}`,
      itemId,
      tipeItem,
      tanggalDitambahkan: new Date().toISOString(),
    });
    showToast(store.lang === 'en' ? 'Saved to favorites.' : 'Tersimpan ke favorit.');
  }
  persistKey(STORAGE_KEYS.FAVORIT, store.favorit);
  updateStatsAndBadges();
  renderDestinations();
  if (store.activeModalDestId === itemId) {
    syncModalFavoriteButton(itemId);
  }
}

export function updateStatsAndBadges() {
  const favBadge = document.getElementById('favCountBadge');
  const statFav = document.getElementById('statFavCount');
  const statDest = document.getElementById('statDestCount');
  const statKulAkom = document.getElementById('statKulAkomCount');

  if (favBadge) favBadge.textContent = String(store.favorit.length);
  if (statFav) statFav.textContent = String(store.favorit.length);
  if (statDest) statDest.textContent = String(store.destinasi.length);
  if (statKulAkom) statKulAkom.textContent = String(store.kuliner.length + store.akomodasi.length);
}

export function getFilteredSortedDestinations() {
  const q = store.searchQuery.trim().toLowerCase();
  const list = store.destinasi.filter((d) => {
    const matchesRegion = store.selectedRegion === 'ALL' || d.wilayah === store.selectedRegion;
    const matchesCat = store.selectedCategory === 'ALL' || d.kategori === store.selectedCategory;
    const haystack = [
      d.nama,
      d.namaEn,
      d.wilayah,
      d.kategori,
      d.deskripsi,
      d.deskripsiEn,
      d.alamat,
      ...(d.fasilitas || []),
      ...(d.fasilitasIbadah || []),
    ]
      .join(' ')
      .toLowerCase();
    return matchesRegion && matchesCat && (!q || haystack.includes(q));
  });

  if (store.sortBy === 'featured') {
    list.sort((a, b) => Number(Boolean(b.unggulan)) - Number(Boolean(a.unggulan)));
  } else if (store.sortBy === 'priceAsc') {
    list.sort((a, b) => (Number(a.estimasiBiaya) || 0) - (Number(b.estimasiBiaya) || 0));
  } else if (store.sortBy === 'priceDesc') {
    list.sort((a, b) => (Number(b.estimasiBiaya) || 0) - (Number(a.estimasiBiaya) || 0));
  } else if (store.sortBy === 'nameAsc') {
    list.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
  }

  return list;
}

export function renderCategoryChips() {
  const wrap = document.getElementById('categoryChips');
  if (!wrap) return;
  const items = ['ALL', ...CATEGORIES];

  wrap.innerHTML = items
    .map((cat) => {
      const active = store.selectedCategory === cat;
      const label = cat === 'ALL' ? t(store.lang, 'allCategories') : cat;
      return `
        <button
          type="button"
          data-action="select-category"
          data-cat="${escapeHTML(cat)}"
          aria-pressed="${active ? 'true' : 'false'}"
          class="cat-tab-btn ${active ? 'is-active' : ''}"
        >
          ${escapeHTML(label)}
        </button>
      `;
    })
    .join('');
}

export function renderDestinations() {
  renderCategoryChips();
  const grid = document.getElementById('destinationsGrid');
  const resultLabel = document.getElementById('resultCountLabel');
  if (!grid) return;

  const list = getFilteredSortedDestinations();
  if (resultLabel) {
    resultLabel.textContent = t(store.lang, 'showingCount', { count: list.length });
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-box">
        <p style="font-weight: 700;">${escapeHTML(t(store.lang, 'noDestinationsMatch'))}</p>
        <button type="button" data-action="reset-filters" class="btn btn-primary btn-sm">
          ${escapeHTML(t(store.lang, 'resetFilter'))}
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((d) => {
      const title = store.lang === 'en' && d.namaEn ? d.namaEn : d.nama;
      const desc = store.lang === 'en' && d.deskripsiEn ? d.deskripsiEn : d.deskripsi;
      const fav = isFavorite(d.id, 'destinasi');
      const fallbackImg = makePlaceholderImg(d.nama);
      const ibadahSummary = (d.fasilitasIbadah || [])[0] || 'Fasilitas Ibadah';
      const safeMaps = safeExternalUrl(d.mapsUrl, mapsSearchUrl(`${d.nama} ${d.wilayah}`));

      return `
        <article class="catalog-card">
          <div class="card-media">
            <img
              src="${escapeHTML(d.imageUrl || fallbackImg)}"
              alt="${escapeHTML(title)}"
              loading="lazy"
              referrerpolicy="no-referrer"
              data-fallback="${escapeHTML(fallbackImg)}"
              class="js-fallback-img"
            />
            <button
              type="button"
              data-action="toggle-fav"
              data-id="${escapeHTML(d.id)}"
              aria-label="${fav ? 'Hapus dari favorit' : 'Simpan ke favorit'}: ${escapeHTML(title)}"
              aria-pressed="${fav ? 'true' : 'false'}"
              class="card-fav-btn ${fav ? 'is-favorited' : ''}"
            >
              ♥
            </button>
          </div>

          <div class="card-body">
            ${
              d.compactCard
                ? ''
                : `<div>
              <div class="meta-line">
                <span>${escapeHTML(d.wilayah)}</span>
                <span class="meta-sep" aria-hidden="true">·</span>
                <span>${escapeHTML(d.kategori)}</span>
                ${
                  d.unggulan
                    ? `<span class="meta-sep" aria-hidden="true">·</span><span>${
                        store.lang === 'en' ? 'Featured' : 'Unggulan'
                      }</span>`
                    : ''
                }
              </div>
              <h3 class="card-title">${escapeHTML(title)}</h3>
              <p class="card-desc">${escapeHTML(desc)}</p>

              <div class="card-notes">
                <span class="card-note-highlight">${escapeHTML(ibadahSummary)}</span>
                <span class="card-note-warn">${escapeHTML(t(store.lang, 'unverifiedNote'))}</span>
              </div>
            </div>`
            }

            <div class="card-footer"${d.compactCard ? ' style="border-top: 0; padding-top: 0;"' : ''}>
              <div>
                <div class="price-label">${escapeHTML(t(store.lang, 'estimateSim'))}</div>
                <div class="price-value tabular-nums">${escapeHTML(formatIDR(d.estimasiBiaya))}</div>
              </div>
              <div class="card-actions">
                <a
                  href="${escapeHTML(safeMaps)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-sm"
                >
                  ${escapeHTML(t(store.lang, 'mapsBtn'))} ↗
                </a>
                <button
                  type="button"
                  data-action="open-detail"
                  data-id="${escapeHTML(d.id)}"
                  class="btn btn-primary btn-sm"
                >
                  ${escapeHTML(t(store.lang, 'detailBtn'))}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function setCheckoutStep(stepNum) {
  const step1 = document.getElementById('runOrderStep1');
  const step2 = document.getElementById('runOrderStep2');
  const step3 = document.getElementById('runOrderStep3');

  step1?.classList.toggle('is-hidden', stepNum !== 1);
  step2?.classList.toggle('is-hidden', stepNum !== 2);
  step3?.classList.toggle('is-hidden', stepNum !== 3);

  document.querySelectorAll('#checkoutStepBar [data-step-indicator]').forEach((el) => {
    const n = Number(el.getAttribute('data-step-indicator'));
    el.classList.toggle('is-active', n === stepNum);
    el.classList.toggle('is-done', n < stepNum);
  });
}

function showReceiptStep(receipt, dest) {
  const regNumEl = document.getElementById('receiptRegNumber');
  const nameEl = document.getElementById('receiptParticipantName');
  const runEl = document.getElementById('receiptRunName');
  const jerseyEl = document.getElementById('receiptJerseySize');
  const methodEl = document.getElementById('receiptPaymentMethod');
  const totalEl = document.getElementById('receiptTotalPaid');
  const copyBtn = document.getElementById('copyRegNumberBtn');
  const openAccBtn = document.getElementById('receiptOpenAccountBtn');

  const regNumber = receipt?.registrationNumber || '-';
  const participant = receipt?.participantName || getCurrentUser()?.displayName || 'Pelari';
  const runName = receipt?.runName || dest.nama;
  const jersey = receipt?.jerseySize || 'M';
  const method = receipt?.paymentMethod || 'QRIS';
  const total = receipt?.estimasiBiaya ?? dest.estimasiBiaya;

  if (regNumEl) regNumEl.textContent = regNumber;
  if (nameEl) nameEl.textContent = participant;
  if (runEl) runEl.textContent = runName;
  if (jerseyEl) jerseyEl.textContent = jersey;
  if (methodEl) methodEl.textContent = method;
  if (totalEl) totalEl.textContent = `${formatIDR(total)} (Simulasi)`;

  if (copyBtn) {
    copyBtn.onclick = async () => {
      const ok = await copyTextToClipboard(regNumber);
      showToast(
        ok
          ? store.lang === 'en'
            ? 'Registration number copied.'
            : 'Nomor pendaftaran disalin.'
          : regNumber
      );
    };
  }

  if (openAccBtn) {
    openAccBtn.onclick = () => {
      closeModal('detailModal');
      store.activeModalDestId = null;
      openAuthModal();
    };
  }

  setCheckoutStep(3);
}

export function openDestinationModal(id) {
  const dest = store.destinasi.find((d) => d.id === id);
  if (!dest) return;
  store.activeModalDestId = id;

  const title = store.lang === 'en' && dest.namaEn ? dest.namaEn : dest.nama;
  const desc = store.lang === 'en' && dest.deskripsiEn ? dest.deskripsiEn : dest.deskripsi;
  const fallbackImg = makePlaceholderImg(dest.nama);

  const imgEl = document.getElementById('modalDestImg');
  if (imgEl instanceof HTMLImageElement) {
    imgEl.src = dest.imageUrl || fallbackImg;
    imgEl.alt = title;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = fallbackImg;
    };
  }

  const metaEl = document.getElementById('modalDestMeta');
  const titleEl = document.getElementById('modalDestTitle');
  const addrEl = document.getElementById('modalDestAddress');
  const priceEl = document.getElementById('modalDestPrice');
  const descEl = document.getElementById('modalDestDesc');
  const verifEl = document.getElementById('modalVerificationBox');
  const facEl = document.getElementById('modalDestFacilities');
  const worshipEl = document.getElementById('modalDestWorship');
  const mapsLink = document.getElementById('modalMapsLink');

  if (metaEl) {
    metaEl.innerHTML = `
      <span>${escapeHTML(dest.wilayah)}</span>
      <span class="meta-sep" aria-hidden="true">·</span>
      <span>${escapeHTML(dest.kategori)}</span>
    `;
  }
  if (titleEl) titleEl.textContent = title;
  if (addrEl) addrEl.textContent = dest.alamat || dest.wilayah;
  if (priceEl) priceEl.textContent = formatIDR(dest.estimasiBiaya);
  if (descEl) descEl.textContent = desc;
  if (verifEl) {
    verifEl.innerHTML = `<strong>Status Verifikasi:</strong> ${escapeHTML(
      dest.catatanVerifikasi || 'Informasi nyata yang belum diverifikasi resmi (data simulasi).'
    )}`;
  }
  if (facEl) {
    facEl.innerHTML = (dest.fasilitas || ['Fasilitas standar (simulasi)'])
      .map((f) => `<li>${escapeHTML(f)}</li>`)
      .join('');
  }
  if (worshipEl) {
    worshipEl.innerHTML = (dest.fasilitasIbadah || ['Akses tempat ibadah sekitar (simulasi)'])
      .map((f) => `<li>${escapeHTML(f)}</li>`)
      .join('');
  }
  if (mapsLink instanceof HTMLAnchorElement) {
    mapsLink.href = safeExternalUrl(dest.mapsUrl, mapsSearchUrl(`${dest.nama} ${dest.wilayah}`));
  }

  syncModalFavoriteButton(id);

  const nameInput = document.getElementById('bookingParticipantName');
  const jerseySelect = document.getElementById('bookingJerseySize');
  const goToPayBtn = document.getElementById('modalGoToPaymentBtn');
  const backBtn = document.getElementById('modalBackToOrderBtn');
  const confirmPayBtn = document.getElementById('modalConfirmPayBtn');

  const existingReg = getRegistrationForRun(dest.id);
  if (existingReg) {
    showReceiptStep(existingReg, dest);
    openModal('detailModal');
    return;
  }

  if (nameInput instanceof HTMLInputElement) {
    const currentUser = getCurrentUser();
    nameInput.value = currentUser?.displayName || '';
  }
  if (jerseySelect instanceof HTMLSelectElement) {
    jerseySelect.value = 'M';
  }

  setCheckoutStep(1);
  renderAuthUI();

  if (goToPayBtn) {
    goToPayBtn.onclick = async () => {
      if (!getCurrentUser()) {
        showToast(
          store.lang === 'en'
            ? 'Please sign in first before proceeding to payment.'
            : 'Silakan login terlebih dahulu sebelum menuju halaman pembayaran.',
          'warn'
        );
        const signedInUser = await loginWithGoogle({ keepCurrentModal: true });
        if (!signedInUser) return;

        if (nameInput instanceof HTMLInputElement && !nameInput.value.trim()) {
          nameInput.value = signedInUser.displayName || '';
        }
      }

      const participantName =
        nameInput instanceof HTMLInputElement ? nameInput.value.trim() : '';
      if (!participantName) {
        showToast(
          store.lang === 'en'
            ? 'Please enter participant full name.'
            : 'Mohon isi nama lengkap peserta terlebih dahulu.',
          'warn'
        );
        if (nameInput instanceof HTMLInputElement) nameInput.focus();
        return;
      }

      const jerseySize = jerseySelect instanceof HTMLSelectElement ? jerseySelect.value : 'M';
      const payRunEl = document.getElementById('paySummaryRunName');
      const payNameEl = document.getElementById('paySummaryParticipant');
      const payJerseyEl = document.getElementById('paySummaryJersey');
      const payTotalEl = document.getElementById('paySummaryTotal');

      if (payRunEl) payRunEl.textContent = title;
      if (payNameEl) payNameEl.textContent = participantName;
      if (payJerseyEl) payJerseyEl.textContent = jerseySize;
      if (payTotalEl) payTotalEl.textContent = formatIDR(dest.estimasiBiaya);

      setCheckoutStep(2);
      renderAuthUI();
    };
  }

  if (backBtn) {
    backBtn.onclick = () => {
      setCheckoutStep(1);
    };
  }

  if (confirmPayBtn) {
    confirmPayBtn.onclick = async () => {
      if (!getCurrentUser()) {
        showToast(
          store.lang === 'en'
            ? 'Please sign in first before payment.'
            : 'Silakan login terlebih dahulu sebelum melakukan pembayaran.',
          'warn'
        );
        setCheckoutStep(1);
        renderAuthUI();
        return;
      }

      const participantName =
        nameInput instanceof HTMLInputElement ? nameInput.value.trim() : '';
      const jerseySize = jerseySelect instanceof HTMLSelectElement ? jerseySelect.value : 'M';
      const checkedMethod = document.querySelector('input[name="runPaymentMethod"]:checked');
      const paymentMethod =
        checkedMethod instanceof HTMLInputElement ? checkedMethod.value : 'QRIS';

      if (confirmPayBtn instanceof HTMLButtonElement) {
        confirmPayBtn.disabled = true;
        confirmPayBtn.textContent =
          store.lang === 'en' ? 'Processing...' : 'Memproses pembayaran...';
      }

      try {
        const receipt = await completeRunPaymentAndRegister({
          dest,
          participantName,
          jerseySize,
          paymentMethod,
        });
        if (receipt) {
          showReceiptStep(receipt, dest);
        }
      } finally {
        if (confirmPayBtn instanceof HTMLButtonElement) {
          confirmPayBtn.disabled = false;
          renderAuthUI();
        }
      }
    };
  }

  openModal('detailModal');
}

export function syncModalFavoriteButton(id) {
  const btn = document.getElementById('modalFavBtn');
  if (!btn) return;
  const fav = isFavorite(id, 'destinasi');
  btn.textContent = fav
    ? store.lang === 'en'
      ? '♥ Saved in Favorites'
      : '♥ Tersimpan di Favorit'
    : store.lang === 'en'
    ? '♥ Save Favorite'
    : '♥ Simpan Favorit';
  btn.onclick = () => toggleFavorite(id, 'destinasi');
}

export function renderFavoritesModal() {
  const container = document.getElementById('favoritesListContainer');
  if (!container) return;

  if (store.favorit.length === 0) {
    container.innerHTML = `<p style="padding-block: 1.5rem; text-align: center; color: var(--color-text-muted); font-size: 0.875rem;">${
      store.lang === 'en' ? 'No saved favorite destinations yet.' : 'Belum ada destinasi favorit yang disimpan.'
    }</p>`;
    return;
  }

  container.innerHTML = store.favorit
    .map((fav) => {
      const dest = store.destinasi.find((d) => d.id === fav.itemId);
      const name = dest ? (store.lang === 'en' && dest.namaEn ? dest.namaEn : dest.nama) : fav.itemId;
      const region = dest ? dest.wilayah : 'Aceh';
      return `
        <div class="activity-row" style="padding: 0.75rem;">
          <div>
            <div style="font-weight: 700; color: var(--color-emerald-950); font-size: 0.9375rem;">${escapeHTML(name)}</div>
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">${escapeHTML(region)}</div>
          </div>
          <div style="display: flex; gap: 0.375rem;">
            ${
              dest
                ? `<button type="button" data-action="fav-view" data-id="${escapeHTML(
                    dest.id
                  )}" class="btn btn-primary btn-sm">${store.lang === 'en' ? 'View' : 'Lihat'}</button>`
                : ''
            }
            <button type="button" data-action="fav-remove" data-id="${escapeHTML(
              fav.itemId
            )}" data-type="${escapeHTML(fav.tipeItem)}" class="btn btn-danger btn-sm">${
        store.lang === 'en' ? 'Remove' : 'Hapus'
      }</button>
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderCulinaryAndAccommodation() {
  const kulGrid = document.getElementById('culinaryGrid');
  if (kulGrid) {
    kulGrid.innerHTML = store.kuliner
      .map((k) => {
        const title = store.lang === 'en' && k.namaEn ? k.namaEn : k.nama;
        const fallback = makePlaceholderImg(k.nama);
        const muslimText = (k.fasilitasRamahMuslim || []).join(' · ');

        return `
          <article class="catalog-card">
            <div class="card-media">
              <img
                src="${escapeHTML(k.imageUrl || fallback)}"
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
                  <span>${escapeHTML(k.wilayah)}</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span>${escapeHTML(k.kategori || 'Kuliner')}</span>
                </div>
                <h3 class="card-title">${escapeHTML(title)}</h3>

                <div class="verification-box" style="margin-top: 0.75rem;">
                  <div><strong>${escapeHTML(t(store.lang, 'halalStatusLabel'))}</strong> ${escapeHTML(
                    k.statusSertifikasiHalal
                  )}</div>
                  <div><strong>${escapeHTML(t(store.lang, 'halalSourceLabel'))}</strong> ${escapeHTML(
                    k.sumberVerifikasi
                  )}</div>
                </div>

                <div style="margin-top: 0.75rem;">
                  <div class="price-label">${escapeHTML(t(store.lang, 'muslimFacilitySeparate'))}</div>
                  <p class="facility-list-text">${escapeHTML(muslimText)}</p>
                </div>
              </div>

              <div class="card-footer">
                <div>
                  <div class="price-label">${escapeHTML(t(store.lang, 'estimateSim'))}</div>
                  <div class="price-value tabular-nums">${escapeHTML(formatIDR(k.harga))}</div>
                </div>
                <button
                  type="button"
                  data-action="open-wa"
                  data-name="${escapeHTML(title)}"
                  data-contact="${escapeHTML(k.kontak || '+62-811-0000-0000 (Simulasi)')}"
                  class="btn btn-primary btn-sm"
                >
                  ${escapeHTML(t(store.lang, 'whatsappBtn'))}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  const akomGrid = document.getElementById('accommodationGrid');
  if (akomGrid) {
    akomGrid.innerHTML = store.akomodasi
      .map((a) => {
        const title = store.lang === 'en' && a.namaEn ? a.namaEn : a.nama;
        const fallback = makePlaceholderImg(a.nama);
        const muslimText = (a.fasilitasRamahMuslim || []).join(' · ');
        const generalText = (a.fasilitas || []).join(' · ');

        return `
          <article class="catalog-card">
            <div class="card-media">
              <img
                src="${escapeHTML(a.imageUrl || fallback)}"
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
                  <span>${escapeHTML(a.wilayah)}</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span>${store.lang === 'en' ? 'Muslim-Friendly' : 'Ramah Muslim'}</span>
                </div>
                <h3 class="card-title">${escapeHTML(title)}</h3>

                <div style="margin-top: 0.75rem;">
                  <div class="price-label" style="color: var(--color-emerald-800);">${escapeHTML(
                    t(store.lang, 'muslimFacilityLabel')
                  )}</div>
                  <p class="facility-list-text">${escapeHTML(muslimText)}</p>
                </div>

                <div style="margin-top: 0.625rem;">
                  <div class="price-label">${escapeHTML(t(store.lang, 'generalFacilityLabel'))}</div>
                  <p class="facility-list-text">${escapeHTML(generalText)}</p>
                </div>
              </div>

              <div class="card-footer">
                <div>
                  <div class="price-value tabular-nums">${escapeHTML(formatIDR(a.hargaPerMalam))}</div>
                  <div class="price-label">${escapeHTML(t(store.lang, 'perNightSim'))}</div>
                </div>
                <button
                  type="button"
                  data-action="open-wa"
                  data-name="${escapeHTML(title)}"
                  data-contact="${escapeHTML(a.kontak || '+62-811-0000-0000 (Simulasi)')}"
                  class="btn btn-primary btn-sm"
                >
                  ${escapeHTML(t(store.lang, 'whatsappBtn'))}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }
}

export function resetAllFilters() {
  store.searchQuery = '';
  store.selectedRegion = 'ALL';
  store.selectedCategory = 'ALL';
  store.sortBy = 'featured';

  const searchInput = document.getElementById('searchInput');
  const regionSelect = document.getElementById('regionSelect');
  const sortSelect = document.getElementById('sortSelect');
  if (searchInput instanceof HTMLInputElement) searchInput.value = '';
  if (regionSelect instanceof HTMLSelectElement) regionSelect.value = 'ALL';
  if (sortSelect instanceof HTMLSelectElement) sortSelect.value = 'featured';

  renderDestinations();
}

export function bindCatalogEvents(onRegionFilterChanged) {
  const searchInput = document.getElementById('searchInput');
  const regionSelect = document.getElementById('regionSelect');
  const sortSelect = document.getElementById('sortSelect');
  const resetBtn = document.getElementById('resetFiltersBtn');
  const catWrap = document.getElementById('categoryChips');
  const destGrid = document.getElementById('destinationsGrid');
  const kulGrid = document.getElementById('culinaryGrid');
  const akomGrid = document.getElementById('accommodationGrid');
  const openFavBtn = document.getElementById('openFavoritesBtn');
  const favContainer = document.getElementById('favoritesListContainer');

  searchInput?.addEventListener('input', (e) => {
    if (e.target instanceof HTMLInputElement) {
      store.searchQuery = e.target.value;
      renderDestinations();
    }
  });

  regionSelect?.addEventListener('change', (e) => {
    if (e.target instanceof HTMLSelectElement) {
      store.selectedRegion = e.target.value;
      renderDestinations();
      if (typeof onRegionFilterChanged === 'function') onRegionFilterChanged();
    }
  });

  sortSelect?.addEventListener('change', (e) => {
    if (e.target instanceof HTMLSelectElement) {
      store.sortBy = e.target.value;
      renderDestinations();
    }
  });

  resetBtn?.addEventListener('click', () => {
    resetAllFilters();
    if (typeof onRegionFilterChanged === 'function') onRegionFilterChanged();
  });

  catWrap?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest('[data-action="select-category"]');
    if (btn) {
      store.selectedCategory = btn.getAttribute('data-cat') || 'ALL';
      renderDestinations();
    }
  });

  destGrid?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const favBtn = target.closest('[data-action="toggle-fav"]');
    if (favBtn) {
      const id = favBtn.getAttribute('data-id');
      if (id) toggleFavorite(id, 'destinasi');
      return;
    }

    const detailBtn = target.closest('[data-action="open-detail"]');
    if (detailBtn) {
      const id = detailBtn.getAttribute('data-id');
      if (id) openDestinationModal(id);
      return;
    }

    const resetInlineBtn = target.closest('[data-action="reset-filters"]');
    if (resetInlineBtn) {
      resetAllFilters();
      if (typeof onRegionFilterChanged === 'function') onRegionFilterChanged();
    }
  });

  const handleWaClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const waBtn = target.closest('[data-action="open-wa"]');
    if (waBtn) {
      const name = waBtn.getAttribute('data-name') || 'UMKM Aceh';
      const contact = waBtn.getAttribute('data-contact') || '+62-811-0000-0000 (Simulasi)';
      openWhatsAppDemoModal(name, contact, store.lang);
    }
  };

  kulGrid?.addEventListener('click', handleWaClick);
  akomGrid?.addEventListener('click', handleWaClick);

  openFavBtn?.addEventListener('click', () => {
    renderFavoritesModal();
    openModal('favoritesModal');
  });

  favContainer?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const viewBtn = target.closest('[data-action="fav-view"]');
    if (viewBtn) {
      const id = viewBtn.getAttribute('data-id');
      closeModal('favoritesModal');
      if (id) openDestinationModal(id);
      return;
    }

    const removeBtn = target.closest('[data-action="fav-remove"]');
    if (removeBtn) {
      const id = removeBtn.getAttribute('data-id');
      const tipe = removeBtn.getAttribute('data-type') || 'destinasi';
      if (id) {
        toggleFavorite(id, tipe);
        renderFavoritesModal();
      }
    }
  });
}
