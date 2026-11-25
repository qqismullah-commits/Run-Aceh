import { STORAGE_KEYS } from '../data/seedData.js';
import { t } from '../i18n/translations.js';
import { escapeHTML, formatIDR, mapsSearchUrl } from '../utils/formatters.js';
import { makePlaceholderImg } from '../utils/illustrations.js';
import { openDestinationModal } from './catalog.js';
import { openConfirmModal, showToast } from './modals.js';
import { notify, persistKey, resetStoreToSeed, store } from './store.js';

export function switchCrudTab(tab) {
  store.crudTab = tab;
  document.querySelectorAll('.crud-tab-btn').forEach((btn) => {
    const active = btn.getAttribute('data-crud-tab') === tab;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.getElementById('crudCategoryWrap')?.classList.toggle('is-hidden', tab !== 'destinasi');
  document.getElementById('crudRegionWrap')?.classList.toggle('is-hidden', tab === 'paket');
  document.getElementById('crudDurationWrap')?.classList.toggle('is-hidden', tab !== 'paket');
  document.getElementById('crudHalalWrap')?.classList.toggle('is-hidden', tab !== 'kuliner');
  document.getElementById('crudMuslimFacilityWrap')?.classList.toggle('is-hidden', tab !== 'akomodasi');

  const priceLabel = document.getElementById('crudPriceLabel');
  if (priceLabel) {
    if (tab === 'akomodasi') priceLabel.textContent = 'Harga per Malam (IDR - Simulasi)';
    else if (tab === 'kuliner') priceLabel.textContent = 'Estimasi Harga Kuliner (IDR - Simulasi)';
    else priceLabel.textContent = 'Estimasi Biaya (IDR - Simulasi)';
  }

  resetCrudForm();
  renderCrudTable();
}

export function resetCrudForm() {
  const editId = document.getElementById('crudEditId');
  const titleEl = document.getElementById('crudFormTitle');
  const namaEl = document.getElementById('crudNama');
  const hargaEl = document.getElementById('crudHarga');
  const descEl = document.getElementById('crudDeskripsi');
  const durasiEl = document.getElementById('crudDurasi');
  const halalStatusEl = document.getElementById('crudHalalStatus');
  const halalSourceEl = document.getElementById('crudHalalSource');
  const muslimFacEl = document.getElementById('crudMuslimFacility');

  if (editId instanceof HTMLInputElement) editId.value = '';
  if (titleEl) titleEl.textContent = `Tambah Item ${store.crudTab.toUpperCase()}`;
  if (namaEl instanceof HTMLInputElement) namaEl.value = '';
  if (hargaEl instanceof HTMLInputElement) hargaEl.value = '25000';
  if (descEl instanceof HTMLTextAreaElement) descEl.value = '';
  if (durasiEl instanceof HTMLInputElement) durasiEl.value = '3';
  if (halalStatusEl instanceof HTMLInputElement) {
    halalStatusEl.value = 'Belum Terverifikasi Resmi (Simulasi)';
  }
  if (halalSourceEl instanceof HTMLInputElement) {
    halalSourceEl.value = 'Catatan Simulasi — Belum Diverifikasi Resmi';
  }
  if (muslimFacEl instanceof HTMLInputElement) {
    muslimFacEl.value = 'Penunjuk Kiblat, Ruang Salat';
  }
}

export function renderCrudTable() {
  const tbody = document.getElementById('crudTableBody');
  const titleEl = document.getElementById('crudTableTitle');
  const badgeEl = document.getElementById('crudItemTotalBadge');
  if (!tbody) return;

  if (titleEl) titleEl.textContent = 'Daftar RUN';
  const items = store.destinasi || [];

  if (badgeEl) badgeEl.textContent = `${items.length} item`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--color-text-inverse-muted);">Belum ada data RUN.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((item) => {
      const infoText = `${item.wilayah} · ${item.kategori}`;
      const priceVal = item.estimasiBiaya;

      return `
        <tr>
          <td class="crud-name-cell">
            <div style="font-weight: 600; color: #ffffff;">${escapeHTML(item.nama)}</div>
            <div class="crud-mobile-info">${escapeHTML(infoText)}</div>
          </td>
          <td class="crud-col-info" style="color: var(--color-text-inverse-muted);">${escapeHTML(infoText)}</td>
          <td class="crud-price-cell tabular-nums">${escapeHTML(formatIDR(priceVal))}</td>
          <td>
            <button
              type="button"
              data-action="crud-detail"
              data-id="${escapeHTML(item.id)}"
              class="btn btn-primary btn-sm"
            >
              ${escapeHTML(t(store.lang, 'detailBtn'))}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function editCrudItem(id) {
  const tab = store.crudTab;
  let item = null;
  if (tab === 'destinasi') item = store.destinasi.find((x) => x.id === id);
  else if (tab === 'kuliner') item = store.kuliner.find((x) => x.id === id);
  else if (tab === 'akomodasi') item = store.akomodasi.find((x) => x.id === id);
  else if (tab === 'paket') item = store.paket.find((x) => x.id === id);
  if (!item) return;

  const editIdEl = document.getElementById('crudEditId');
  const titleEl = document.getElementById('crudFormTitle');
  const namaEl = document.getElementById('crudNama');
  const descEl = document.getElementById('crudDeskripsi');
  const wilayahEl = document.getElementById('crudWilayah');
  const katEl = document.getElementById('crudKategori');
  const durasiEl = document.getElementById('crudDurasi');
  const hargaEl = document.getElementById('crudHarga');
  const halalStatusEl = document.getElementById('crudHalalStatus');
  const halalSourceEl = document.getElementById('crudHalalSource');
  const muslimFacEl = document.getElementById('crudMuslimFacility');

  if (editIdEl instanceof HTMLInputElement) editIdEl.value = item.id;
  if (titleEl) titleEl.textContent = `Edit Item: ${item.nama}`;
  if (namaEl instanceof HTMLInputElement) namaEl.value = item.nama || '';
  if (descEl instanceof HTMLTextAreaElement) descEl.value = item.deskripsi || '';
  if (wilayahEl instanceof HTMLSelectElement && item.wilayah) wilayahEl.value = item.wilayah;
  if (katEl instanceof HTMLSelectElement && item.kategori) katEl.value = item.kategori;
  if (durasiEl instanceof HTMLInputElement && item.durasi) durasiEl.value = String(item.durasi);

  const priceVal =
    tab === 'akomodasi' ? item.hargaPerMalam : tab === 'kuliner' ? item.harga : item.estimasiBiaya;
  if (hargaEl instanceof HTMLInputElement) hargaEl.value = String(Number(priceVal) || 0);

  if (tab === 'kuliner') {
    if (halalStatusEl instanceof HTMLInputElement) {
      halalStatusEl.value = item.statusSertifikasiHalal || '';
    }
    if (halalSourceEl instanceof HTMLInputElement) {
      halalSourceEl.value = item.sumberVerifikasi || '';
    }
  }
  if (tab === 'akomodasi' && muslimFacEl instanceof HTMLInputElement) {
    muslimFacEl.value = (item.fasilitasRamahMuslim || []).join(', ');
  }

  namaEl?.focus();
}

function deleteCrudItem(id) {
  const tab = store.crudTab;
  if (tab === 'destinasi') {
    store.destinasi = store.destinasi.filter((x) => x.id !== id);
    persistKey(STORAGE_KEYS.DESTINASI, store.destinasi);
  } else if (tab === 'kuliner') {
    store.kuliner = store.kuliner.filter((x) => x.id !== id);
    persistKey(STORAGE_KEYS.KULINER, store.kuliner);
  } else if (tab === 'akomodasi') {
    store.akomodasi = store.akomodasi.filter((x) => x.id !== id);
    persistKey(STORAGE_KEYS.AKOMODASI, store.akomodasi);
  } else if (tab === 'paket') {
    store.paket = store.paket.filter((x) => x.id !== id);
    persistKey(STORAGE_KEYS.PAKET, store.paket);
  }
  notify('all');
  showToast(
    store.lang === 'en' ? 'Item deleted from local catalog.' : 'Item berhasil dihapus dari katalog lokal.'
  );
}

function handleCrudSubmit(event) {
  event.preventDefault();
  const tab = store.crudTab;
  const editIdEl = document.getElementById('crudEditId');
  const namaEl = document.getElementById('crudNama');
  const wilayahEl = document.getElementById('crudWilayah');
  const katEl = document.getElementById('crudKategori');
  const hargaEl = document.getElementById('crudHarga');
  const descEl = document.getElementById('crudDeskripsi');

  const editId = editIdEl instanceof HTMLInputElement ? editIdEl.value.trim() : '';
  const nama = namaEl instanceof HTMLInputElement ? namaEl.value.trim() : '';
  const wilayah = wilayahEl instanceof HTMLSelectElement ? wilayahEl.value : 'Banda Aceh';
  const kategori = katEl instanceof HTMLSelectElement ? katEl.value : 'Religi';
  const hargaVal = hargaEl instanceof HTMLInputElement ? Math.max(0, Number(hargaEl.value) || 0) : 0;
  const deskripsi =
    (descEl instanceof HTMLTextAreaElement ? descEl.value.trim() : '') ||
    'Data ditambahkan melalui Kelola Data (simulasi / belum diverifikasi resmi).';

  if (!nama) {
    showToast(store.lang === 'en' ? 'Name is required.' : 'Nama wajib diisi.', 'warn');
    namaEl?.focus();
    return;
  }

  if (tab === 'destinasi') {
    if (editId) {
      const idx = store.destinasi.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        store.destinasi[idx] = {
          ...store.destinasi[idx],
          nama,
          namaEn: nama,
          wilayah,
          kategori,
          estimasiBiaya: hargaVal,
          deskripsi,
          deskripsiEn: deskripsi,
          mapsUrl: mapsSearchUrl(`${nama} ${wilayah}`),
        };
      }
    } else {
      store.destinasi.unshift({
        id: `dest-${Date.now()}`,
        nama,
        namaEn: nama,
        kategori,
        wilayah,
        deskripsi,
        deskripsiEn: deskripsi,
        imageUrl: makePlaceholderImg(nama),
        alamat: `${wilayah}, Aceh`,
        mapsUrl: mapsSearchUrl(`${nama} ${wilayah}`),
        estimasiBiaya: hargaVal,
        fasilitas: ['Area Parkir (Simulasi)', 'Akses Umum'],
        fasilitasIbadah: ['Akses Musala Sekitar (Simulasi)'],
        unggulan: false,
        terverifikasiResmi: false,
        catatanVerifikasi: 'Item dibuat di Kelola Data — belum diverifikasi resmi.',
      });
    }
    persistKey(STORAGE_KEYS.DESTINASI, store.destinasi);
  } else if (tab === 'kuliner') {
    const statusEl = document.getElementById('crudHalalStatus');
    const sourceEl = document.getElementById('crudHalalSource');
    const statusHalal =
      (statusEl instanceof HTMLInputElement && statusEl.value.trim()) ||
      'Belum Terverifikasi Resmi (Simulasi)';
    const sumberVerif =
      (sourceEl instanceof HTMLInputElement && sourceEl.value.trim()) || 'Catatan Simulasi Lokal';

    if (editId) {
      const idx = store.kuliner.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        store.kuliner[idx] = {
          ...store.kuliner[idx],
          nama,
          namaEn: nama,
          wilayah,
          harga: hargaVal,
          statusSertifikasiHalal: statusHalal,
          sumberVerifikasi: sumberVerif,
        };
      }
    } else {
      store.kuliner.unshift({
        id: `kul-${Date.now()}`,
        nama,
        namaEn: nama,
        kategori: 'Kuliner',
        wilayah,
        harga: hargaVal,
        imageUrl: makePlaceholderImg(nama),
        statusSertifikasiHalal: statusHalal,
        sumberVerifikasi: sumberVerif,
        fasilitasRamahMuslim: ['Area Bersih (Simulasi)', 'Bebas Alkohol'],
        kontak: '+62-811-0000-0999 (Simulasi)',
      });
    }
    persistKey(STORAGE_KEYS.KULINER, store.kuliner);
  } else if (tab === 'akomodasi') {
    const facEl = document.getElementById('crudMuslimFacility');
    const muslimFac = (facEl instanceof HTMLInputElement ? facEl.value : '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editId) {
      const idx = store.akomodasi.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        store.akomodasi[idx] = {
          ...store.akomodasi[idx],
          nama,
          namaEn: nama,
          wilayah,
          hargaPerMalam: hargaVal,
          fasilitasRamahMuslim: muslimFac.length ? muslimFac : ['Arah Kiblat (Simulasi)'],
        };
      }
    } else {
      store.akomodasi.unshift({
        id: `akom-${Date.now()}`,
        nama,
        namaEn: nama,
        wilayah,
        hargaPerMalam: hargaVal,
        imageUrl: makePlaceholderImg(nama),
        fasilitas: ['Wi-Fi (Simulasi)', 'Area Parkir'],
        fasilitasRamahMuslim: muslimFac.length ? muslimFac : ['Arah Kiblat (Simulasi)'],
        kontak: '+62-812-0000-0999 (Simulasi)',
      });
    }
    persistKey(STORAGE_KEYS.AKOMODASI, store.akomodasi);
  } else if (tab === 'paket') {
    const durasiEl = document.getElementById('crudDurasi');
    const durasi = Math.min(
      5,
      Math.max(1, Number(durasiEl instanceof HTMLInputElement ? durasiEl.value : 3) || 3)
    );

    if (editId) {
      const idx = store.paket.findIndex((x) => x.id === editId);
      if (idx >= 0) {
        store.paket[idx] = {
          ...store.paket[idx],
          nama,
          namaEn: nama,
          durasi,
          estimasiBiaya: hargaVal,
          deskripsi,
          deskripsiEn: deskripsi,
        };
      }
    } else {
      store.paket.unshift({
        id: `pkt-${Date.now()}`,
        nama,
        namaEn: nama,
        durasi,
        minatUtama: ['Budaya', 'Alam'],
        daftarDestinasi: store.destinasi.slice(0, 2).map((d) => d.id),
        estimasiBiaya: hargaVal,
        deskripsi,
        deskripsiEn: deskripsi,
      });
    }
    persistKey(STORAGE_KEYS.PAKET, store.paket);
  }

  resetCrudForm();
  notify('all');
  showToast(
    store.lang === 'en' ? 'Changes saved to localStorage.' : 'Perubahan data tersimpan di localStorage.'
  );
}

export function bindCrudEvents() {
  const tabsWrap = document.getElementById('crudTabs');
  const form = document.getElementById('crudForm');
  const cancelBtn = document.getElementById('cancelEditCrudBtn');
  const resetDemoBtn = document.getElementById('resetDemoDataBtn');
  const tbody = document.getElementById('crudTableBody');

  tabsWrap?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest('.crud-tab-btn[data-crud-tab]');
    if (btn) {
      const tab = btn.getAttribute('data-crud-tab');
      if (tab) switchCrudTab(tab);
    }
  });

  form?.addEventListener('submit', handleCrudSubmit);
  cancelBtn?.addEventListener('click', resetCrudForm);

  resetDemoBtn?.addEventListener('click', () => {
    openConfirmModal({
      title: store.lang === 'en' ? 'Reset Catalog Data?' : 'Reset Data Awal?',
      message:
        store.lang === 'en'
          ? 'All custom edits in destinations, culinary, accommodations, packages, favorites, and itinerary will be restored to initial defaults.'
          : 'Semua perubahan pada destinasi, kuliner, akomodasi, paket, favorit, dan itinerary akan dikembalikan ke data awal.',
      confirmLabel: store.lang === 'en' ? 'Reset Data' : 'Ya, Reset Data',
      onConfirm: () => {
        resetStoreToSeed();
        resetCrudForm();
        showToast(
          store.lang === 'en' ? 'All data restored to initial state.' : 'Seluruh data telah direset ke kondisi awal.'
        );
      },
    });
  });

  tbody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const detailBtn = target.closest('[data-action="crud-detail"]');
    if (detailBtn) {
      const id = detailBtn.getAttribute('data-id');
      if (id) openDestinationModal(id);
      return;
    }

    const editBtn = target.closest('[data-action="crud-edit"]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if (id) editCrudItem(id);
      return;
    }

    const deleteBtn = target.closest('[data-action="crud-delete"]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (id) deleteCrudItem(id);
    }
  });
}
