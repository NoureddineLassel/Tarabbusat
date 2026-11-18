/* الوثائق المرفقة: التخزين (IndexedDB)، البصمة (SHA-256) لكشف إعادة الاستعمال، واستخراج التواريخ من ملفات PDF */
(function (global) {
  'use strict';
  const DB = 'tarabbusat-files', STORE = 'files';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    }));
  }
  const uid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  async function sha256(buf) {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- التواريخ ---------- */
  const MONTHS = {
    'جانفي': 1, 'يناير': 1, 'janvier': 1, 'january': 1, 'jan': 1,
    'فيفري': 2, 'فبراير': 2, 'février': 2, 'fevrier': 2, 'february': 2, 'feb': 2,
    'مارس': 3, 'mars': 3, 'march': 3, 'mar': 3,
    'أفريل': 4, 'افريل': 4, 'أبريل': 4, 'ابريل': 4, 'avril': 4, 'april': 4, 'apr': 4,
    'ماي': 5, 'مايو': 5, 'mai': 5, 'may': 5,
    'جوان': 6, 'يونيو': 6, 'juin': 6, 'june': 6, 'jun': 6,
    'جويلية': 7, 'يوليو': 7, 'juillet': 7, 'july': 7, 'jul': 7,
    'أوت': 8, 'اوت': 8, 'أغسطس': 8, 'اغسطس': 8, 'août': 8, 'aout': 8, 'august': 8, 'aug': 8,
    'سبتمبر': 9, 'septembre': 9, 'september': 9, 'sep': 9, 'sept': 9,
    'أكتوبر': 10, 'اكتوبر': 10, 'octobre': 10, 'october': 10, 'oct': 10,
    'نوفمبر': 11, 'novembre': 11, 'november': 11, 'nov': 11,
    'ديسمبر': 12, 'décembre': 12, 'decembre': 12, 'december': 12, 'dec': 12
  };
  const pad = n => String(n).padStart(2, '0');
  function valid(y, m, d) {
    const now = new Date().getFullYear();
    if (y < 1990 || y > now + 2 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1) return null;
    return y + '-' + pad(m) + '-' + pad(d);
  }
  function normalizeDigits(s) {
    return s.replace(/[٠-٩]/g, c => c.charCodeAt(0) - 0x0660).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 0x06F0);
  }
  /** يستخرج كل التواريخ من نص ويعيدها مرتبة من الأحدث إلى الأقدم */
  function findDates(text) {
    const s = normalizeDigits(String(text || '')).toLowerCase();
    const found = new Map();
    const add = (iso, raw) => { if (iso && !found.has(iso)) found.set(iso, raw.trim()); };
    let m;
    const reDMY = /(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(\d{4})/g;
    while ((m = reDMY.exec(s))) add(valid(+m[3], +m[2], +m[1]), m[0]);
    const reYMD = /(\d{4})\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})/g;
    while ((m = reYMD.exec(s))) add(valid(+m[1], +m[2], +m[3]), m[0]);
    const names = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
    const reName = new RegExp('(\\d{1,2})(?:er)?\\s+(' + names + ')\\.?\\s*,?\\s*(\\d{4})', 'g');
    while ((m = reName.exec(s))) add(valid(+m[3], MONTHS[m[2]], +m[1]), m[0]);
    const reNameEn = new RegExp('(' + names + ')\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})', 'g');
    while ((m = reNameEn.exec(s))) add(valid(+m[3], MONTHS[m[1]], +m[2]), m[0]);
    return [...found.entries()].map(([date, raw]) => ({ date, raw })).sort((a, b) => b.date.localeCompare(a.date));
  }

  async function pdfText(buf, maxPages) {
    if (!global.pdfjsLib) return { text: '', created: null };
    global.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const doc = await global.pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(doc.numPages, maxPages || 6); i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      text += c.items.map(it => it.str).join(' ') + '\n';
    }
    let created = null;
    try {
      const md = await doc.getMetadata();
      const cd = md && md.info && md.info.CreationDate;
      const mm = cd && cd.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (mm) created = valid(+mm[1], +mm[2], +mm[3]);
    } catch (e) { /* ignore */ }
    return { text, created, pages: doc.numPages };
  }

  /** يحلل ملفا: البصمة + التواريخ المقترحة */
  async function analyze(file) {
    const buf = await file.arrayBuffer();
    const hash = await sha256(buf);
    let dates = [], created = null, hasText = false;
    if (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      try {
        const r = await pdfText(buf.slice(0));
        hasText = r.text.replace(/\s/g, '').length > 30;
        dates = findDates(r.text);
        created = r.created;
      } catch (e) { console.warn('pdf', e); }
    }
    return { buf, hash, dates, created, hasText };
  }

  /** يضيف ملفا إلى المخزن ويعيد وصفه (evidence) */
  async function add(file) {
    const a = await analyze(file);
    const id = uid();
    const rec = { id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, hash: a.hash, blob: new Blob([a.buf], { type: file.type }), addedAt: Date.now() };
    await tx('readwrite', s => s.put(rec));
    const today = new Date().toISOString().slice(0, 10);
    const best = a.dates.find(d => d.date <= today);
    return {
      fileId: id, name: file.name, size: file.size, hash: a.hash,
      date: best ? best.date : '', suggested: a.dates.slice(0, 8).map(d => d.date),
      created: a.created, scanned: (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)) ? !a.hasText : null,
      image: /^image\//.test(file.type)
    };
  }
  function get(id) { return tx('readonly', s => s.get(id)); }
  function del(id) { return tx('readwrite', s => s.delete(id)); }
  async function open(id) {
    const r = await get(id);
    if (!r) return false;
    const url = URL.createObjectURL(r.blob);
    const w = global.open(url, '_blank');
    if (!w) { const a = document.createElement('a'); a.href = url; a.download = r.name; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }
  function b64(buf) {
    let s = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(str) { const bin = atob(str); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  async function exportFiles(ids) {
    const out = [];
    for (const id of [...new Set(ids)]) {
      const r = await get(id);
      if (r) out.push({ id: r.id, name: r.name, type: r.type, size: r.size, hash: r.hash, data: b64(await r.blob.arrayBuffer()) });
    }
    return out;
  }
  async function importFiles(list) {
    let n = 0;
    for (const f of list || []) {
      if (!f || !f.id || !f.data) continue;
      const blob = new Blob([unb64(f.data)], { type: f.type });
      await tx('readwrite', s => s.put({ id: f.id, name: f.name, type: f.type, size: f.size, hash: f.hash, blob, addedAt: Date.now() }));
      n++;
    }
    return n;
  }

  global.Files = { add, get, del, open, findDates, exportFiles, importFiles, sha256 };
})(typeof window !== 'undefined' ? window : globalThis);
