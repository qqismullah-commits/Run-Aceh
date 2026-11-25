import { escapeHTML } from './formatters.js';

export function createIllustrationDataUrl(title, subtitle = 'Aceh', theme = 'sea') {
  const palettes = {
    sea: { bg1: '#042f2e', bg2: '#0f766e', wave: '#5eead4', accent: '#fde68a' },
    mountain: { bg1: '#064e3b', bg2: '#047857', wave: '#6ee7b7', accent: '#fef08a' },
    culinary: { bg1: '#115e59', bg2: '#065f46', wave: '#fbbf24', accent: '#fef3c7' },
    stay: { bg1: '#0f766e', bg2: '#134e4a', wave: '#99f6e4', accent: '#fde68a' },
  };
  const palette = palettes[theme] || palettes.sea;
  const safeTitle = escapeHTML(String(title || 'Aceh').slice(0, 28));
  const safeSub = escapeHTML(String(subtitle || 'Simulasi').slice(0, 28));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette.bg1}"/>
        <stop offset="100%" stop-color="${palette.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="640" height="380" fill="url(#g)"/>
    <circle cx="520" cy="88" r="46" fill="${palette.accent}" opacity="0.22"/>
    <path d="M0 245 Q160 205 320 248 T640 242 L640 380 L0 380 Z" fill="${palette.wave}" opacity="0.25"/>
    <path d="M0 282 Q180 250 360 288 T640 278 L640 380 L0 380 Z" fill="#042f2e" opacity="0.48"/>
    <rect x="34" y="34" width="572" height="312" rx="22" fill="none" stroke="${palette.accent}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="64" y="172" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="30" font-weight="800">${safeTitle}</text>
    <text x="64" y="210" fill="${palette.accent}" font-family="DM Sans, Arial, sans-serif" font-size="18" font-weight="600">${safeSub}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createSceneIllustrationDataUrl(label, sceneType = 'beach', regionTag = 'Aceh') {
  const safeLabel = escapeHTML(String(label || 'Aceh').slice(0, 30));
  const safeRegion = escapeHTML(String(regionTag || 'Aceh').slice(0, 24));

  const scenes = {
    mosque: `
      <rect width="640" height="380" fill="#064e3b"/>
      <rect y="255" width="640" height="125" fill="#042f2e"/>
      <rect x="180" y="155" width="280" height="110" rx="6" fill="#f8fafc"/>
      <path d="M235 155 Q320 68 405 155 Z" fill="#1e293b"/>
      <circle cx="320" cy="84" r="7" fill="#fbbf24"/>
      <rect x="132" y="110" width="24" height="155" rx="4" fill="#f1f5f9"/>
      <path d="M132 110 Q144 68 156 110 Z" fill="#1e293b"/>
      <rect x="484" y="110" width="24" height="155" rx="4" fill="#f1f5f9"/>
      <path d="M484 110 Q496 68 508 110 Z" fill="#1e293b"/>
      <rect x="200" y="215" width="240" height="22" rx="4" fill="#99f6e4" opacity="0.55"/>
    `,
    museum: `
      <rect width="640" height="380" fill="#0f766e"/>
      <rect y="265" width="640" height="115" fill="#042f2e"/>
      <path d="M120 265 L155 105 L485 105 L520 265 Z" fill="#e2e8f0" opacity="0.92"/>
      <path d="M175 265 L205 130 L435 130 L465 265 Z" fill="#134e4a"/>
      <path d="M140 165 Q320 195 500 165" fill="none" stroke="#fbbf24" stroke-width="5"/>
    `,
    beach: `
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0e7490"/>
          <stop offset="100%" stop-color="#5eead4"/>
        </linearGradient>
      </defs>
      <rect width="640" height="380" fill="url(#sky)"/>
      <circle cx="515" cy="82" r="36" fill="#fde68a"/>
      <path d="M0 190 Q180 140 360 185 T640 175 L640 245 L0 245 Z" fill="#0f766e"/>
      <path d="M0 225 Q220 205 440 232 T640 220 L640 380 L0 380 Z" fill="#fde68a"/>
      <path d="M95 235 Q110 145 145 112" fill="none" stroke="#064e3b" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="145" cy="112" rx="34" ry="12" fill="#065f46"/>
    `,
    monument: `
      <rect width="640" height="380" fill="#065f46"/>
      <path d="M0 195 Q220 135 640 175 L640 380 L0 380 Z" fill="#047857"/>
      <rect x="292" y="95" width="56" height="175" rx="8" fill="#f8fafc"/>
      <path d="M275 95 L320 55 L365 95 Z" fill="#fbbf24"/>
      <rect x="255" y="250" width="130" height="24" rx="6" fill="#d97706"/>
    `,
    lake: `
      <defs>
        <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#134e4a"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="640" height="380" fill="url(#mtn)"/>
      <path d="M0 185 L155 105 L310 180 L470 110 L640 175 L640 225 L0 225 Z" fill="#064e3b"/>
      <rect y="215" width="640" height="165" fill="#14b8a6"/>
      <path d="M80 265 Q240 248 400 268 T620 260" fill="none" stroke="#ccfbf1" stroke-width="3" opacity="0.6"/>
    `,
    hill: `
      <rect width="640" height="380" fill="#064e3b"/>
      <path d="M0 215 Q190 120 420 205 T640 180 L640 380 L0 380 Z" fill="#047857"/>
      <path d="M0 265 Q260 195 520 258 T640 245 L640 380 L0 380 Z" fill="#065f46"/>
      <circle cx="115" cy="86" r="30" fill="#fef08a" opacity="0.85"/>
    `,
    culture: `
      <rect width="640" height="380" fill="#115e59"/>
      <rect y="265" width="640" height="115" fill="#042f2e"/>
      <rect x="165" y="165" width="310" height="100" rx="4" fill="#92400e"/>
      <path d="M125 168 L320 76 L515 168 Z" fill="#1e293b"/>
      <path d="M125 168 L108 192 M515 168 L532 192" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
    `,
    noodle: `
      <rect width="640" height="380" fill="#064e3b"/>
      <circle cx="320" cy="195" r="118" fill="#fef3c7"/>
      <circle cx="320" cy="195" r="98" fill="#b45309"/>
      <path d="M242 182 Q320 138 398 182 Q370 232 320 232 Q270 232 242 182 Z" fill="#fbbf24"/>
      <circle cx="320" cy="186" r="22" fill="#dc2626" opacity="0.85"/>
    `,
    coffee: `
      <rect width="640" height="380" fill="#115e59"/>
      <ellipse cx="320" cy="245" rx="145" ry="26" fill="#fef3c7"/>
      <path d="M235 145 L405 145 L388 238 Q320 256 252 238 Z" fill="#f8fafc"/>
      <ellipse cx="320" cy="145" rx="85" ry="18" fill="#451a03"/>
      <path d="M405 162 Q445 162 445 194 Q445 218 400 218" fill="none" stroke="#f8fafc" stroke-width="10"/>
    `,
    snack: `
      <rect width="640" height="380" fill="#065f46"/>
      <ellipse cx="245" cy="205" rx="82" ry="44" fill="#fbbf24"/>
      <ellipse cx="395" cy="215" rx="88" ry="46" fill="#d97706"/>
      <circle cx="395" cy="212" r="26" fill="#fef3c7" opacity="0.75"/>
    `,
  };

  const bodyArt = scenes[sceneType] || scenes.beach;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
    ${bodyArt}
    <rect x="0" y="294" width="640" height="86" fill="#042f2e" opacity="0.84"/>
    <text x="28" y="330" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">${safeLabel}</text>
    ${
      safeRegion
        ? `<text x="28" y="358" fill="#fde68a" font-family="DM Sans, Arial, sans-serif" font-size="14" font-weight="600">${safeRegion}</text>`
        : ''
    }
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createRunDistanceIllustrationDataUrl(distanceText = '3K', labelText = '3km Fun Run') {
  const safeDist = escapeHTML(String(distanceText).slice(0, 12));
  const safeLabel = escapeHTML(String(labelText).slice(0, 32));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
    <defs>
      <linearGradient id="runBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#042f2e"/>
        <stop offset="60%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>
    </defs>
    <rect width="640" height="380" fill="url(#runBg)"/>
    <circle cx="520" cy="78" r="38" fill="#fbbf24" opacity="0.18"/>
    <path d="M0 240 Q180 200 360 236 T640 218" fill="none" stroke="#5eead4" stroke-opacity="0.22" stroke-width="4"/>
    <path d="M0 264 Q200 226 380 260 T640 242" fill="none" stroke="#fde68a" stroke-opacity="0.2" stroke-width="2.5"/>
    <text x="320" y="205" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="148" font-weight="800" letter-spacing="-4">${safeDist}</text>
    <rect x="0" y="294" width="640" height="86" fill="#042f2e" opacity="0.9"/>
    <text x="28" y="346" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="26" font-weight="800">${safeLabel}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function makePlaceholderImg(label) {
  const lower = String(label || '').toLowerCase();
  if (lower.includes('42km') || lower.includes('full marathon')) {
    return createRunDistanceIllustrationDataUrl('42K', label);
  }
  if (lower.includes('21km') || lower.includes('half marathon')) {
    return createRunDistanceIllustrationDataUrl('21K', label);
  }
  if (lower.includes('10km')) {
    return createRunDistanceIllustrationDataUrl('10K', label);
  }
  if (lower.includes('5km')) {
    return createRunDistanceIllustrationDataUrl('5K', label);
  }
  if (lower.includes('3km') || lower.includes('fun run')) {
    return createRunDistanceIllustrationDataUrl('3K', label);
  }
  if (lower.includes('baiturrahman') || lower.includes('masjid')) {
    return createSceneIllustrationDataUrl(label, 'mosque', 'Banda Aceh');
  }
  if (lower.includes('tsunami') || lower.includes('museum')) {
    return createSceneIllustrationDataUrl(label, 'museum', 'Banda Aceh');
  }
  if (lower.includes('iboih') || lower.includes('lampuuk') || lower.includes('pantai') || lower.includes('sabang')) {
    return createSceneIllustrationDataUrl(label, 'beach', 'Aceh');
  }
  if (lower.includes('nol kilometer') || lower.includes('tugu') || lower.includes('gunongan')) {
    return createSceneIllustrationDataUrl(label, 'monument', 'Aceh');
  }
  if (lower.includes('danau') || lower.includes('lut tawar')) {
    return createSceneIllustrationDataUrl(label, 'lake', 'Aceh Tengah');
  }
  if (lower.includes('bur telege') || lower.includes('bukit') || lower.includes('gayo')) {
    return createSceneIllustrationDataUrl(label, 'hill', 'Dataran Tinggi Aceh');
  }
  if (lower.includes('rumoh') || lower.includes('indrapuri') || lower.includes('budaya')) {
    return createSceneIllustrationDataUrl(label, 'culture', 'Aceh');
  }
  if (lower.includes('mie aceh')) {
    return createSceneIllustrationDataUrl(label, 'noodle', 'Kuliner Aceh');
  }
  if (lower.includes('kopi')) {
    return createSceneIllustrationDataUrl(label, 'coffee', 'Kopi Aceh');
  }
  if (lower.includes('meuseukat') || lower.includes('timphan') || lower.includes('kuliner') || lower.includes('umkm')) {
    return createSceneIllustrationDataUrl(label, 'snack', 'UMKM Aceh');
  }
  if (lower.includes('akomodasi') || lower.includes('stay') || lower.includes('wisma') || lower.includes('pondok') || lower.includes('griya')) {
    return createIllustrationDataUrl(label, 'Akomodasi · Simulasi', 'stay');
  }
  return createIllustrationDataUrl(label, 'Aceh · Simulasi', 'sea');
}

export function getRegionThumbnail(region) {
  const regionThemes = {
    'Banda Aceh': ['Banda Aceh', 'Pusat Budaya & Religi', 'sea'],
    'Sabang': ['Sabang · Pulau Weh', 'Bahari & Nol Kilometer', 'sea'],
    'Aceh Besar': ['Aceh Besar', 'Pesisir & Situs Budaya', 'sea'],
    'Aceh Tengah': ['Aceh Tengah · Gayo', 'Danau & Dataran Tinggi', 'mountain'],
    'Bener Meriah': ['Bener Meriah', 'Perbukitan & Kopi UMKM', 'mountain'],
  };
  const [title, subtitle, theme] = regionThemes[region] || [region, 'Wilayah Aceh', 'sea'];
  return createIllustrationDataUrl(title, subtitle, theme);
}
