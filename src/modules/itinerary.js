import { STORAGE_KEYS } from '../data/seedData.js';
import { t } from '../i18n/translations.js';
import { escapeHTML, formatDayOffsetDate, formatIDR } from '../utils/formatters.js';
import { createIllustrationDataUrl, makePlaceholderImg } from '../utils/illustrations.js';
import { showToast } from './modals.js';
import { persistKey, store } from './store.js';

function findActivityThumbnail(act) {
  if (!act) return createIllustrationDataUrl('Aktivitas', 'Aceh', 'sea');
  if (act.tipeItem === 'destinasi') {
    const d = store.destinasi.find((x) => x.id === act.itemId);
    return (d && d.imageUrl) || makePlaceholderImg(act.nama);
  }
  if (act.tipeItem === 'kuliner') {
    const k = store.kuliner.find((x) => x.id === act.itemId);
    return (k && k.imageUrl) || makePlaceholderImg(act.nama);
  }
  if (act.tipeItem === 'akomodasi') {
    const a = store.akomodasi.find((x) => x.id === act.itemId);
    return (a && a.imageUrl) || makePlaceholderImg(act.nama);
  }
  return makePlaceholderImg(act.nama);
}

export function syncSelectedActivityPreviewImg() {
  const itemSel = document.getElementById('addActItemSelect');
  const previewImg = document.getElementById('addActItemPreviewImg');
  if (!(itemSel instanceof HTMLSelectElement) || !(previewImg instanceof HTMLImageElement)) return;

  const selectedOpt = itemSel.options[itemSel.selectedIndex];
  const fallback = createIllustrationDataUrl('Pilihan Aceh', 'Pratinjau', 'sea');
  previewImg.src = (selectedOpt && selectedOpt.getAttribute('data-img')) || fallback;
  previewImg.onerror = () => {
    previewImg.onerror = null;
    previewImg.src = fallback;
  };
}

export function recalculateItineraryBudget() {
  const travelers = Math.max(1, Number(store.itinerary.jumlahWisatawan) || 1);
  const activities = store.itinerary.daftarAktivitas || [];
  const sumUnit = activities.reduce((acc, act) => acc + (Number(act.biayaSatuan) || 0), 0);
  const total = sumUnit * travelers;

  store.itinerary.totalAnggaran = total;
  persistKey(STORAGE_KEYS.ITINERARY, store.itinerary);

  const totalEl = document.getElementById('itineraryTotalBudget');
  const breakdownEl = document.getElementById('itineraryBudgetBreakdown');
  if (totalEl) totalEl.textContent = formatIDR(total);
  if (breakdownEl) {
    breakdownEl.textContent =
      store.lang === 'en'
        ? `${activities.length} activities · ${travelers} traveler(s) (simulated)`
        : `${activities.length} aktivitas · ${travelers} wisatawan (estimasi simulasi)`;
  }
}

export function syncItineraryControls() {
  const days = Math.min(5, Math.max(1, Number(store.itinerary.jumlahHari) || 3));
  store.itinerary.jumlahHari = days;

  const nameInput = document.getElementById('itinNameInput');
  const dateInput = document.getElementById('itinStartDateInput');
  const daysSelect = document.getElementById('itinDaysSelect');
  const travelersInput = document.getElementById('itinTravelersInput');

  if (nameInput instanceof HTMLInputElement) nameInput.value = store.itinerary.namaPerjalanan || '';
  if (dateInput instanceof HTMLInputElement) dateInput.value = store.itinerary.tanggalMulai || '2026-12-01';
  if (daysSelect instanceof HTMLSelectElement) daysSelect.value = String(days);
  if (travelersInput instanceof HTMLInputElement) {
    travelersInput.value = String(store.itinerary.jumlahWisatawan || 2);
  }

  const daySel = document.getElementById('addActDaySelect');
  if (daySel instanceof HTMLSelectElement) {
    const prevVal = Number(daySel.value) || 1;
    daySel.innerHTML = Array.from({ length: days }, (_, i) => i + 1)
      .map((d) => `<option value="${d}">${escapeHTML(t(store.lang, 'dayPrefix', { day: d }))}</option>`)
      .join('');
    daySel.value = String(Math.min(days, Math.max(1, prevVal)));
  }

  const itemSel = document.getElementById('addActItemSelect');
  if (itemSel instanceof HTMLSelectElement) {
    const options = [
      ...store.destinasi.map((d) => ({
        value: `destinasi::${d.id}`,
        label: `[Destinasi · ${d.wilayah}] ${d.nama} — ${formatIDR(d.estimasiBiaya)}`,
        img: d.imageUrl || makePlaceholderImg(d.nama),
      })),
      ...store.kuliner.map((k) => ({
        value: `kuliner::${k.id}`,
        label: `[Kuliner · ${k.wilayah}] ${k.nama} — ${formatIDR(k.harga)}`,
        img: k.imageUrl || makePlaceholderImg(k.nama),
      })),
      ...store.akomodasi.map((a) => ({
        value: `akomodasi::${a.id}`,
        label: `[Akomodasi · ${a.wilayah}] ${a.nama} — ${formatIDR(a.hargaPerMalam)}`,
        img: a.imageUrl || makePlaceholderImg(a.nama),
      })),
    ];

    itemSel.innerHTML = options
      .map(
        (o) =>
          `<option value="${escapeHTML(o.value)}" data-img="${escapeHTML(o.img)}">${escapeHTML(o.label)}</option>`
      )
      .join('');
    syncSelectedActivityPreviewImg();
  }
}

export function addActivityToItinerary(hari, tipeItem, itemId, nama, biayaSatuan) {
  const maxDays = Math.min(5, Math.max(1, Number(store.itinerary.jumlahHari) || 3));
  const validDay = Math.min(maxDays, Math.max(1, Number(hari) || 1));

  if (!Array.isArray(store.itinerary.daftarAktivitas)) {
    store.itinerary.daftarAktivitas = [];
  }

  store.itinerary.daftarAktivitas.push({
    uid: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    hari: validDay,
    tipeItem,
    itemId,
    nama,
    biayaSatuan: Number(biayaSatuan) || 0,
  });

  renderItinerary();
  showToast(
    store.lang === 'en'
      ? `Added to Day ${validDay}: ${nama}`
      : `Ditambahkan ke Hari ke-${validDay}: ${nama}`
  );
}

export function removeActivityFromItinerary(uid) {
  store.itinerary.daftarAktivitas = (store.itinerary.daftarAktivitas || []).filter((a) => a.uid !== uid);
  renderItinerary();
}

export function exportItinerarySummary() {
  const itin = store.itinerary;
  const lines = [
    '========================================',
    'JAK MAEN ACEH — RINGKASAN ITINERARY',
    '========================================',
    `Perjalanan : ${itin.namaPerjalanan || 'Rencana Wisata Aceh'}`,
    `Tanggal    : ${itin.tanggalMulai || '-'}`,
    `Durasi     : ${itin.jumlahHari} Hari`,
    `Wisatawan  : ${itin.jumlahWisatawan} Orang`,
    `Total Est. : ${formatIDR(itin.totalAnggaran)} (Simulasi)`,
    '',
  ];

  for (let d = 1; d <= itin.jumlahHari; d += 1) {
    const dateLabel = formatDayOffsetDate(itin.tanggalMulai, d - 1, store.lang);
    lines.push(`--- Hari ke-${d}${dateLabel ? ` (${dateLabel})` : ''} ---`);
    const dayActs = (itin.daftarAktivitas || []).filter((a) => Number(a.hari) === d);
    if (dayActs.length === 0) {
      lines.push('  (Belum ada aktivitas)');
    } else {
      dayActs.forEach((act, idx) => {
        lines.push(`  ${idx + 1}. ${act.nama} [${act.tipeItem}] — ${formatIDR(act.biayaSatuan)}/org`);
      });
    }
    lines.push('');
  }

  lines.push('Catatan: Seluruh estimasi biaya bersifat simulasi.');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `itinerary-jak-maen-aceh-${itin.jumlahHari}-hari.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  showToast(
    store.lang === 'en' ? 'Itinerary summary downloaded.' : 'Ringkasan itinerary berhasil diunduh.'
  );
}

export function renderItinerary() {
  syncItineraryControls();
  recalculateItineraryBudget();

  const days = store.itinerary.jumlahHari;
  const grid = document.getElementById('itineraryDaysGrid');
  if (!grid) return;

  grid.innerHTML = Array.from({ length: days }, (_, idx) => idx + 1)
    .map((dayNum) => {
      const dateLabel = formatDayOffsetDate(store.itinerary.tanggalMulai, dayNum - 1, store.lang);
      const acts = (store.itinerary.daftarAktivitas || []).filter((a) => Number(a.hari) === dayNum);

      const actsHtml =
        acts.length === 0
          ? `<p class="text-xs" style="color: var(--color-text-muted); font-style: italic; padding-block: 0.75rem;">${escapeHTML(
              t(store.lang, 'emptyDayMsg')
            )}</p>`
          : acts
              .map((act) => {
                const actImg = findActivityThumbnail(act);
                const fallbackImg = makePlaceholderImg(act.nama);
                return `
                  <div class="activity-row">
                    <div class="activity-row-main">
                      <img
                        src="${escapeHTML(actImg)}"
                        alt="${escapeHTML(act.nama)}"
                        data-fallback="${escapeHTML(fallbackImg)}"
                        class="activity-thumb js-fallback-img"
                      />
                      <div style="min-width: 0;">
                        <div class="activity-name">${escapeHTML(act.nama)}</div>
                        <div class="activity-cost tabular-nums">${escapeHTML(formatIDR(act.biayaSatuan))} ${escapeHTML(
                          t(store.lang, 'perPersonSim')
                        )}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-action="remove-activity"
                      data-uid="${escapeHTML(act.uid)}"
                      aria-label="Hapus aktivitas ${escapeHTML(act.nama)}"
                      class="btn btn-danger btn-sm"
                    >
                      ✕
                    </button>
                  </div>
                `;
              })
              .join('');

      return `
        <article class="day-column">
          <div class="day-column-header">
            <h3 class="day-column-title">${escapeHTML(t(store.lang, 'dayPrefix', { day: dayNum }))}</h3>
            ${dateLabel ? `<span class="day-column-date">${escapeHTML(dateLabel)}</span>` : ''}
          </div>
          <div class="day-activities-list">${actsHtml}</div>
        </article>
      `;
    })
    .join('');
}

export function bindItineraryEvents() {
  const nameInput = document.getElementById('itinNameInput');
  const startDateInput = document.getElementById('itinStartDateInput');
  const daysSelect = document.getElementById('itinDaysSelect');
  const travelersInput = document.getElementById('itinTravelersInput');
  const itemSelect = document.getElementById('addActItemSelect');
  const addBtn = document.getElementById('addActivityBtn');
  const clearBtn = document.getElementById('clearItineraryBtn');
  const exportBtn = document.getElementById('exportItineraryBtn');
  const daysGrid = document.getElementById('itineraryDaysGrid');

  nameInput?.addEventListener('input', (e) => {
    if (e.target instanceof HTMLInputElement) {
      store.itinerary.namaPerjalanan = e.target.value;
      persistKey(STORAGE_KEYS.ITINERARY, store.itinerary);
    }
  });

  startDateInput?.addEventListener('change', (e) => {
    if (e.target instanceof HTMLInputElement) {
      store.itinerary.tanggalMulai = e.target.value;
      renderItinerary();
    }
  });

  daysSelect?.addEventListener('change', (e) => {
    if (e.target instanceof HTMLSelectElement) {
      store.itinerary.jumlahHari = Number(e.target.value) || 3;
      renderItinerary();
    }
  });

  travelersInput?.addEventListener('input', (e) => {
    if (e.target instanceof HTMLInputElement) {
      store.itinerary.jumlahWisatawan = Math.max(1, Number(e.target.value) || 1);
      recalculateItineraryBudget();
    }
  });

  itemSelect?.addEventListener('change', syncSelectedActivityPreviewImg);

  addBtn?.addEventListener('click', () => {
    const daySel = document.getElementById('addActDaySelect');
    const itemSel = document.getElementById('addActItemSelect');
    if (!(daySel instanceof HTMLSelectElement) || !(itemSel instanceof HTMLSelectElement)) return;

    const day = Number(daySel.value) || 1;
    const [tipeItem, itemId] = (itemSel.value || '').split('::');
    if (!tipeItem || !itemId) return;

    if (tipeItem === 'destinasi') {
      const d = store.destinasi.find((x) => x.id === itemId);
      if (d) addActivityToItinerary(day, 'destinasi', d.id, d.nama, d.estimasiBiaya);
    } else if (tipeItem === 'kuliner') {
      const k = store.kuliner.find((x) => x.id === itemId);
      if (k) addActivityToItinerary(day, 'kuliner', k.id, k.nama, k.harga);
    } else if (tipeItem === 'akomodasi') {
      const a = store.akomodasi.find((x) => x.id === itemId);
      if (a) addActivityToItinerary(day, 'akomodasi', a.id, a.nama, a.hargaPerMalam);
    }
  });

  clearBtn?.addEventListener('click', () => {
    store.itinerary.daftarAktivitas = [];
    renderItinerary();
    showToast(
      store.lang === 'en' ? 'Itinerary activities cleared.' : 'Daftar aktivitas itinerary dikosongkan.'
    );
  });

  exportBtn?.addEventListener('click', exportItinerarySummary);

  daysGrid?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const removeBtn = target.closest('[data-action="remove-activity"]');
    if (removeBtn) {
      const uid = removeBtn.getAttribute('data-uid');
      if (uid) removeActivityFromItinerary(uid);
    }
  });
}
