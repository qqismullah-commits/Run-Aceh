import { createSeedData, STORAGE_KEYS } from '../data/seedData.js';
import { safeLoadJSON, safeSaveJSON } from '../utils/storage.js';

const seed = createSeedData();

export const store = {
  lang: safeLoadJSON(STORAGE_KEYS.LANG, 'id') === 'en' ? 'en' : 'id',
  destinasi: safeLoadJSON(STORAGE_KEYS.DESTINASI, seed.destinasi),
  kuliner: safeLoadJSON(STORAGE_KEYS.KULINER, seed.kuliner),
  akomodasi: safeLoadJSON(STORAGE_KEYS.AKOMODASI, seed.akomodasi),
  paket: safeLoadJSON(STORAGE_KEYS.PAKET, seed.paket),
  favorit: safeLoadJSON(STORAGE_KEYS.FAVORIT, seed.favorit),
  itinerary: safeLoadJSON(STORAGE_KEYS.ITINERARY, seed.itinerary),
  searchQuery: '',
  selectedRegion: 'ALL',
  selectedCategory: 'ALL',
  sortBy: 'featured',
  crudTab: 'destinasi',
  activeModalDestId: null,
};

const listeners = new Set();

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notify(scope = 'all') {
  listeners.forEach((cb) => cb(scope, store));
}

export function persistKey(key, value) {
  return safeSaveJSON(key, value);
}

export function resetStoreToSeed() {
  const fresh = createSeedData();
  store.destinasi = fresh.destinasi;
  store.kuliner = fresh.kuliner;
  store.akomodasi = fresh.akomodasi;
  store.paket = fresh.paket;
  store.favorit = fresh.favorit;
  store.itinerary = fresh.itinerary;

  persistKey(STORAGE_KEYS.DESTINASI, store.destinasi);
  persistKey(STORAGE_KEYS.KULINER, store.kuliner);
  persistKey(STORAGE_KEYS.AKOMODASI, store.akomodasi);
  persistKey(STORAGE_KEYS.PAKET, store.paket);
  persistKey(STORAGE_KEYS.FAVORIT, store.favorit);
  persistKey(STORAGE_KEYS.ITINERARY, store.itinerary);
  notify('all');
}
