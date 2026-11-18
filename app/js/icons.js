/* عائلة أيقونات موحدة (شبكة 24، خط 1.8، أطراف مستديرة) + الشعار والرسوم — تتلون آليا حسب الثيم */
(function (global) {
  'use strict';
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    filePlus: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.7a3.4 3.4 0 0 1 0 6.6M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    ranking: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    checkList: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14M12 5l-.01 0"/><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    building: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    plane: '<path d="M21 4.5c.5-.5.5-1.5 0-2s-1.5-.5-2 0L15 6.5 5.5 4 4 5.5l7.5 4.5L8 13.5 5 13l-1.5 1.5 4 2 2 4L11 19l-.5-3 3.5-3.5 4.5 7.5 1.5-1.5L17.5 9z"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    filter: '<path d="M3 4.5h18l-7 8.5v6l-4 2v-8z"/>',
    link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.3-6.4l-1.7 1.7"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.3 6.4l1.7-1.7"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M4 19h16"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-5z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
  };
  function icon(name, cls) {
    return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  }

  /* الشعار: قبعة التخرج فوق كرة أرضية */
  const logo = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="38" r="20" fill="var(--brand)"/>
    <path d="M14 38h36M32 18c6 6 6 34 0 40M32 18c-6 6-6 34 0 40" fill="none" stroke="var(--brand-soft-ink)" stroke-width="2"/>
    <path d="M18 30c4 2 9 3 14 3s10-1 14-3M18 46c4-2 9-3 14-3s10 1 14 3" fill="none" stroke="var(--brand-soft-ink)" stroke-width="1.6" opacity=".8"/>
    <path d="M32 6 8 15l24 9 24-9z" fill="var(--brand-deep)"/>
    <path d="M17 18v7c4 3 9 4 15 4s11-1 15-4v-7l-15 6z" fill="var(--brand-deep)"/>
    <path d="M51 16v11" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><circle cx="51" cy="28.5" r="2.6" fill="var(--accent)"/>
  </svg>`;

  /* الرسم العلوي: كرة أرضية، مسار طائرة، ومعالم (برج إيفل، بيغ بن، مقام الشهيد) */
  const hero = `<svg class="hero-art" viewBox="0 0 640 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs>
      <radialGradient id="hg" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="var(--brand-2)"/><stop offset="1" stop-color="var(--brand)"/></radialGradient>
      <pattern id="hd" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="var(--brand)" opacity=".18"/></pattern>
    </defs>
    <ellipse cx="160" cy="70" rx="150" ry="60" fill="url(#hd)"/>
    <circle cx="300" cy="178" r="112" fill="url(#hg)"/>
    <path d="M188 178h224M300 66c38 38 38 186 0 224M300 66c-38 38-38 186 0 224M210 112c58 22 122 22 180 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
    <path d="M208 140c-10-60 40-110 120-118" fill="none" stroke="var(--brand)" stroke-width="2.4" stroke-dasharray="2 7" stroke-linecap="round"/>
    <g transform="translate(332 4) rotate(18)" fill="var(--brand-deep)"><path d="M0 14 38 10 46 0h6l-4 11 18 1 6-6h4l-3 9 3 9h-4l-6-6-18 1 4 11h-6l-8-10L0 20z"/></g>
    <g fill="var(--brand-deep)" opacity=".85">
      <path d="M452 150h44l-10-24-3-36-4-40-2-30h-6l-2 30-4 40-3 36zM465 118h18M469 88h10"/>
      <path d="M466 150c0-12 4-20 8-20s8 8 8 20z" fill="var(--panel)"/>
      <rect x="520" y="52" width="22" height="98"/><path d="M516 52h30l-15-30z"/><circle cx="531" cy="70" r="6" fill="var(--panel)"/>
      <path d="M572 150c2-40 6-80 14-118 3 38 1 80-4 118zM588 150c4-36 12-70 26-104-2 38-8 74-16 104zM600 150c8-24 20-48 36-70-8 28-18 52-26 70z" opacity=".9"/>
      <path d="M560 150h84v-6h-84z"/>
    </g>
  </svg>`;

  /* رسم بطاقة التصفية: كرة وكتب */
  const globeBooks = `<svg class="side-art" viewBox="0 0 200 170" aria-hidden="true">
    <rect x="40" y="128" width="120" height="16" rx="3" fill="var(--brand-deep)"/>
    <rect x="48" y="112" width="104" height="16" rx="3" fill="var(--accent)"/>
    <rect x="44" y="96" width="112" height="16" rx="3" fill="var(--brand)"/>
    <path d="M52 101h96M56 117h88M48 133h104" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    <circle cx="100" cy="55" r="40" fill="var(--brand-2)"/><circle cx="100" cy="55" r="40" fill="none" stroke="var(--brand)" stroke-width="3"/>
    <path d="M60 55h80M100 15c16 16 16 64 0 80M100 15c-16 16-16 64 0 80" fill="none" stroke="var(--brand)" stroke-width="2" opacity=".6"/>
    <path d="M52 72c30 18 80 10 102-26" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <g transform="translate(140 16) rotate(28) scale(.6)" fill="var(--brand-deep)"><path d="M0 14 38 10 46 0h6l-4 11 18 1 6-6h4l-3 9 3 9h-4l-6-6-18 1 4 11h-6l-8-10L0 20z"/></g>
  </svg>`;

  const avatar = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="var(--brand-2)"/><circle cx="24" cy="19" r="8" fill="var(--brand)"/><path d="M9 41c2.5-8 8-12 15-12s12.5 4 15 12a23 23 0 0 1-30 0z" fill="var(--brand-deep)"/></svg>`;

  global.UI_ICONS = { icon, logo, hero, globeBooks, avatar };
})(typeof window !== 'undefined' ? window : globalThis);
