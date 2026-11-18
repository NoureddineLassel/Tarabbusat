/* واجهة التطبيق — وضع الإدارة ووضع المترشح */
(function () {
  'use strict';
  const D = window.GRIDS_DATA, S = window.Scoring, F = window.Files, I = window.I18N;
  const t = I.t, g = I.g;
  const MODE = new URLSearchParams(location.search).get('mode') === 'candidate' ? 'candidate' : 'admin';
  const KEY = MODE === 'candidate' ? 'tarabbusat.candidate.v1' : 'tarabbusat.v1';
  const PREFS = 'tarabbusat.prefs';
  const main = document.getElementById('main');

  const STATUS = { accepted: 'b-ok', reserve: 'b-warn', rejected: 'b-bad', ineligible: 'b-bad', ranked: 'b-info' };
  const PROG_COLOR = { conf: '#c2410c', sejour: '#7c3aed', stage: '#1d4ed8', stage_special: '#0f766e', stage_long: '#92400e' };
  const THEMES = ['green', 'blue', 'bordeaux', 'violet', 'sand', 'dark'];

  /* ================= التخزين ================= */
  const clone = o => JSON.parse(JSON.stringify(o));
  function defaults() {
    const now = new Date(), y = now.getFullYear();
    return {
      version: 2,
      settings: {
        structure: clone(window.DEFAULT_STRUCTURE), myFaculty: '',
        vdName: '', vdTitle: '',
        academicYear: now.getMonth() >= 8 ? y + '/' + (y + 1) : (y - 1) + '/' + y,
        fy: String(y), committee: [], seats: {}, groupBy: ['rank'], starsPriority: 'tie',
        followDays: 30, councilName: '', platformClose: {}
      },
      candidates: []
    };
  }
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const st = Object.assign(d.settings, s.settings || {});
        if (!st.structure || !Array.isArray(st.structure.faculties)) st.structure = clone(window.DEFAULT_STRUCTURE);
        return { version: 2, settings: st, candidates: Array.isArray(s.candidates) ? s.candidates : [] };
      }
    } catch (e) { console.warn(e); }
    return d;
  }
  let state = load();
  let prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch (e) { return {}; } })();
  let saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    const doit = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast(t('toast.saveFail')); } };
    if (now) doit(); else saveTimer = setTimeout(doit, 250);
  }
  function savePrefs() { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
  window.addEventListener('beforeunload', () => save(true));

  /* ================= أدوات ================= */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString(I.locale(), { maximumFractionDigits: 2 });
  const P = () => state.settings;
  const nm = o => o ? (o[I.lang] || o.ar || '') : '';
  const code = gr => !gr ? '' : I.lang === 'ar' ? '\u2068' + gr.code + '\u2069' : gr.code.replace('ج', 'U').replace('م', 'R').replace('خ', 'S');
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('on'), 2800);
  }
  function fyCands() { return state.candidates.filter(c => String(c.fy) === String(P().fy)); }
  function candById(id) { return state.candidates.find(c => c.id === id); }
  function fullName(c) { return ((c.surname || '') + ' ' + (c.name || '')).trim() || t('noName'); }
  function rankLabel(c) { const rk = S.rankOf(S.gridById(c.gridId), c.rank); return rk ? g(rk.label) : (c.rankText || '—'); }
  function badge(status) { return `<span class="badge ${STATUS[status] || 'b-mut'}">${t('st.' + status)}</span>`; }
  function progChip(p) { return D.PROGRAMS[p] ? `<span class="chip" style="--c:${PROG_COLOR[p]}">${esc(g(D.PROGRAMS[p].label))}</span>` : ''; }
  const facs = () => P().structure.faculties;
  const facById = id => facs().find(f => f.id === id) || null;
  const deptOf = c => { const f = facById(c.facultyId); return f && c.deptId ? f.depts.find(d => d.id === c.deptId) || null : null; };
  function facName(c) { const f = facById(c.facultyId); return f ? nm(f) : ''; }
  function deptName(c) { const d = deptOf(c); return d ? nm(d) : (c.department || ''); }
  function facChip(c) { const f = facById(c.facultyId); return f ? `<span class="dot" style="background:${f.color}" title="${esc(nm(f))}"></span>` : ''; }
  function instName() { return nm(P().structure.institution); }
  function gridOptions(sel, withAll) {
    const groups = { university: t('scope.university'), research: t('scope.research') };
    let h = `<option value="">${withAll ? t('allGrids') : t('chooseGrid')}</option>`;
    for (const sc of Object.keys(groups)) {
      h += `<optgroup label="${groups[sc]}">`;
      for (const gr of D.GRIDS.filter(x => x.scope === sc)) h += `<option value="${gr.id}" ${gr.id === sel ? 'selected' : ''}>${esc(code(gr) + ' — ' + g(gr.title))}</option>`;
      h += `</optgroup>`;
    }
    return h;
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function confirmBox(msg, onYes, yesLabel) {
    const m = document.getElementById('modal'), b = document.getElementById('modalBody');
    b.innerHTML = `<p style="margin-top:0">${msg}</p><div class="btns" style="justify-content:flex-end">
      <button class="btn" data-m="no">${t('cancel')}</button><button class="btn primary" data-m="yes">${yesLabel || t('confirm')}</button></div>`;
    m.classList.add('on');
    b.onclick = e => { const k = e.target.getAttribute('data-m'); if (!k) return; m.classList.remove('on'); b.onclick = null; if (k === 'yes') onYes(); };
  }
  function rankingAll() { return S.rankCandidates(fyCands(), P(), { groupBy: P().groupBy || [], all: state.candidates }); }
  function acceptedIds() {
    const ids = new Set();
    const fys = [...new Set(state.candidates.map(c => String(c.fy)))];
    for (const fy of fys) S.rankCandidates(state.candidates.filter(c => String(c.fy) === fy), P(), { groupBy: P().groupBy || [], all: state.candidates })
      .forEach(gp => gp.rows.forEach(r => { if (r.status === 'accepted') ids.add(r.cand.id); }));
    return ids;
  }
  function positionOf(c) {
    for (const gp of rankingAll()) {
      const r = gp.rows.find(x => x.cand.id === c.id);
      if (r) return { pos: r.position, of: gp.eligible, count: gp.count, status: r.status, group: gp };
    }
    return null;
  }
  function groupLabel(key) {
    const parts = key.split('|'), gr = S.gridById(parts[0]);
    const out = [gr ? code(gr) + ' — ' + g(gr.title) : parts[0]];
    for (const p of parts.slice(1)) {
      const i = p.indexOf(':'), k = p.slice(0, i), v = p.slice(i + 1);
      if (k === 'f') { const f = facById(v); out.push(f ? nm(f) : v); }
      if (k === 'r') { const rk = S.rankOf(gr, v); out.push(t('f.rank') + ': ' + (rk ? g(rk.label) : v)); }
      if (k === 'd') {
        let name = v;
        for (const f of facs()) { const d = f.depts.find(x => x.id === v); if (d) { name = nm(d); break; } }
        out.push(t('f.dept') + ': ' + name);
      }
      if (k === 's') out.push(t('f.specialty') + ': ' + v);
      if (k === 'p') out.push(D.PROGRAMS[v] ? g(D.PROGRAMS[v].label) : v);
    }
    return out;
  }

  /* ================= المظهر واللغة ================= */
  function applyPrefs() {
    I.setLang(prefs.lang || 'ar');
    document.documentElement.lang = I.lang;
    document.documentElement.dir = I.dir();
    document.documentElement.dataset.theme = prefs.theme || 'green';
    document.title = t('app.title');
    renderSide();
  }
  function renderSide() {
    const side = document.getElementById('side');
    const nav = MODE === 'candidate'
      ? [['mine', '✎', t('nav.mine')], ['guide', '?', t('nav.guide')]]
      : [['dashboard', '◧', t('nav.dashboard')], ['candidates', '☰', t('nav.candidates')], ['new', '＋', t('nav.new')],
        ['ranking', '⇅', t('nav.ranking')], ['quotas', '◔', t('nav.quotas')], ['followup', '✓', t('nav.followup')],
        ['grids', '▤', t('nav.grids')], ['decree', '§', t('nav.decree')], ['structure', '⌂', t('nav.structure')], ['settings', '⚙', t('nav.settings')]];
    const years = new Set(state.candidates.map(c => String(c.fy)));
    const y = +P().fy || new Date().getFullYear();
    [y - 1, y, y + 1].forEach(v => years.add(String(v)));
    side.innerHTML = `<div class="logo">${t('app.title')}</div>
      <div class="sub">${esc(instName())}<br>${t('app.sub')}</div>
      ${MODE === 'candidate' ? `<div class="badge b-warn" style="margin-bottom:10px">${t('mode.candidate')}</div>` : ''}
      <nav id="nav">${nav.map(([v, ic, l]) => `<a href="#${v}" data-v="${v}"><span class="ic">${ic}</span> ${l}</a>`).join('')}</nav>
      <div class="fy">
        ${MODE === 'admin' ? `<label>${t('fy')}<select id="fySelect">${[...years].sort().map(v => `<option ${v === String(P().fy) ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
        <label>${t('lang')}<select id="langSelect">${[['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']].map(([k, l]) => `<option value="${k}" ${I.lang === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>${t('theme')}<select id="themeSelect">${THEMES.map(k => `<option value="${k}" ${(prefs.theme || 'green') === k ? 'selected' : ''}>${t('theme.' + k)}</option>`).join('')}</select></label>
      </div>`;
    const fy = document.getElementById('fySelect');
    if (fy) fy.onchange = e => { P().fy = e.target.value; save(); route(); };
    document.getElementById('langSelect').onchange = e => { prefs.lang = e.target.value; savePrefs(); applyPrefs(); route(); };
    document.getElementById('themeSelect').onchange = e => { prefs.theme = e.target.value; savePrefs(); applyPrefs(); markNav(); };
    markNav();
  }
  function markNav() {
    const v = (location.hash.slice(1) || '').split('/')[0];
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.v === v || (v === 'edit' && a.dataset.v === 'candidates')));
  }

  /* ================= التوجيه ================= */
  let cur = null, edTab = 'info';
  const filt = { q: '', grid: '', fac: '', status: '', sort: 'recent' };
  let rankGrid = '';

  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || (MODE === 'candidate' ? 'mine' : 'dashboard');
    const [v, arg] = h.split('/');
    markNav();
    document.getElementById('side').classList.remove('open');
    cur = null;
    if (MODE === 'candidate') {
      if (v === 'guide') viewGuide(); else viewMine();
      window.scrollTo(0, 0); return;
    }
    switch (v) {
      case 'candidates': viewCandidates(); break;
      case 'new': newCandidate(arg); return;
      case 'edit': viewEditor(arg); break;
      case 'ranking': viewRanking(); break;
      case 'quotas': viewQuotas(); break;
      case 'followup': viewFollowup(); break;
      case 'grids': viewGrids(arg); break;
      case 'decree': viewDecree(); break;
      case 'structure': viewStructure(); break;
      case 'settings': viewSettings(); break;
      default: viewDashboard();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  function topbar(title, actions) {
    return `<div class="topbar"><div class="btns"><button class="btn menu-btn" data-act="menu">☰</button><h1>${title}</h1></div><div class="btns">${actions || ''}</div></div>`;
  }

  /* ================= لوحة القيادة ================= */
  function viewDashboard() {
    const rows = rankingAll().flatMap(gp => gp.rows);
    const n = rows.length, ok = rows.filter(r => r.elig.ok).length, acc = rows.filter(r => r.status === 'accepted').length;
    let h = topbar(t('nav.dashboard'), `<a class="btn primary" href="#new">＋ ${t('nav.new')}</a>`);
    if (!n) {
      h += `<div class="card"><h2>${t('welcome.title')}</h2><p>${t('welcome.p', { fy: esc(P().fy), inst: esc(instName()) })}</p>
        <ol><li>${t('welcome.1')}</li><li>${t('welcome.2')}</li><li>${t('welcome.3')}</li><li>${t('welcome.4')}</li></ol>
        <div class="btns"><a class="btn primary" href="#new">＋ ${t('welcome.first')}</a><button class="btn" data-act="import-packages">${t('btn.importPackages')}</button>
        <button class="btn" data-act="import-xlsx">${t('btn.importXlsx')}</button><button class="btn" data-act="demo">${t('btn.demo')}</button></div></div>`;
      h += candidateLinkCard();
      main.innerHTML = h; return;
    }
    h += `<div class="grid4">
      <div class="card stat"><b>${n}</b><span>${t('dash.files', { fy: esc(P().fy) })}</span></div>
      <div class="card stat"><b style="color:var(--ok)">${ok}</b><span>${t('dash.ok')}</span></div>
      <div class="card stat"><b style="color:var(--bad)">${n - ok}</b><span>${t('dash.bad')}</span></div>
      <div class="card stat"><b>${acc}</b><span>${t('dash.acc')}</span></div></div>`;
    h += `<div class="card"><h2>${t('dash.byGrid')}</h2><div class="tbl-wrap"><table class="t"><thead><tr>
      <th>${t('f.grid')}</th><th class="num">${t('dash.nFiles')}</th><th class="num">${t('dash.nOk')}</th><th class="num">${t('dash.nAcc')}</th><th class="num">${t('dash.best')}</th><th class="num">${t('dash.avg')}</th><th></th></tr></thead><tbody>`;
    for (const gr of D.GRIDS) {
      const gs = rows.filter(r => r.cand.gridId === gr.id);
      if (!gs.length) continue;
      const okr = gs.filter(r => r.elig.ok);
      const best = okr.length ? Math.max(...okr.map(r => r.score)) : 0;
      const avg = okr.length ? okr.reduce((a, r) => a + r.score, 0) / okr.length : 0;
      h += `<tr><td><b>${esc(code(gr))}</b> ${esc(g(gr.title))}<div class="small muted">${esc(g(gr.population))}</div></td>
        <td class="num">${gs.length}</td><td class="num">${okr.length}</td><td class="num">${gs.filter(r => r.status === 'accepted').length}</td>
        <td class="num">${gr.noScoring ? '—' : fmt(best)}</td><td class="num">${gr.noScoring ? '—' : fmt(avg)}</td>
        <td><button class="btn sm" data-act="goto-rank" data-g="${gr.id}">${t('nav.ranking')}</button></td></tr>`;
    }
    h += `</tbody></table></div></div>`;
    // حسب الكلية
    const byFac = {};
    rows.forEach(r => { const k = r.cand.facultyId || ''; (byFac[k] = byFac[k] || []).push(r); });
    h += `<div class="card"><h2>${t('dash.byFaculty')}</h2><div class="fac-bars">`;
    for (const [k, list] of Object.entries(byFac).sort((a, b) => b[1].length - a[1].length)) {
      const f = facById(k);
      h += `<div class="fac-bar"><span class="dot" style="background:${f ? f.color : '#94a3b8'}"></span><span class="nm">${esc(f ? nm(f) : t('noFaculty'))}</span>
        <span class="bar"><i style="width:${Math.round(list.length / n * 100)}%;background:${f ? f.color : '#94a3b8'}"></i></span><b>${list.length}</b></div>`;
    }
    h += `</div></div>`;
    const bad = rows.filter(r => !r.elig.ok);
    if (bad.length) {
      h += `<div class="card"><h2>${t('dash.review')}</h2><div class="tbl-wrap"><table class="t"><tbody>`;
      for (const r of bad.slice(0, 15)) {
        const gr = S.gridById(r.cand.gridId);
        h += `<tr><td>${facChip(r.cand)}<a href="#edit/${r.cand.id}">${esc(fullName(r.cand))}</a><div class="small muted">${esc(gr ? code(gr) : '—')} · ${esc(deptName(r.cand))}</div></td><td class="small" style="color:var(--bad)">${esc(r.elig.reasons.join(' — '))}</td></tr>`;
      }
      h += `</tbody></table></div></div>`;
    }
    const docFlags = rows.reduce((a, r) => a + (r.elig.docs ? r.elig.docs.counts.reused + r.elig.docs.counts.before + r.elig.docs.counts.oldReg : 0), 0);
    if (docFlags) h += `<div class="alert warn">${t('dash.docFlags', { n: docFlags })}</div>`;
    const pend = followRows().filter(f => f.state === 'late' || f.state === 'pending');
    if (pend.length) h += `<div class="alert warn">${t('dash.follow', { n: pend.length })} <a href="#followup">${t('nav.followup')}</a></div>`;
    h += candidateLinkCard();
    main.innerHTML = h;
  }
  function candidateUrl() { return location.href.split('#')[0].split('?')[0] + '?mode=candidate'; }
  function candidateLinkCard() {
    return `<div class="card"><h2>${t('cl.title')}</h2><p class="small">${t('cl.p')}</p>
      <div class="btns"><input type="text" readonly class="sel-all" value="${esc(candidateUrl())}" style="flex:1;min-width:240px">
      <button class="btn" data-act="copy-link">${t('cl.copy')}</button><button class="btn primary" data-act="import-packages">${t('btn.importPackages')}</button></div></div>`;
  }

  /* ================= قائمة الملفات ================= */
  function viewCandidates() {
    let h = topbar(t('cands.title', { fy: esc(P().fy) }), `
      <a class="btn primary" href="#new">＋ ${t('nav.new')}</a>
      <button class="btn" data-act="import-packages">${t('btn.importPackages')}</button>
      <button class="btn" data-act="import-xlsx">${t('btn.importXlsx')}</button>
      <button class="btn" data-act="xlsx-template">${t('btn.template')}</button>
      <button class="btn" data-act="export-list">${t('btn.exportXlsx')}</button>`);
    h += `<div class="card drop" id="dropZone"><div class="grid4">
      <label class="f"><span>${t('search')}</span><input type="text" id="fq" value="${esc(filt.q)}" placeholder="${t('searchPh')}"></label>
      <label class="f"><span>${t('f.grid')}</span><select id="fg">${gridOptions(filt.grid, true)}</select></label>
      <label class="f"><span>${t('f.faculty')}</span><select id="ff"><option value="">${t('allFaculties')}</option>${facs().map(f => `<option value="${f.id}" ${f.id === filt.fac ? 'selected' : ''}>${esc(nm(f))}</option>`).join('')}</select></label>
      <label class="f"><span>${t('f.status')}</span><select id="fs">
        <option value="">${t('all')}</option><option value="ok" ${filt.status === 'ok' ? 'selected' : ''}>${t('dash.ok')}</option>
        <option value="bad" ${filt.status === 'bad' ? 'selected' : ''}>${t('dash.bad')}</option>
        <option value="accepted" ${filt.status === 'accepted' ? 'selected' : ''}>${t('st.accepted')}</option>
        <option value="imported" ${filt.status === 'imported' ? 'selected' : ''}>${t('importedFromCand')}</option></select></label></div>
      <div class="btns" style="margin-top:10px"><span class="small muted">${t('sortBy')}</span>
        <select id="fo" style="width:auto"><option value="recent" ${filt.sort === 'recent' ? 'selected' : ''}>${t('sort.recent')}</option>
          <option value="name" ${filt.sort === 'name' ? 'selected' : ''}>${t('sort.name')}</option><option value="total" ${filt.sort === 'total' ? 'selected' : ''}>${t('sort.total')}</option></select>
        <span class="small muted">${t('dropHint')}</span></div></div>
      <div class="card" id="candTable"></div>`;
    main.innerHTML = h;
    const bind = (id, k) => document.getElementById(id).addEventListener('input', e => { filt[k] = e.target.value; renderCandTable(); });
    bind('fq', 'q'); bind('fg', 'grid'); bind('ff', 'fac'); bind('fs', 'status'); bind('fo', 'sort');
    renderCandTable();
  }
  function renderCandTable() {
    const map = {};
    rankingAll().forEach(gp => gp.rows.forEach(r => { map[r.cand.id] = r; }));
    const q = filt.q.trim().toLowerCase();
    let list = fyCands().filter(c => {
      const r = map[c.id];
      if (filt.grid && c.gridId !== filt.grid) return false;
      if (filt.fac && c.facultyId !== filt.fac) return false;
      if (filt.status === 'ok' && !(r && r.elig.ok)) return false;
      if (filt.status === 'bad' && r && r.elig.ok) return false;
      if (filt.status === 'accepted' && !(r && r.status === 'accepted')) return false;
      if (filt.status === 'imported' && !c.imported) return false;
      if (q && ![c.surname, c.name, c.specialty, deptName(c), facName(c), c.lab, c.host, c.country].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    if (filt.sort === 'name') list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'ar'));
    else if (filt.sort === 'total') list.sort((a, b) => (map[b.id] ? map[b.id].score : 0) - (map[a.id] ? map[a.id].score : 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('candTable');
    if (!list.length) { el.innerHTML = `<div class="empty">${t('noMatch')}</div>`; return; }
    let h = `<div class="small muted" style="margin-bottom:6px">${t('nFiles', { n: list.length })}</div><div class="tbl-wrap"><table class="t"><thead><tr>
      <th>#</th><th>${t('f.fullName')}</th><th>${t('f.grid')}</th><th>${t('f.rank')}</th><th>${t('f.facDept')}</th><th>${t('f.progDest')}</th><th class="num">${t('f.total')}</th><th>${t('f.status')}</th><th></th></tr></thead><tbody>`;
    list.forEach((c, i) => {
      const r = map[c.id], gr = S.gridById(c.gridId);
      const docs = r && r.elig.docs ? r.elig.docs.counts : null;
      const nFlags = docs ? docs.reused + docs.before + docs.oldReg + docs.dup : 0;
      h += `<tr class="prog-row" style="--c:${PROG_COLOR[c.program] || 'transparent'}"><td class="num">${i + 1}</td>
        <td><a href="#edit/${c.id}"><b>${esc(fullName(c))}</b></a>${c.imported ? ` <span class="badge b-info" title="${t('importedFromCand')}">⇩</span>` : ''}</td>
        <td>${gr ? `<span class="badge b-info" title="${esc(g(gr.title))}">${esc(code(gr))}</span>` : '<span class="badge b-bad">—</span>'}</td>
        <td class="small">${esc(rankLabel(c))}</td>
        <td class="small">${facChip(c)}${esc(facName(c) || '—')}<div class="muted">${esc(deptName(c))}${c.specialty ? ' · ' + esc(c.specialty) : ''}</div></td>
        <td class="small">${progChip(c.program)}<div class="muted">${esc([c.country, c.host].filter(Boolean).join(' — '))}</div></td>
        <td class="num"><b>${gr && gr.noScoring ? '—' : fmt(r ? r.score : 0)}</b></td>
        <td>${r ? badge(r.status) : ''}${r && r.elig.reasons.length ? `<div class="small" style="color:var(--bad)">${t('nNotes', { n: r.elig.reasons.length })}</div>` : ''}${nFlags ? `<div class="small" style="color:var(--warn)">⚑ ${t('nDocFlags', { n: nFlags })}</div>` : ''}</td>
        <td><div class="btns"><a class="btn sm" href="#edit/${c.id}">${t('open')}</a><button class="btn sm" data-act="print-sheet" data-id="${c.id}">${t('print')}</button>
          <button class="btn sm" data-act="dup-cand" data-id="${c.id}" title="${t('duplicate')}">⧉</button>
          <button class="btn sm danger" data-act="del-cand" data-id="${c.id}" title="${t('delete')}">✕</button></div></td></tr>`;
    });
    el.innerHTML = h + `</tbody></table></div>`;
  }

  /* ================= المحرر ================= */
  function blankCandidate(gridId) {
    const gr = S.gridById(gridId);
    return {
      id: uid(), fy: P().fy, createdAt: Date.now(), surname: '', name: '', algerian: true,
      gridId: gr ? gr.id : '', rank: '', program: gr ? gr.programs[0] : '', facultyId: P().myFaculty || '',
      docs: {}, docFiles: {}, scores: {}, decision: 'auto', followup: {}
    };
  }
  function newCandidate(gridId) {
    const c = blankCandidate(gridId);
    state.candidates.push(c); save();
    edTab = 'info';
    history.replaceState(null, '', '#edit/' + c.id);
    route();
  }
  function fText(f, label, val, type, attrs) {
    return `<label class="f"><span>${label}</span><input type="${type || 'text'}" data-f="${f}" value="${esc(val == null ? '' : val)}" ${attrs || ''}></label>`;
  }
  function fCheck(f, label, val, attr) { return `<label class="chk"><input type="checkbox" ${attr || 'data-f'}="${f}" ${val ? 'checked' : ''}><span>${label}</span></label>`; }

  function viewEditor(id) {
    const c = candById(id);
    if (!c) { main.innerHTML = topbar(t('notFound')) + `<div class="card empty"><a href="#candidates">${t('backList')}</a></div>`; return; }
    cur = c; renderEditor();
  }
  function edTabs() {
    const tabs = [['info', t('tab.info')], ['docs', t('tab.docs')], ['score', t('tab.score')]];
    if (MODE === 'admin') tabs.push(['decision', t('tab.decision')]);
    return tabs;
  }
  function renderEditor() {
    const c = cur, gr = S.gridById(c.gridId);
    const acts = MODE === 'candidate'
      ? `<button class="btn primary" data-act="export-package">📦 ${t('btn.exportPackage')}</button><button class="btn danger" data-act="cand-reset">${t('btn.newDossier')}</button>`
      : `<a class="btn" href="#candidates">${t('backList')}</a>
        <button class="btn" data-act="print-sheet" data-id="${c.id}">🖶 ${t('btn.printSheet')}</button>
        <button class="btn" data-act="export-package">📦 ${t('btn.exportPackage')}</button>
        <button class="btn danger" data-act="del-cand" data-id="${c.id}">${t('delete')}</button>`;
    const tabs = edTabs();
    const i = tabs.findIndex(x => x[0] === edTab);
    if (i < 0) edTab = 'info';
    let h = topbar(esc(fullName(c)), acts);
    if (c.imported && MODE === 'admin') h += `<div class="alert info small">${t('importedNote', { d: new Date(c.importedAt || Date.now()).toLocaleString(I.locale()) })}</div>`;
    h += `<div class="editor"><div>
      <div class="tabs">${tabs.map((x, k) => `<button class="${edTab === x[0] ? 'on' : ''}" data-act="tab" data-t="${x[0]}">${k + 1}. ${x[1]}</button>`).join('')}</div>
      <div id="edBody">${edTab === 'info' ? edInfo(c, gr) : edTab === 'docs' ? edDocs(c, gr) : edTab === 'score' ? edScore(c, gr) : edDecision(c, gr)}</div>
      <div class="btns" style="margin-top:12px">${i > 0 ? `<button class="btn" data-act="tab" data-t="${tabs[i - 1][0]}">${t('prev')}</button>` : ''}
        ${i < tabs.length - 1 ? `<button class="btn primary" data-act="tab" data-t="${tabs[i + 1][0]}">${t('next')}</button>` : ''}</div>
      </div><div class="summary card" id="summary"></div></div>`;
    main.innerHTML = h;
    updateSummary();
  }

  function edInfo(c, gr) {
    const progs = Object.keys(D.PROGRAMS);
    const ordered = gr ? gr.programs.concat(progs.filter(p => !gr.programs.includes(p))) : progs;
    const days = S.durationDays(c.startDate, c.endDate);
    const rk = S.rankOf(gr, c.rank);
    const needsReg = gr && (['U_STAGE', 'R_STAGE'].includes(gr.id) || (rk && (rk.student || rk.id === 'maa')));
    const fac = facById(c.facultyId);
    let h = `<div class="card"><h2>${t('sec.grid')}</h2><div class="grid2">
      <label class="f"><span>${t('f.gridCat')}</span><select data-f="gridId">${gridOptions(c.gridId)}</select></label>`;
    if (gr && gr.ranks.length)
      h += `<label class="f"><span>${t('f.rank')}</span><select data-f="rank"><option value="">${t('choose')}</option>${gr.ranks.map(r => `<option value="${r.id}" ${r.id === c.rank ? 'selected' : ''}>${esc(g(r.label))}${r.pts ? ' (' + r.pts + ')' : ''}</option>`).join('')}</select></label>`;
    else if (gr) h += fText('rankText', t('f.job'), c.rankText);
    h += `</div>${gr ? `<p class="small muted" style="margin-bottom:0">${esc(g(gr.population))} — ${esc(g(gr.subtitle))}</p>` : ''}</div>`;

    h += `<div class="card"><h2>${t('sec.person')}</h2><div class="grid2">
      ${fText('surname', t('f.surname'), c.surname)}${fText('name', t('f.name'), c.name)}
      ${fText('birthDate', t('f.birthDate'), c.birthDate, 'date')}${fText('birthPlace', t('f.birthPlace'), c.birthPlace)}
      <label class="f"><span>${t('f.faculty')}</span><select data-f="facultyId"><option value="">${t('choose')}</option>${facs().map(f => `<option value="${f.id}" ${f.id === c.facultyId ? 'selected' : ''}>${esc(nm(f))}</option>`).join('')}</select></label>
      <label class="f"><span>${t('f.dept')}</span>${fac && fac.depts.length ? `<select data-f="deptId"><option value="">${t('choose')}</option>${fac.depts.map(d => `<option value="${d.id}" ${d.id === c.deptId ? 'selected' : ''}>${esc(nm(d))}</option>`).join('')}<option value="__other" ${c.deptId === '__other' ? 'selected' : ''}>${t('otherDept')}</option></select>` : `<input type="text" data-f="department" value="${esc(c.department || '')}">`}</label>
      ${c.deptId === '__other' ? fText('department', t('f.deptOther'), c.department) : ''}
      ${fText('specialty', t('f.specialty'), c.specialty, 'text', 'list="dl-spec"')}${fText('lab', t('f.lab'), c.lab)}
      ${fText('degree', t('f.degree'), c.degree)}${fText('email', t('f.email'), c.email, 'email')}${fText('phone', t('f.phone'), c.phone, 'tel')}
      </div><datalist id="dl-spec">${[...new Set(state.candidates.map(x => x.specialty).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div style="margin-top:8px">${fCheck('algerian', t('f.algerian'), c.algerian !== false)}</div></div>`;

    // الاستفادة السابقة وتاريخ الغلق
    const pc = P().platformClose || {};
    h += `<div class="card"><h2>${t('sec.prev')}</h2><p class="small muted">${t('prev.hint')}</p><div class="grid2">
      ${fText('lastBenefitYear', t('f.lastYear'), c.lastBenefitYear, 'number', 'min="2000" step="1"')}
      ${fText('cutoffDate', t('f.cutoff'), c.cutoffDate, 'date')}</div>
      ${c.lastBenefitYear && pc[c.lastBenefitYear] && pc[c.lastBenefitYear] !== c.cutoffDate ? `<div class="alert info small">${t('prev.fromSettings', { y: esc(c.lastBenefitYear), d: esc(pc[c.lastBenefitYear]) })} <button class="btn sm" data-act="use-cutoff">${t('apply')}</button></div>` : ''}`;
    if (MODE === 'admin') {
      const hist = S.historyOf(c, state.candidates, acceptedIds());
      if (hist.length) {
        const last = hist[0];
        const n3 = hist.filter(x => +x.fy >= +c.fy - 3).length;
        h += `<div class="alert warn small">${t('prev.history', { list: hist.map(x => x.fy + ' (' + (D.PROGRAMS[x.program] ? g(D.PROGRAMS[x.program].label) : '') + ')').join('، ') })}
          <button class="btn sm" data-act="use-history" data-y="${last.fy}" data-n="${n3}">${t('prev.useHistory', { y: last.fy, n: n3 })}</button></div>`;
      }
    }
    h += `</div>`;

    if (needsReg) {
      h += `<div class="card"><h2>${t('sec.phd')}</h2><div class="grid2">
        ${fText('regCount', t('f.regCount'), c.regCount, 'number', 'min="0" step="1"')}
        ${fText('regYear', t('f.regYear'), c.regYear, 'number', 'min="1990" step="1"')}</div>
        ${rk && rk.student ? fCheck('stars', t('f.stars'), c.stars) : ''}
        ${gr.id === 'U_STAGE' ? fCheck('reRegistered', t('f.reReg'), c.reRegistered) : ''}</div>`;
    }
    h += `<div class="card"><h2>${t('sec.mobility')}</h2><div class="grid2">
      <label class="f"><span>${t('f.program')}</span><select data-f="program"><option value="">${t('choose')}</option>
      ${ordered.map(p => `<option value="${p}" ${p === c.program ? 'selected' : ''}>${esc(g(D.PROGRAMS[p].label))} (${D.PROGRAMS[p].min}–${D.PROGRAMS[p].max} ${t('days')})</option>`).join('')}</select></label>
      ${fText('country', t('f.country'), c.country)}${fText('host', t('f.host'), c.host)}${fText('city', t('f.city'), c.city)}
      ${fText('startDate', t('f.start'), c.startDate, 'date')}${fText('endDate', t('f.end'), c.endDate, 'date')}
      ${c.program === 'conf' ? fText('confTitle', t('f.confTitle'), c.confTitle) + fText('confIndex', t('f.confIndex'), c.confIndex) : ''}
      </div><p class="small muted" id="daysInfo">${days != null ? t('duration', { d: days }) : ''}</p>
      ${fCheck('fyBenefited', t('f.fyBenefited'), c.fyBenefited)}
      ${c.fyBenefited && c.program !== 'conf' ? fCheck('fyException', t('f.fyException'), c.fyException) : ''}
      ${gr && (gr.id === 'U_ATS' || gr.scope === 'research') ? fCheck('inConvention', t('f.inConvention'), c.inConvention !== false) : ''}
      ${MODE === 'admin' ? fCheck('isCommitteeMember', t('f.committee'), c.isCommitteeMember) : ''}</div>`;
    return h;
  }

  /* ----- الوثائق المرفقة (evidence) ----- */
  function flagsMap(c) {
    const an = S.analyzeDocs(c, state.candidates);
    const m = {};
    for (const it of an.items) {
      const k = it.kind === 'doc' ? 'doc:' + it.key : it.kind === 'entry' ? 'entry:' + it.crit.id + ':' + it.idx : 'crit:' + it.crit.id + ':' + it.idx;
      m[k] = it.flags;
    }
    return m;
  }
  function flagHTML(f) {
    const cls = { before: 'b-bad', reused: 'b-bad', oldReg: 'b-bad', dup: 'b-warn', future: 'b-warn', shared: 'b-info' }[f.k] || 'b-mut';
    return `<span class="badge ${cls}">⚑ ${t('fl.' + f.k, f.p || {})}</span>`;
  }
  function evHTML(path, ev, flags) {
    if (!ev || !ev.fileId) return `<button class="btn sm" data-act="attach" data-evp="${path}">📎 ${t('ev.attach')}</button>`;
    const sug = (ev.suggested || []).filter(d => d !== ev.date).slice(0, 5);
    return `<div class="ev">
      <button class="btn sm" data-act="ev-open" data-id="${ev.fileId}" title="${esc(ev.name)}">📄 ${esc(ev.name.length > 28 ? ev.name.slice(0, 26) + '…' : ev.name)}</button>
      <label class="small">${t('ev.date')} <input type="date" data-evdate="${path}" value="${esc(ev.date || '')}"></label>
      <button class="btn sm danger" data-act="ev-del" data-evp="${path}" title="${t('delete')}">✕</button>
      ${sug.length ? `<span class="small muted">${t('ev.found')}</span> ${sug.map(d => `<button class="chip-btn" data-act="ev-sug" data-evp="${path}" data-d="${d}">${d}</button>`).join('')}` : ''}
      ${ev.scanned ? `<span class="badge b-mut">${t('ev.scanned')}</span>` : ''}${ev.image ? `<span class="badge b-mut">${t('ev.image')}</span>` : ''}
      ${ev.created ? `<span class="small muted">${t('ev.created', { d: ev.created })}</span>` : ''}
      ${(flags || []).map(flagHTML).join('')}</div>`;
  }
  function getEv(path) {
    const [k, a, b] = path.split(':');
    if (k === 'doc') return (cur.docFiles || {})[a];
    const inp = (cur.scores || {})[a] || {};
    if (k === 'entry') return inp.entries && inp.entries[+b] ? inp.entries[+b].ev : null;
    if (k === 'crit') return inp.ev && inp.ev[+b];
    return null;
  }
  function setEv(path, ev) {
    const [k, a, b] = path.split(':');
    if (k === 'doc') { cur.docFiles = cur.docFiles || {}; if (ev) { cur.docFiles[a] = ev; cur.docs = cur.docs || {}; cur.docs[a] = true; } else delete cur.docFiles[a]; return; }
    cur.scores = cur.scores || {};
    const inp = cur.scores[a] = cur.scores[a] || {};
    if (k === 'entry') { const e = inp.entries[+b]; e.ev = ev || undefined; if (ev && ev.date && !e.date) e.date = ev.date; return; }
    if (k === 'crit') {
      inp.ev = inp.ev || [];
      if (b === 'new') { if (ev) inp.ev.push(ev); } else if (ev) inp.ev[+b] = ev; else inp.ev.splice(+b, 1);
    }
  }
  function attach(path) {
    pickFile('application/pdf,image/*', async files => {
      const file = files[0];
      toast(t('ev.analyzing'));
      try {
        const ev = await F.add(file);
        setEv(path, ev); save();
        renderEditor();
        toast(ev.suggested.length ? t('ev.foundN', { n: ev.suggested.length, d: ev.date || '—' }) : t('ev.noDate'));
      } catch (e) { console.error(e); toast(t('ev.fail')); }
    });
  }

  function edDocs(c, gr) {
    if (!gr) return `<div class="card alert warn">${t('chooseGridFirst')}</div>`;
    const req = D.requiredDocs(gr, c.rank, c.program);
    const fm = flagsMap(c);
    let h = `<div class="card docs"><h2>${t('sec.docs')}</h2><p class="small muted">${t('docs.hint')}</p>`;
    for (const k of req) {
      const ev = (c.docFiles || {})[k];
      h += `<div class="doc-row">${fCheck(k, esc(g(D.DOCS[k])), (c.docs && c.docs[k]) || (ev && ev.fileId), 'data-doc')}${evHTML('doc:' + k, ev, fm['doc:' + k])}</div>`;
    }
    h += `<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="docs-all">${t('selectAll')}</button></div></div>`;
    h += `<div class="card"><h2>${t('sec.docNotes')}</h2><textarea data-f="docNotes" placeholder="${t('docNotesPh')}">${esc(c.docNotes || '')}</textarea></div>`;
    return h;
  }

  const SECTION_COLORS = ['#0f766e', '#1d4ed8', '#7c3aed', '#c2410c', '#b45309', '#be185d', '#15803d', '#475569', '#0e7490'];
  function edScore(c, gr) {
    if (!gr) return `<div class="card alert warn">${t('chooseGridFirst')}</div>`;
    if (gr.noScoring) return `<div class="card"><h2>${esc(g(gr.title))}</h2><div class="alert info">${esc(g(gr.subtitle))}</div><ul>${gr.notes.map(n => `<li>${esc(g(n))}</li>`).join('')}</ul></div>`;
    const fm = flagsMap(c);
    let h = `<div class="card"><h2>${esc(code(gr) + ' — ' + g(gr.title))}</h2><p class="small muted" style="margin-top:-6px">${esc(g(gr.population))}</p>`;
    if (c.cutoffDate) h += `<div class="alert info small">${t('cutoffActive', { d: esc(c.cutoffDate) })}</div>`;
    else h += `<div class="alert warn small">${t('cutoffMissing')}</div>`;
    let sec = null, si = -1;
    for (const crit of gr.criteria) {
      if (crit.section !== sec) { sec = crit.section; si++; h += `<div class="sec-title" style="--c:${SECTION_COLORS[si % SECTION_COLORS.length]}">${esc(g(sec))}</div>`; }
      h += critHTML(crit, c, gr, fm, SECTION_COLORS[si % SECTION_COLORS.length]);
    }
    h += `<div class="alert info small"><b>${t('gridNotes')}</b><ul>${gr.notes.map(n => `<li>${esc(g(n))}</li>`).join('')}</ul></div></div>`;
    return h;
  }
  function ruleText(l) {
    let s = l.pts + ' ' + t('pt');
    if (l.maxCount != null) s += ' · ' + t('maxCount', { n: l.maxCount });
    if (l.maxPts != null) s += ' · ' + t('maxPts', { n: l.maxPts });
    return s;
  }
  function critHTML(crit, c, gr, fm, color) {
    fm = fm || {};
    const inp = (c.scores || {})[crit.id] || {};
    const res = S.scoreCriterion(crit, inp, c, gr);
    const max = S.maxOfCriterion(crit, gr);
    const A = `data-c="${crit.id}"`;
    let body = '';
    const entryDateBlock = (e, i) => {
      const before = S.isBeforeCutoff(e, c);
      return `<label class="small">${t('ev.workDate')} <input type="date" ${A} data-e="${i}" data-k="date" value="${esc(e.date || '')}"></label>
        ${evHTML('entry:' + crit.id + ':' + i, e.ev, fm['entry:' + crit.id + ':' + i])}
        ${before ? `<span class="badge ${e.keep ? 'b-warn' : 'b-bad'}">${e.keep ? t('keptAnyway') : t('excludedBefore')}</span><label class="chk small"><input type="checkbox" ${A} data-e="${i}" data-k="keep" ${e.keep ? 'checked' : ''}>${t('countAnyway')}</label>` : ''}
        <label class="chk small"><input type="checkbox" ${A} data-e="${i}" data-k="excl" ${e.excl ? 'checked' : ''}>${t('excludeManual')}</label>`;
    };
    switch (crit.type) {
      case 'rank': {
        const rk = S.rankOf(gr, c.rank);
        body = `<div class="small">${rk ? esc(g(rk.label)) + ' — <b>' + rk.pts + '</b> ' + t('pt') : `<span style="color:var(--bad)">${t('chooseRankFirst')}</span>`}</div>`;
        if (crit.bonus && rk && (!crit.bonus.onlyRanks || crit.bonus.onlyRanks.includes(rk.id)))
          body += `<label class="chk small"><input type="checkbox" ${A} data-k="bonus" ${inp.bonus ? 'checked' : ''}><span>${esc(g(crit.bonus.label))}</span></label>`;
        break;
      }
      case 'prev':
        body = `<div class="row"><span>${t('prevN')}</span><input type="number" min="0" step="1" ${A} data-k="n" value="${esc(inp.n == null ? '' : inp.n)}"></div>`;
        break;
      case 'prevN':
        body = `<div class="row"><span>${t('bigN')}</span><select ${A} data-k="N">${crit.options.map(o => `<option ${+inp.N === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="row"><span>${t('smallN')}</span><input type="number" min="0" step="1" ${A} data-k="n" value="${esc(inp.n == null ? '' : inp.n)}"></div>`;
        break;
      case 'lines':
        for (const l of crit.lines)
          body += `<div class="row"><span>${esc(g(l.label))} <span class="rule">(${ruleText(l)})</span></span>
            <input type="number" min="0" step="1" ${A} data-k="${l.id}" value="${esc(inp[l.id] == null ? '' : inp[l.id])}" placeholder="${t('count')}"></div>`;
        if (crit.maxCount != null) body += `<div class="note">${t('groupMax', { n: crit.maxCount })}</div>`;
        break;
      case 'pubs': {
        (inp.entries || []).forEach((e, i) => {
          const cat = crit.cats.find(x => x.id === e.cat);
          const w = (D.AUTHOR_WEIGHTS.find(a => a.v === +e.pos) || { w: 1 }).w;
          const ex = S.isExcluded(e, c);
          const v = cat && !ex ? (crit.requireAff && e.aff === false ? 0 : cat.pts * w) : 0;
          body += `<div class="entry ${ex ? 'excluded' : ''}"><div class="entry-main">
            <input type="text" ${A} data-e="${i}" data-k="title" value="${esc(e.title || '')}" placeholder="${t('pubTitle')}">
            <select ${A} data-e="${i}" data-k="cat">${crit.cats.map(x => `<option value="${x.id}" ${x.id === e.cat ? 'selected' : ''}>${esc(g(x.label))} (${x.pts})</option>`).join('')}</select>
            <select ${A} data-e="${i}" data-k="pos">${D.AUTHOR_WEIGHTS.map(a => `<option value="${a.v}" ${a.v === +(e.pos || 1) ? 'selected' : ''}>${esc(g(a.label))}</option>`).join('')}</select>
            ${crit.requireAff ? `<label class="chk small"><input type="checkbox" ${A} data-e="${i}" data-k="aff" ${e.aff !== false ? 'checked' : ''}>${t('affiliation')}</label>` : ''}
            <b class="ev-val">${fmt(v)}</b><button class="btn sm danger" data-act="del-entry" ${A} data-e="${i}">✕</button></div>
            <div class="entry-sub">${entryDateBlock(e, i)}</div></div>`;
        });
        body += `<button class="btn sm" data-act="add-entry" ${A} style="margin-top:6px">＋ ${t('addPub')}</button>`;
        const caps = crit.cats.filter(x => x.maxCount || x.maxPts).map(x => g(x.label) + ': ' + (x.maxCount ? t('maxCount', { n: x.maxCount }) : t('maxPts', { n: x.maxPts })));
        if (caps.length) body += `<div class="note">${esc(caps.join(' · '))}</div>`;
        break;
      }
      case 'items': {
        (inp.entries || []).forEach((e, i) => {
          const o = crit.opts.find(x => x.id === e.opt);
          const ex = S.isExcluded(e, c);
          let v = o && !ex ? o.pts : 0;
          if (!ex) (crit.flags || []).forEach(f => { if (e.flags && e.flags[f.id]) v += f.pts; });
          body += `<div class="entry ${ex ? 'excluded' : ''}"><div class="entry-main">
            <input type="text" ${A} data-e="${i}" data-k="title" value="${esc(e.title || '')}" placeholder="${t('itemTitle')}">
            ${crit.opts.length > 1 ? `<select ${A} data-e="${i}" data-k="opt">${crit.opts.map(x => `<option value="${x.id}" ${x.id === e.opt ? 'selected' : ''}>${esc(g(x.label))} (${x.pts})</option>`).join('')}</select>` : `<span class="small">${esc(g(crit.opts[0].label))} (${crit.opts[0].pts})</span>`}
            ${(crit.flags || []).map(f => `<label class="chk small"><input type="checkbox" ${A} data-e="${i}" data-k="flag:${f.id}" ${e.flags && e.flags[f.id] ? 'checked' : ''}>${esc(g(f.label))} (+${f.pts})</label>`).join('')}
            <b class="ev-val">${fmt(v)}</b><button class="btn sm danger" data-act="del-entry" ${A} data-e="${i}">✕</button></div>
            <div class="entry-sub">${entryDateBlock(e, i)}</div></div>`;
        });
        body += `<button class="btn sm" data-act="add-entry" ${A} style="margin-top:6px">＋ ${t('add')}</button>`;
        break;
      }
      case 'scale':
        body = `<div class="row"><span class="rule">${t('scaleOf', { n: crit.max })}</span><input type="number" min="0" max="${crit.max}" step="${crit.step || 0.5}" ${A} data-k="v" value="${esc(inp.v == null ? '' : inp.v)}"></div>`;
        break;
      case 'check':
        body = `<label class="chk"><input type="checkbox" ${A} data-k="v" ${inp.v ? 'checked' : ''}><span>${t('yes')} (${crit.pts} ${t('pt')})</span></label>`;
        break;
    }
    // وثائق الإثبات للمعايير العددية
    if (['lines', 'check', 'scale'].includes(crit.type) && !(crit.lines && crit.lines.every(l => l.pts < 0))) {
      const evs = inp.ev || [];
      body += `<div class="evs">${evs.map((ev, i) => evHTML('crit:' + crit.id + ':' + i, ev, fm['crit:' + crit.id + ':' + i])).join('')}
        <button class="btn sm ghost" data-act="attach" data-evp="crit:${crit.id}:new">📎 ${t('ev.proof')}</button></div>`;
    }
    return `<div class="crit" id="crit-${crit.id}" style="--c:${color || 'var(--brand)'}"><div class="crit-h"><div><div class="lbl">${esc(g(crit.label))}</div>${crit.note ? `<div class="note">${esc(g(crit.note))}</div>` : ''}</div>
      <span class="pts" id="pts-${crit.id}">${fmt(res.pts)}${max != null ? ' / ' + fmt(max) : ''}</span></div>${body}</div>`;
  }

  function edDecision(c) {
    const el = S.checkEligibility(c, P(), state.candidates);
    const pos = positionOf(c);
    let h = `<div class="card"><h2>${t('sec.result')}</h2>`;
    h += el.ok ? `<div class="alert ok">${t('eligibleOk')}</div>` : `<div class="alert bad"><b>${t('notEligible')}</b><ul>${el.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (el.warnings.length) h += `<div class="alert warn"><ul>${el.warnings.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (pos) h += `<p>${t('posInGroup')} <b>${pos.pos ? pos.pos + ' / ' + pos.of : '—'}</b> ${badge(pos.status)}<br><span class="small muted">${esc(groupLabel(pos.group.key).join(' · '))}</span></p>`;
    h += `</div><div class="card"><h2>${t('sec.decision')}</h2><div class="grid2">
      <label class="f"><span>${t('f.decision')}</span><select data-f="decision">${['auto', 'accepted', 'rejected'].map(k => `<option value="${k}" ${c.decision === k ? 'selected' : ''}>${t('dec.' + k)}</option>`).join('')}</select></label>
      ${fText('decisionDate', t('f.decisionDate'), c.decisionDate, 'date')}</div>
      <label class="f" style="margin-top:10px"><span>${t('f.rejectReason')}</span><textarea data-f="rejectReason">${esc(c.rejectReason || '')}</textarea></label>
      ${c.decision === 'rejected' && !(c.rejectReason || '').trim() ? `<div class="alert warn">${t('justifyReject')}</div>` : ''}
      <label class="f" style="margin-top:10px"><span>${t('f.notes')}</span><textarea data-f="notes">${esc(c.notes || '')}</textarea></label></div>`;
    return h;
  }

  function updateSummary() {
    if (!cur) return;
    const sc = S.computeScore(cur), el = S.checkEligibility(cur, P(), state.candidates);
    const gr = sc.grid;
    sc.breakdown.forEach(b => { const s = document.getElementById('pts-' + b.id); if (s) s.textContent = fmt(b.pts) + (b.max != null ? ' / ' + fmt(b.max) : ''); });
    const di = document.getElementById('daysInfo');
    if (di) di.innerHTML = el.days != null ? t('duration', { d: el.days }) : '';
    const box = document.getElementById('summary');
    if (!box) return;
    const dc = el.docs ? el.docs.counts : null;
    let h = `<div class="small muted">${gr ? esc(code(gr) + ' — ' + g(gr.title)) : t('noGridYet')}</div>
      <div class="total">${gr && gr.noScoring ? '—' : fmt(sc.total)}</div><div class="small muted">${MODE === 'candidate' ? t('provisional') : t('f.total')}</div>
      <div style="margin:10px 0">${el.ok ? `<span class="badge b-ok">${t('dash.ok')}</span>` : `<span class="badge b-bad">${t('dash.bad')}</span>`}
      ${MODE === 'admin' && cur.decision !== 'auto' ? ' ' + badge(cur.decision) : ''}</div>`;
    if (el.reasons.length) h += `<div class="alert bad small"><ul>${el.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (el.warnings.length) h += `<div class="alert warn small"><ul>${el.warnings.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (el.docs && el.docs.items.length) {
      h += `<h3>${t('docAnalysis')}</h3><div class="small">${t('nAttached', { n: el.docs.items.length })}`;
      const parts = ['before', 'reused', 'oldReg', 'dup', 'future', 'shared'].filter(k => dc[k]).map(k => `<div>⚑ ${t('fl.' + k + '.short')}: <b>${dc[k]}</b></div>`);
      h += parts.length ? parts.join('') : `<div style="color:var(--ok)">✓ ${t('noDocFlags')}</div>`;
      h += `</div>`;
    }
    const nz = sc.breakdown.filter(b => b.pts);
    if (nz.length) h += `<h3>${t('breakdown')}</h3><div class="bk">${nz.map(b => { const l = g(b.label); return `<div><span>${esc(l.length > 60 ? l.slice(0, 58) + '…' : l)}</span><b>${fmt(b.pts)}</b></div>`; }).join('')}</div>`;
    box.innerHTML = h;
  }

  /* ----- معالجة الإدخال ----- */
  function setScore(el) {
    const cid = el.dataset.c, k = el.dataset.k;
    cur.scores = cur.scores || {};
    const inp = cur.scores[cid] = cur.scores[cid] || {};
    const val = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.e != null) {
      const e = inp.entries[+el.dataset.e];
      if (k.startsWith('flag:')) { e.flags = e.flags || {}; e.flags[k.slice(5)] = val; }
      else if (k === 'pos') e.pos = +val;
      else e[k] = val;
      return k !== 'title';
    }
    inp[k] = val;
    return false;
  }
  function rerenderCrit(cid) {
    const gr = S.gridById(cur.gridId), crit = gr && gr.criteria.find(x => x.id === cid);
    const node = document.getElementById('crit-' + cid);
    if (crit && node) node.outerHTML = critHTML(crit, cur, gr, flagsMap(cur), node.style.getPropertyValue('--c'));
  }
  function onInput(e) {
    const el = e.target;
    const isChange = e.type === 'change';
    if (cur && el.dataset.f) {
      const f = el.dataset.f;
      cur[f] = el.type === 'checkbox' ? el.checked : el.value;
      save();
      if (isChange && ['gridId', 'rank', 'program', 'fyBenefited', 'decision', 'regCount', 'facultyId', 'deptId', 'lastBenefitYear', 'cutoffDate'].includes(f)) {
        if (f === 'gridId') {
          const gr = S.gridById(cur.gridId);
          if (gr && !S.rankOf(gr, cur.rank)) cur.rank = '';
          if (gr && !gr.programs.includes(cur.program)) cur.program = gr.programs[0];
        }
        if (f === 'facultyId') cur.deptId = '';
        if (f === 'regCount') { const gr = S.gridById(cur.gridId); if (gr && gr.criteria.some(x => x.id === 'reg')) { cur.scores = cur.scores || {}; cur.scores.reg = cur.scores.reg || {}; if (cur.scores.reg.y == null || cur.scores.reg.y === '') cur.scores.reg.y = cur.regCount; } }
        if (f === 'lastBenefitYear') { const pc = (P().platformClose || {})[cur.lastBenefitYear]; if (pc && !cur.cutoffDate) cur.cutoffDate = pc; }
        save(); renderEditor(); return;
      }
      if (f === 'surname' || f === 'name') { const tt = main.querySelector('.topbar h1'); if (tt) tt.textContent = fullName(cur); }
      updateSummary(); return;
    }
    if (cur && el.dataset.doc) { cur.docs = cur.docs || {}; cur.docs[el.dataset.doc] = el.checked; save(); updateSummary(); return; }
    if (cur && el.dataset.evdate) {
      if (!isChange) return;
      const ev = getEv(el.dataset.evdate); if (!ev) return;
      const old = ev.date;
      ev.date = el.value;
      const [k, a, b] = el.dataset.evdate.split(':');
      if (k === 'entry') { const en = cur.scores[a].entries[+b]; if (!en.date || en.date === old) en.date = el.value; }
      save(); renderEditor(); return;
    }
    if (cur && el.dataset.c) {
      if (el.dataset.e != null && el.dataset.k === 'title' && isChange) return;
      if (el.dataset.e != null && el.dataset.k !== 'title' && !isChange && (el.tagName === 'SELECT' || el.type === 'date')) return;
      const need = setScore(el);
      save();
      if (need) rerenderCrit(el.dataset.c);
      updateSummary(); return;
    }
    if (el.dataset.set) {
      const k = el.dataset.set;
      if (k === 'committee') P().committee = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      else if (k.startsWith('groupBy:')) { const gb = new Set(P().groupBy || []); el.checked ? gb.add(k.slice(8)) : gb.delete(k.slice(8)); P().groupBy = [...gb]; }
      else if (k.startsWith('pc:')) { P().platformClose = P().platformClose || {}; P().platformClose[k.slice(3)] = el.value; }
      else if (k.startsWith('inst:')) P().structure.institution[k.slice(5)] = el.value;
      else P()[k] = el.value;
      save();
      if (isChange && el.dataset.rerender) { renderSide(); route(); }
      return;
    }
    if (el.dataset.fac) {   // تعديل الهيكل
      const [fi, field, di] = el.dataset.fac.split(':');
      const f = facs()[+fi];
      if (di != null) f.depts[+di][field] = el.value; else f[field] = el.value;
      save(); return;
    }
    if (el.dataset.seat != null && isChange) { P().seats[el.dataset.seat] = el.value; save(); viewRanking(true); return; }
    if (el.dataset.dec && isChange) { candById(el.dataset.dec).decision = el.value; save(); viewRanking(true); return; }
    if (el.dataset.fu) {
      const c = candById(el.dataset.id); c.followup = c.followup || {};
      const k = el.dataset.fu;
      if (k.startsWith('doc:')) { c.followup.docs = c.followup.docs || {}; c.followup.docs[k.slice(4)] = el.checked; }
      else c.followup[k] = el.type === 'checkbox' ? el.checked : el.value;
      save();
      if (isChange && el.type !== 'text') viewFollowup(true);
    }
  }
  main.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('sel-all')) e.target.select(); });
  main.addEventListener('input', onInput);
  main.addEventListener('change', onInput);

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    switch (act) {
      case 'menu': document.getElementById('side').classList.toggle('open'); break;
      case 'tab': edTab = b.dataset.t; renderEditor(); window.scrollTo(0, 0); break;
      case 'add-entry': {
        const gr = S.gridById(cur.gridId), crit = gr.criteria.find(x => x.id === b.dataset.c);
        cur.scores = cur.scores || {};
        const inp = cur.scores[crit.id] = cur.scores[crit.id] || {};
        inp.entries = inp.entries || [];
        inp.entries.push(crit.type === 'pubs' ? { cat: crit.cats[0].id, pos: 1, aff: true, title: '' } : { opt: crit.opts[0].id, flags: {}, title: '' });
        save(); rerenderCrit(crit.id); updateSummary(); break;
      }
      case 'del-entry': cur.scores[b.dataset.c].entries.splice(+b.dataset.e, 1); save(); rerenderCrit(b.dataset.c); updateSummary(); break;
      case 'attach': attach(b.dataset.evp); break;
      case 'ev-open': F.open(b.dataset.id).then(ok => { if (!ok) toast(t('ev.missing')); }); break;
      case 'ev-del': {
        const ev = getEv(b.dataset.evp);
        setEv(b.dataset.evp, null);
        if (ev && ev.fileId && !JSON.stringify(state.candidates).includes(ev.fileId)) F.del(ev.fileId);
        save(); renderEditor(); break;
      }
      case 'ev-sug': {
        const ev = getEv(b.dataset.evp); if (!ev) break;
        const [k, a, i] = b.dataset.evp.split(':');
        if (k === 'entry') { const en = cur.scores[a].entries[+i]; if (!en.date || en.date === ev.date) en.date = b.dataset.d; }
        ev.date = b.dataset.d; save(); renderEditor(); break;
      }
      case 'use-cutoff': cur.cutoffDate = P().platformClose[cur.lastBenefitYear]; save(); renderEditor(); break;
      case 'use-history': {
        cur.lastBenefitYear = b.dataset.y;
        const pc = (P().platformClose || {})[b.dataset.y]; if (pc) cur.cutoffDate = pc;
        cur.scores = cur.scores || {};
        const gr = S.gridById(cur.gridId);
        if (gr && gr.criteria.some(x => x.id === 'prev')) { cur.scores.prev = cur.scores.prev || {}; cur.scores.prev.n = b.dataset.n; }
        save(); renderEditor(); toast(t('applied')); break;
      }
      case 'docs-all': {
        const gr = S.gridById(cur.gridId); cur.docs = cur.docs || {};
        D.requiredDocs(gr, cur.rank, cur.program).forEach(k => { cur.docs[k] = true; });
        save(); renderEditor(); break;
      }
      case 'del-cand': {
        const c = candById(b.dataset.id);
        confirmBox(t('confirmDel', { name: esc(fullName(c)) }), () => {
          state.candidates = state.candidates.filter(x => x.id !== c.id); save(true);
          toast(t('deleted'));
          if (location.hash.startsWith('#edit')) location.hash = '#candidates'; else route();
        }, t('delete'));
        break;
      }
      case 'dup-cand': {
        const c = clone(candById(b.dataset.id));
        c.id = uid(); c.createdAt = Date.now(); c.surname = (c.surname || '') + ' ' + t('copySuffix'); c.followup = {}; c.decision = 'auto';
        state.candidates.push(c); save(); toast(t('duplicated')); route(); break;
      }
      case 'print-sheet': printSheets([candById(b.dataset.id)]); break;
      case 'print-sheets-all': printSheets(rankingGroups().flatMap(gp => gp.rows).map(r => r.cand)); break;
      case 'goto-rank': rankGrid = b.dataset.g; location.hash = '#ranking'; break;
      case 'print-ranking': printRanking(); break;
      case 'export-ranking': exportRanking(); break;
      case 'export-list': exportList(); break;
      case 'xlsx-template': exportTemplate(); break;
      case 'import-xlsx': pickFile('.xlsx,.xls,.csv', fs => importXlsx(fs[0])); break;
      case 'import-packages': pickFile('.json,application/json', importPackages, true); break;
      case 'export-package': exportPackage(cur); break;
      case 'cand-reset': confirmBox(t('confirmReset'), () => { state.candidates = [blankCandidate('')]; save(true); edTab = 'info'; route(); }, t('confirm')); break;
      case 'copy-link': (navigator.clipboard ? navigator.clipboard.writeText(candidateUrl()) : Promise.reject()).then(() => toast(t('copied')), () => toast(candidateUrl())); break;
      case 'backup': backup(false); break;
      case 'backup-files': backup(true); break;
      case 'restore': pickFile('.json', fs => restore(fs[0])); break;
      case 'reset': confirmBox(t('confirmResetAll'), () => { state = defaults(); save(true); renderSide(); location.hash = '#dashboard'; route(); }, t('deleteAll')); break;
      case 'demo': loadDemo(); break;
      case 'print-follow': printFollowup(); break;
      case 'print-blank': printSheets([blankCandidate(b.dataset.g)], true); break;
      case 'print-grid-ref': printGridRef(b.dataset.g); break;
      case 'fac-add': facs().push({ id: 'fac' + uid(), color: SECTION_COLORS[facs().length % SECTION_COLORS.length], ar: '', fr: '', en: '', depts: [] }); save(); viewStructure(); break;
      case 'fac-del': { const f = facs()[+b.dataset.i]; confirmBox(t('confirmDelFac', { name: esc(nm(f)) }), () => { facs().splice(+b.dataset.i, 1); save(); renderSide(); viewStructure(); }, t('delete')); break; }
      case 'dept-add': facs()[+b.dataset.i].depts.push({ id: 'd' + uid(), ar: '', fr: '', en: '' }); save(); viewStructure(); break;
      case 'dept-del': facs()[+b.dataset.i].depts.splice(+b.dataset.d, 1); save(); viewStructure(); break;
      case 'struct-reset': confirmBox(t('confirmStructReset'), () => { P().structure = clone(window.DEFAULT_STRUCTURE); save(); renderSide(); viewStructure(); }, t('confirm')); break;
      case 'pc-add': { const y = prompt(t('askYear'), String(+P().fy - 1)); if (y && /^\d{4}$/.test(y)) { P().platformClose = P().platformClose || {}; P().platformClose[y] = P().platformClose[y] || ''; save(); viewSettings(); } break; }
    }
  });

  function pickFile(accept, cb, multiple) {
    const inp = document.getElementById('fileInput');
    inp.value = ''; inp.accept = accept; inp.multiple = !!multiple;
    inp.onchange = () => { if (inp.files.length) cb([...inp.files]); };
    inp.click();
  }

  /* ================= حزم ملفات المترشحين ================= */
  function evIds(c) {
    const ids = [];
    Object.values(c.docFiles || {}).forEach(ev => ev && ev.fileId && ids.push(ev.fileId));
    Object.values(c.scores || {}).forEach(inp => {
      (inp.entries || []).forEach(e => e.ev && e.ev.fileId && ids.push(e.ev.fileId));
      (inp.ev || []).forEach(ev => ev && ev.fileId && ids.push(ev.fileId));
    });
    return ids;
  }
  // أسماء الملفات بحروف لاتينية (بعض المتصفحات ترفض الأسماء العربية)
  const TR = { 'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'dj', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'dh', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ة': 'a', 'و': 'ou', 'ي': 'i', 'ى': 'a', 'ئ': 'i', 'ؤ': 'ou', 'ء': '' };
  function asciiName(s) {
    const r = String(s || '').split('').map(ch => TR[ch] != null ? TR[ch] : ch).join('')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return r || 'x';
  }
  async function exportPackage(c) {
    if (!c) return;
    if (!c.surname && !c.name) return toast(t('needName'));
    toast(t('packing'));
    const files = await F.exportFiles(evIds(c));
    const pkg = { type: 'tarabbusat-dossier', version: 1, exportedAt: new Date().toISOString(), candidate: c, files };
    const name = 'dossier-' + c.fy + '-' + asciiName(c.surname) + '-' + asciiName(c.name) + '.json';
    download(name, new Blob([JSON.stringify(pkg)], { type: 'application/json' }));
    toast(t('packed', { n: files.length }));
  }
  async function importPackages(list) {
    let n = 0, nf = 0, bad = 0;
    for (const file of list) {
      try {
        const pkg = JSON.parse(await file.text());
        if (!pkg || pkg.type !== 'tarabbusat-dossier' || !pkg.candidate) { bad++; continue; }
        nf += await F.importFiles(pkg.files);
        const c = pkg.candidate;
        c.imported = true; c.importedAt = Date.now(); c.decision = c.decision || 'auto'; c.followup = c.followup || {};
        const i = state.candidates.findIndex(x => x.id === c.id);
        if (i >= 0) state.candidates[i] = Object.assign(state.candidates[i], c, { decision: state.candidates[i].decision, notes: state.candidates[i].notes });
        else state.candidates.push(c);
        n++;
      } catch (e) { console.error(e); bad++; }
    }
    save(true);
    toast(t('importedPk', { n, f: nf }) + (bad ? ' — ' + t('badFiles', { n: bad }) : ''));
    if (MODE === 'admin') { if (location.hash !== '#candidates') location.hash = '#candidates'; else route(); }
  }
  // السحب والإفلات
  document.addEventListener('dragover', e => { if (MODE === 'admin' && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('dragging'); } });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  document.addEventListener('drop', e => {
    document.body.classList.remove('dragging');
    if (MODE !== 'admin' || !e.dataTransfer || !e.dataTransfer.files.length) return;
    const js = [...e.dataTransfer.files].filter(f => /\.json$/i.test(f.name));
    if (js.length) { e.preventDefault(); importPackages(js); }
  });

  /* ================= وضع المترشح ================= */
  function viewMine() {
    if (!state.candidates.length) { state.candidates.push(blankCandidate('')); save(); }
    cur = state.candidates[0];
    if (!sessionStorage.getItem('cand-intro')) {
      try { sessionStorage.setItem('cand-intro', '1'); } catch (e) { /* ignore */ }
      main.innerHTML = topbar(t('nav.mine')) + guideHTML(true);
      return;
    }
    renderEditor();
  }
  function guideHTML(withStart) {
    return `<div class="card"><h2>${t('guide.title')}</h2><p>${t('guide.p', { inst: esc(instName()) })}</p>
      <ol><li>${t('guide.1')}</li><li>${t('guide.2')}</li><li>${t('guide.3')}</li><li>${t('guide.4')}</li><li>${t('guide.5')}</li></ol>
      <div class="alert info small">${t('guide.privacy')}</div>
      ${withStart ? `<a class="btn primary" href="#mine" data-act="tab" data-t="info">${t('guide.start')}</a>` : ''}</div>`;
  }
  function viewGuide() { main.innerHTML = topbar(t('nav.guide')) + guideHTML(false); }

  /* ================= الترتيب ================= */
  function rankingGroups() { return S.rankCandidates(fyCands(), P(), { groupBy: P().groupBy || [], gridId: rankGrid || undefined, all: state.candidates }); }
  function viewRanking(keepScroll) {
    const y = window.scrollY;
    const gb = P().groupBy || [];
    const groups = rankingGroups();
    let h = topbar(t('nav.ranking') + ' — ' + esc(P().fy), `
      <button class="btn primary" data-act="print-ranking">🖶 ${t('btn.printRanking')}</button>
      <button class="btn" data-act="print-sheets-all">🖶 ${t('btn.printSheets')}</button>
      <button class="btn" data-act="export-ranking">${t('btn.exportXlsx')}</button>`);
    h += `<div class="card"><div class="grid2"><label class="f"><span>${t('f.gridCat')}</span><select id="rg">${gridOptions(rankGrid, true)}</select></label>
      <div><span class="small" style="font-weight:700">${t('groupBy')}</span><div class="btns">
      ${[['faculty', t('f.faculty')], ['rank', t('f.rank')], ['department', t('f.dept')], ['specialty', t('f.specialty')], ['program', t('f.program')]].map(([k, l]) => `<label class="chk"><input type="checkbox" data-set="groupBy:${k}" data-rerender="1" ${gb.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}
      </div></div></div><p class="small muted" style="margin-bottom:0">${t('tieRule')}</p></div>`;
    if (!groups.length) h += `<div class="card empty">${t('noFilesFy')}</div>`;
    for (const gp of groups) {
      const lbl = groupLabel(gp.key), gr = S.gridById(gp.key.split('|')[0]);
      const fpart = gp.key.split('|').find(p => p.startsWith('f:'));
      const fc = fpart ? facById(fpart.slice(2)) : null;
      h += `<div class="card group-card" style="--c:${fc ? fc.color : 'var(--brand)'}"><div class="group-h"><div><h3>${esc(lbl[0])}</h3><div class="small muted">${esc(lbl.slice(1).join(' · ') || (gr ? g(gr.population) : ''))} — ${t('groupCount', { n: gp.count, e: gp.eligible })}</div></div>
        <label class="seats">${t('seats')} <input type="number" min="0" step="1" data-seat="${esc(gp.key)}" value="${esc(gp.seats == null ? '' : gp.seats)}"></label></div>
        <div class="tbl-wrap"><table class="t"><thead><tr><th class="num">${t('f.position')}</th><th>${t('f.fullName')}</th><th>${t('f.rank')}</th><th>${t('f.facDept')}</th><th>${t('f.dest')}</th><th class="num">${t('f.total')}</th><th>${t('f.status')}</th><th>${t('f.decision')}</th></tr></thead><tbody>`;
      for (const r of gp.rows) {
        const c = r.cand;
        h += `<tr class="prog-row ${r.status === 'accepted' ? 'row-acc' : (r.status === 'ineligible' || r.status === 'rejected') ? 'row-bad' : ''}" style="--c:${PROG_COLOR[c.program] || 'transparent'}">
          <td class="num"><b>${r.position || '—'}</b></td>
          <td><a href="#edit/${c.id}">${esc(fullName(c))}</a>${c.stars ? ' <span title="★">★</span>' : ''}${r.tie ? ` <span class="badge b-warn">${t('tie')}</span>` : ''}</td>
          <td class="small">${esc(rankLabel(c))}</td><td class="small">${facChip(c)}${esc(deptName(c) || facName(c) || '—')}<div class="muted">${esc(c.specialty || '')}</div></td>
          <td class="small">${progChip(c.program)}<div class="muted">${esc([c.country, c.host].filter(Boolean).join(' — ') || '')}</div></td>
          <td class="num"><b>${gr && gr.noScoring ? '—' : fmt(r.score)}</b></td>
          <td>${badge(r.status)}${r.elig.reasons.length ? `<div class="small" style="color:var(--bad);max-width:260px">${esc(r.elig.reasons[0])}${r.elig.reasons.length > 1 ? ' (+' + (r.elig.reasons.length - 1) + ')' : ''}</div>` : ''}</td>
          <td><select data-dec="${c.id}" style="width:auto">${['auto', 'accepted', 'rejected'].map(k => `<option value="${k}" ${c.decision === k ? 'selected' : ''}>${t('dec.' + k)}</option>`).join('')}</select></td></tr>`;
      }
      h += `</tbody></table></div></div>`;
    }
    main.innerHTML = h;
    document.getElementById('rg').addEventListener('change', e => { rankGrid = e.target.value; viewRanking(); });
    if (keepScroll) window.scrollTo(0, y);
  }

  /* ================= الحصص ================= */
  function viewQuotas() {
    const st = P(), T = +st.quotaTotal || 0, B = +st.quotaBudget || 0, cands = fyCands();
    const isAts = c => ['U_ATS', 'R_ADM', 'R_TECH_ENG', 'R_TECH_DEV'].includes(c.gridId);
    const nSp = cands.filter(c => c.gridId === 'X_SPECIAL').length, nAts = cands.filter(isAts).length;
    const nOther = cands.filter(c => c.gridId && c.gridId !== 'X_SPECIAL' && !isAts(c)).length;
    const row = (lbl, pct, n, sub) => `<tr><td>${lbl}${sub ? `<div class="small muted">${sub}</div>` : ''}</td><td class="num">${pct}%</td><td class="num"><b>${T ? fmt(T * pct / 100) : '—'}</b></td><td class="num">${B ? fmt(B * pct / 100) : '—'}</td><td class="num">${n}</td></tr>`;
    main.innerHTML = topbar(t('q.title')) + `<div class="card"><div class="grid2">
      <label class="f"><span>${t('q.total')}</span><input type="number" min="0" data-set="quotaTotal" data-rerender="1" value="${esc(st.quotaTotal || '')}"></label>
      <label class="f"><span>${t('q.budget')}</span><input type="number" min="0" data-set="quotaBudget" data-rerender="1" value="${esc(st.quotaBudget || '')}"></label></div></div>
      <div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th>${t('q.share')}</th><th class="num">%</th><th class="num">${t('q.seats')}</th><th class="num">${t('q.amount')}</th><th class="num">${t('q.files')}</th></tr></thead><tbody>
      <tr class="p-sec"><td colspan="5"><b>${t('q.90')}</b></td></tr>
      ${row(t('q.r1'), 80, nSp, 'خ-1')}${row(t('q.r2'), 10, nAts, 'ج-4، م-3، م-4، م-5')}
      <tr class="p-sec"><td colspan="5"><b>${t('q.10')}</b></td></tr>
      ${row(t('q.r3'), 10, nOther, 'ج-1، ج-2، ج-3، م-1، م-2، خ-2')}</tbody></table></div><p class="small muted">${t('q.note')}</p></div>`;
  }

  /* ================= المتابعة ================= */
  function followRows() {
    const td = new Date().toISOString().slice(0, 10), delay = +P().followDays || 30;
    return rankingAll().flatMap(gp => gp.rows).filter(r => r.status === 'accepted').map(r => {
      const c = r.cand, fu = c.followup || {}, req = D.RETURN_DOCS[c.program] || D.RETURN_DOCS.stage;
      const done = req.filter(k => fu.docs && fu.docs[k]).length;
      let st;
      if (fu.notDone) st = 'cancel';
      else if (!c.endDate || c.endDate >= td) st = 'future';
      else if (done === req.length) st = 'ok';
      else { const lim = new Date(c.endDate + 'T00:00:00'); lim.setDate(lim.getDate() + delay); st = lim.toISOString().slice(0, 10) < td ? 'late' : 'pending'; }
      return { cand: c, req, done, state: st };
    });
  }
  const FCLS = { cancel: 'b-mut', future: 'b-info', ok: 'b-ok', pending: 'b-warn', late: 'b-bad' };
  function viewFollowup(keepScroll) {
    const y = window.scrollY, rows = followRows();
    let h = topbar(t('nav.followup') + ' — ' + esc(P().fy), `<button class="btn" data-act="print-follow">🖶 ${t('btn.printFollow')}</button>`);
    h += `<div class="card small muted">${t('fu.intro')}<div style="margin-top:6px">${t('fu.delay')} <input type="number" min="1" style="width:80px" data-set="followDays" data-rerender="1" value="${esc(P().followDays || 30)}"> ${t('days')}</div></div>`;
    if (!rows.length) h += `<div class="card empty">${t('fu.none')}</div>`;
    for (const f of rows) {
      const c = f.cand, fu = c.followup || {}, gr = S.gridById(c.gridId);
      const outFy = c.startDate && c.startDate.slice(0, 4) !== String(c.fy);
      h += `<div class="card"><div class="group-h"><div><h3>${facChip(c)}<a href="#edit/${c.id}">${esc(fullName(c))}</a> <span class="badge ${FCLS[f.state]}">${t('fs.' + f.state)}</span></h3>
        <div class="small muted">${esc(gr ? code(gr) : '')} · ${progChip(c.program)} · ${esc([c.country, c.host].filter(Boolean).join(' — '))} · ${esc(c.startDate || '?')} → ${esc(c.endDate || '?')}</div></div><span class="small">${f.done} / ${f.req.length}</span></div>
        ${outFy ? `<div class="alert warn small">${t('fu.outFy', { fy: esc(c.fy) })}</div>` : ''}
        <div class="grid2"><div>${f.req.map(k => `<label class="chk small"><input type="checkbox" data-fu="doc:${k}" data-id="${c.id}" ${fu.docs && fu.docs[k] ? 'checked' : ''}>${esc(g(D.RETURN_DOC_LABELS[k]))}</label>`).join('')}</div>
        <div><div class="grid2"><label class="f"><span>${t('fu.return')}</span><input type="date" data-fu="returnDate" data-id="${c.id}" value="${esc(fu.returnDate || '')}"></label>
          <label class="f"><span>${t('fu.lecture')}</span><input type="date" data-fu="lectureDate" data-id="${c.id}" value="${esc(fu.lectureDate || '')}"></label></div>
          <label class="chk small"><input type="checkbox" data-fu="notDone" data-id="${c.id}" ${fu.notDone ? 'checked' : ''}>${t('fu.notDone')}</label>
          <label class="f"><span>${t('f.notes')}</span><input type="text" data-fu="note" data-id="${c.id}" value="${esc(fu.note || '')}"></label></div></div></div>`;
    }
    main.innerHTML = h;
    if (keepScroll) window.scrollTo(0, y);
  }

  /* ================= الشبكات ================= */
  function critRuleDesc(crit, gr) {
    switch (crit.type) {
      case 'rank': return (gr.ranks || []).map(r => g(r.label) + ': ' + r.pts).join('؛ ') + (crit.bonus ? '؛ ' + g(crit.bonus.label) : '');
      case 'prev': return crit.base + ' - n';
      case 'prevN': return 'N - n (N = ' + crit.options.join(' / ') + ')';
      case 'lines': return crit.lines.map(l => g(l.label) + ': ' + ruleText(l)).join('؛ ') + (crit.maxCount ? ' — ' + t('groupMax', { n: crit.maxCount }) : '');
      case 'pubs': return crit.cats.map(c => g(c.label) + ': ' + c.pts + (c.maxCount ? ' (' + t('maxCount', { n: c.maxCount }) + ')' : '')).join('؛ ') + ' — ' + t('authorRule') + (crit.maxPts ? ' — ' + t('maxPts', { n: crit.maxPts }) : '');
      case 'items': return crit.opts.map(o => g(o.label) + ': ' + o.pts).join('؛ ') + ((crit.flags || []).length ? ' — ' + crit.flags.map(f => g(f.label) + ' +' + f.pts).join('؛ ') : '');
      case 'scale': return t('scaleOf', { n: crit.max });
      case 'check': return crit.pts + ' ' + t('pt');
    }
    return '';
  }
  function viewGrids(id) {
    const gr = S.gridById(id) || D.GRIDS[0];
    main.innerHTML = topbar(t('nav.grids'), `<button class="btn" data-act="print-blank" data-g="${gr.id}">🖶 ${t('btn.printBlank')}</button><button class="btn" data-act="print-grid-ref" data-g="${gr.id}">🖶 ${t('btn.printGrid')}</button>`)
      + `<div class="card"><label class="f"><span>${t('f.grid')}</span><select id="gsel">${gridOptions(gr.id)}</select></label></div>` + gridRefHTML(gr);
    document.getElementById('gsel').addEventListener('change', e => { location.hash = '#grids/' + e.target.value; });
  }
  function gridRefHTML(gr, printMode) {
    let h = `<div class="${printMode ? '' : 'card'}"><h2>${esc(code(gr) + ' — ' + g(gr.title))}</h2><p class="small muted">${esc(g(gr.population))} — ${esc(g(gr.subtitle))}</p>
      <p class="small">${t('programsOf')} ${gr.programs.map(p => esc(g(D.PROGRAMS[p].label) + ' (' + D.PROGRAMS[p].min + '–' + D.PROGRAMS[p].max + ' ' + t('days') + ')')).join('، ')}</p>`;
    if (gr.criteria.length) {
      h += `<div class="tbl-wrap"><table class="${printMode ? 'p' : 't ref-tbl'}"><thead><tr><th>${t('criterion')}</th><th>${t('scoringRule')}</th><th class="num">${t('max')}</th></tr></thead><tbody>`;
      let sec = null;
      for (const c of gr.criteria) {
        if (c.section !== sec) { sec = c.section; h += `<tr class="p-sec"><td colspan="3"><b>${esc(g(sec))}</b></td></tr>`; }
        const m = S.maxOfCriterion(c, gr);
        h += `<tr><td>${esc(g(c.label))}${c.note ? `<div class="small muted">${esc(g(c.note))}</div>` : ''}</td><td class="small">${esc(critRuleDesc(c, gr))}</td><td class="num">${m == null ? t('noCap') : fmt(m)}</td></tr>`;
      }
      h += `</tbody></table></div>`;
    }
    h += `<h3>${t('reqDocs')}</h3><ul class="small">${[...new Set((gr.ranks.length ? gr.ranks : [{ id: '' }]).flatMap(r => gr.programs.flatMap(p => D.requiredDocs(gr, r.id, p))))].map(k => `<li>${esc(g(D.DOCS[k]))}</li>`).join('')}</ul>
      <h3>${t('notes')}</h3><ul class="small">${gr.notes.map(n => `<li>${esc(g(n))}</li>`).join('')}</ul></div>`;
    return h;
  }

  /* ================= ملخص القرار (بالعربية) ================= */
  function viewDecree() {
    let h = topbar(t('nav.decree'));
    if (I.lang !== 'ar') h += `<div class="alert info small">${t('decree.arOnly')}</div>`;
    h += `<div class="alert info small" dir="rtl">ملخص عملي لتسهيل الرجوع إلى الأحكام. النص الرسمي هو المرجع في جميع الحالات.</div>`;
    for (const [ch, list] of window.DECREE_SUMMARY) h += `<div class="card" dir="rtl" lang="ar"><h2>${esc(ch)}</h2>${list.map(([tt, x]) => `<details class="art" open><summary>${esc(tt)}</summary><p style="margin:6px 0 0">${esc(x)}</p></details>`).join('')}</div>`;
    main.innerHTML = h;
  }

  /* ================= الهيكل: الكليات والأقسام ================= */
  function viewStructure() {
    const st = P().structure;
    let h = topbar(t('nav.structure'), `<button class="btn" data-act="fac-add">＋ ${t('st.addFac')}</button><button class="btn danger" data-act="struct-reset">${t('st.reset')}</button>`);
    h += `<div class="card"><h2>${t('st.institution')}</h2><div class="grid3">
      ${['ar', 'fr', 'en'].map(l => `<label class="f"><span>${l.toUpperCase()}</span><input type="text" data-set="inst:${l}" data-rerender="1" value="${esc(st.institution[l] || '')}" ${l === 'ar' ? 'dir="rtl"' : 'dir="ltr"'}></label>`).join('')}</div>
      <label class="f" style="margin-top:10px"><span>${t('st.myFaculty')}</span><select data-set="myFaculty"><option value="">${t('st.wholeUniv')}</option>${st.faculties.map(f => `<option value="${f.id}" ${f.id === P().myFaculty ? 'selected' : ''}>${esc(nm(f))}</option>`).join('')}</select></label>
      <p class="small muted">${t('st.hint')}</p></div>`;
    st.faculties.forEach((f, i) => {
      h += `<div class="card fac-card" style="--c:${f.color}"><div class="group-h"><h3><span class="dot" style="background:${f.color}"></span>${esc(nm(f) || t('st.newFac'))}</h3>
        <div class="btns"><input type="color" data-fac="${i}:color" value="${esc(f.color)}" title="${t('st.color')}"><button class="btn sm danger" data-act="fac-del" data-i="${i}">${t('delete')}</button></div></div>
        <div class="grid3">${['ar', 'fr', 'en'].map(l => `<label class="f"><span>${t('st.facName')} (${l.toUpperCase()})</span><input type="text" data-fac="${i}:${l}" value="${esc(f[l] || '')}" ${l === 'ar' ? 'dir="rtl"' : 'dir="ltr"'}></label>`).join('')}</div>
        <h3 class="small">${t('st.depts')} (${f.depts.length})</h3>
        ${f.depts.map((d, j) => `<div class="dept-row">${['ar', 'fr', 'en'].map(l => `<input type="text" data-fac="${i}:${l}:${j}" value="${esc(d[l] || '')}" placeholder="${l.toUpperCase()}" ${l === 'ar' ? 'dir="rtl"' : 'dir="ltr"'}>`).join('')}<button class="btn sm danger" data-act="dept-del" data-i="${i}" data-d="${j}">✕</button></div>`).join('')}
        <button class="btn sm" data-act="dept-add" data-i="${i}">＋ ${t('st.addDept')}</button></div>`;
    });
    main.innerHTML = h;
  }

  /* ================= الإعدادات ================= */
  function viewSettings() {
    const st = P();
    const sText = (k, l, tp) => `<label class="f"><span>${l}</span><input type="${tp || 'text'}" data-set="${k}" value="${esc(st[k] || '')}"></label>`;
    const pc = st.platformClose || {};
    let h = topbar(t('nav.settings'));
    h += `<div class="card"><h2>${t('set.session')}</h2><div class="grid2">
      ${sText('vdName', t('set.vdName'))}${sText('vdTitle', t('set.vdTitle'))}${sText('councilName', t('set.council'))}${sText('academicYear', t('set.academicYear'))}</div>
      <p class="small muted">${t('set.instHint')} <a href="#structure">${t('nav.structure')}</a></p></div>
      <div class="card"><h2>${t('set.platformClose')}</h2><p class="small muted">${t('set.pcHint')}</p>
      <div class="grid4">${Object.keys(pc).sort().map(y => `<label class="f"><span>${y}</span><input type="date" data-set="pc:${y}" value="${esc(pc[y] || '')}"></label>`).join('')}</div>
      <button class="btn sm" data-act="pc-add" style="margin-top:8px">＋ ${t('set.addYear')}</button></div>
      <div class="card"><h2>${t('set.committee')}</h2><p class="small muted">${t('set.committeeHint')}</p><textarea data-set="committee" rows="5">${esc((st.committee || []).join('\n'))}</textarea></div>
      <div class="card"><h2>${t('set.ranking')}</h2><label class="f"><span>${t('set.stars')}</span><select data-set="starsPriority">
        <option value="tie" ${st.starsPriority !== 'absolute' ? 'selected' : ''}>${t('set.starsTie')}</option><option value="absolute" ${st.starsPriority === 'absolute' ? 'selected' : ''}>${t('set.starsAbs')}</option></select></label></div>
      <div class="card"><h2>${t('set.data')}</h2><p class="small muted">${t('set.dataHint')}</p>
      <div class="btns"><button class="btn primary" data-act="backup">${t('set.backup')}</button><button class="btn" data-act="backup-files">${t('set.backupFiles')}</button>
      <button class="btn" data-act="restore">${t('set.restore')}</button><button class="btn" data-act="demo">${t('btn.demo')}</button><button class="btn danger" data-act="reset">${t('deleteAll')}</button></div>
      <p class="small muted">${t('set.count', { n: state.candidates.length })}</p></div>`;
    main.innerHTML = h;
  }
  async function backup(withFiles) {
    const data = clone(state);
    if (withFiles) { toast(t('packing')); data.files = await F.exportFiles(state.candidates.flatMap(evIds)); }
    download('tarabbusat-backup-' + new Date().toISOString().slice(0, 10) + (withFiles ? '-full' : '') + '.json', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  }
  function restore(file) {
    file.text().then(txt => {
      const s = JSON.parse(txt);
      if (s && s.type === 'tarabbusat-dossier') return importPackages([file]);
      if (!s || !Array.isArray(s.candidates)) throw new Error('bad');
      confirmBox(t('confirmRestore', { n: s.candidates.length }), async () => {
        if (s.files) await F.importFiles(s.files);
        const st = Object.assign(defaults().settings, s.settings || {});
        if (!st.structure) st.structure = clone(window.DEFAULT_STRUCTURE);
        state = { version: 2, settings: st, candidates: s.candidates };
        save(true); renderSide(); toast(t('restored')); route();
      }, t('set.restore'));
    }).catch(() => toast(t('badFile')));
  }

  /* ================= Excel ================= */
  function wbRtl(wb) { wb.Workbook = wb.Workbook || {}; wb.Workbook.Views = [{ RTL: I.dir() === 'rtl' }]; return wb; }
  function sheetName(s, used) {
    let n = s.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 28).trim() || 'Sheet';
    let k = n, i = 2; while (used.has(k)) k = n.slice(0, 25) + ' ' + i++;
    used.add(k); return k;
  }
  function rowObj(r) {
    const c = r.cand, gr = S.gridById(c.gridId), o = {};
    o[t('f.position')] = r.position || ''; o[t('f.surname')] = c.surname || ''; o[t('f.name')] = c.name || ''; o[t('f.grid')] = gr ? gr.code : '';
    o[t('f.rank')] = rankLabel(c); o[t('f.faculty')] = facName(c); o[t('f.dept')] = deptName(c); o[t('f.specialty')] = c.specialty || '';
    o[t('f.program')] = D.PROGRAMS[c.program] ? g(D.PROGRAMS[c.program].label) : ''; o[t('f.country')] = c.country || ''; o[t('f.host')] = c.host || '';
    o[t('f.start')] = c.startDate || ''; o[t('f.end')] = c.endDate || ''; o[t('f.total')] = gr && gr.noScoring ? '' : r.score;
    o[t('f.status')] = t('st.' + r.status); o[t('f.reasons')] = r.elig.reasons.concat(c.rejectReason ? [c.rejectReason] : []).join(' ؛ ');
    return o;
  }
  function exportRanking() {
    const groups = rankingGroups();
    if (!groups.length) return toast(t('noData'));
    const wb = wbRtl(XLSX.utils.book_new()), used = new Set();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups.flatMap(gp => gp.rows.map(rowObj))), sheetName(t('all'), used));
    for (const gp of groups) {
      const lbl = groupLabel(gp.key);
      const ws = XLSX.utils.aoa_to_sheet([[lbl.join(' — ')], []]);
      XLSX.utils.sheet_add_json(ws, gp.rows.map(rowObj), { origin: 'A3' });
      const gr = S.gridById(gp.key.split('|')[0]);
      if (gr && gr.criteria.length) {
        const det = gp.rows.map(r => { const o = {}; o[t('f.fullName')] = fullName(r.cand); r.breakdown.forEach(b => { o[g(b.label).slice(0, 60)] = b.pts; }); o[t('f.total')] = r.score; return o; });
        XLSX.utils.sheet_add_aoa(ws, [[], [t('breakdown')]], { origin: -1 });
        XLSX.utils.sheet_add_json(ws, det, { origin: -1 });
      }
      ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 26 }, { wch: 26 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, sheetName(lbl.slice(1).join(' ') || lbl[0], used));
    }
    XLSX.writeFile(wb, 'ranking-' + P().fy + '.xlsx');
  }
  function exportList() {
    const rows = rankingAll().flatMap(gp => gp.rows);
    if (!rows.length) return toast(t('noData'));
    const wb = wbRtl(XLSX.utils.book_new());
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(r => { const o = rowObj(r); o[t('f.email')] = r.cand.email || ''; o[t('f.phone')] = r.cand.phone || ''; o[t('f.lab')] = r.cand.lab || ''; o[t('f.decision')] = t('dec.' + (r.cand.decision || 'auto')); return o; })), 'Sheet1');
    XLSX.writeFile(wb, 'candidates-' + P().fy + '.xlsx');
  }
  const IMPORT_COLS = ['surname', 'name', 'gridCode', 'rank', 'faculty', 'dept', 'specialty', 'program', 'country', 'host', 'start', 'end', 'email', 'phone'];
  const colName = (k, l) => I.tIn(l, 'f.' + k);
  function exportTemplate() {
    const wb = wbRtl(XLSX.utils.book_new());
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLS.map(k => colName(k, I.lang)), ['بن علي', 'محمد', 'ج-1', 'أستاذ محاضر قسم "أ"', facs()[0] ? nm(facs()[0]) : '', '', 'علاقات دولية', 'conf', 'فرنسا', '', '2026-05-10', '2026-05-14', '', '']]);
    ws['!cols'] = IMPORT_COLS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const ref = [[t('f.gridCode'), t('f.grid'), t('f.rank')]].concat(D.GRIDS.map(gr => [gr.code, g(gr.title), gr.ranks.map(r => g(r.label)).join(' | ')]));
    ref.push([], [t('f.program'), 'code']); Object.keys(D.PROGRAMS).forEach(k => ref.push([g(D.PROGRAMS[k].label), k]));
    ref.push([], [t('f.faculty'), t('f.dept')]); facs().forEach(f => f.depts.forEach(d => ref.push([nm(f), nm(d)])));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ref), 'Ref');
    XLSX.writeFile(wb, 'import-template.xlsx');
  }
  function importXlsx(file) {
    file.arrayBuffer().then(buf => {
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
      const norm = s => String(s || '').replace(/[\s"«»]/g, '').toLowerCase();
      const get = (row, k) => { for (const l of ['ar', 'fr', 'en']) { const v = row[colName(k, l)]; if (v !== undefined && v !== '') return String(v).trim(); } return ''; };
      const toDate = v => { v = String(v || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
      const byName = (list, v) => list.find(x => ['ar', 'fr', 'en'].some(l => x[l] && norm(x[l]) === norm(v)));
      let n = 0;
      for (const row of rows) {
        const sn = get(row, 'surname'), na = get(row, 'name');
        if (!sn && !na) continue;
        const code = get(row, 'gridCode');
        const gr = D.GRIDS.find(x => x.code === code || x.id === code || x.code.replace('ج', 'U').replace('م', 'R').replace('خ', 'S') === code.toUpperCase());
        const c = blankCandidate(gr ? gr.id : '');
        c.surname = sn; c.name = na;
        const rk = get(row, 'rank');
        if (gr && rk) { const r = gr.ranks.find(x => [x.label, g(x.label)].some(l => norm(l) === norm(rk) || norm(l).includes(norm(rk)))); if (r) c.rank = r.id; else c.rankText = rk; }
        const fv = get(row, 'faculty'), f = fv ? byName(facs(), fv) : null;
        if (f) c.facultyId = f.id;
        const dv = get(row, 'dept');
        if (dv) { const d = f ? byName(f.depts, dv) : null; if (d) c.deptId = d.id; else { c.deptId = '__other'; c.department = dv; } }
        c.specialty = get(row, 'specialty');
        const pk = get(row, 'program');
        if (D.PROGRAMS[pk]) c.program = pk; else { const k = Object.keys(D.PROGRAMS).find(x => [D.PROGRAMS[x].label, g(D.PROGRAMS[x].label)].includes(pk)); if (k) c.program = k; }
        c.country = get(row, 'country'); c.host = get(row, 'host'); c.startDate = toDate(get(row, 'start')); c.endDate = toDate(get(row, 'end'));
        c.email = get(row, 'email'); c.phone = get(row, 'phone');
        state.candidates.push(c); n++;
      }
      save(true); toast(t('importedN', { n })); location.hash = '#candidates'; route();
    }).catch(e => { console.error(e); toast(t('badFile')); });
  }

  /* ================= الطباعة (بالعربية دائما: وثائق رسمية) ================= */
  function printHead(lines, c) {
    const st = P(), f = c ? facById(c.facultyId) : facById(st.myFaculty);
    return `<div class="p-head"><div class="rep">الجمهورية الجزائرية الديمقراطية الشعبية</div><div class="min">وزارة التعليم العالي والبحث العلمي</div>
      <div>${esc(st.structure.institution.ar || '')}</div>${f ? `<div>${esc(f.ar)}</div>` : ''}${st.vdTitle ? `<div class="small">${esc(st.vdTitle)}</div>` : ''}</div>${lines.map(l => `<div class="p-title">${l}</div>`).join('')}`;
  }
  function doPrint(html) { document.getElementById('print').innerHTML = `<div dir="rtl" lang="ar">${html}</div>`; setTimeout(() => window.print(), 60); }
  function sheetHTML(c, blank) {
    const gr = S.gridById(c.gridId);
    if (!gr) return `<div class="p-title">${esc(fullName(c))}</div>`;
    const sc = S.computeScore(c), el = S.checkEligibility(c, P(), state.candidates), pos = blank ? null : positionOf(c);
    const v = x => blank ? '' : esc(x || '');
    const fac = facById(c.facultyId), dep = deptOf(c);
    let h = printHead(['سلم تقييم ملحق بالقرار رقم 345 المؤرخ في 09 مارس 2026', 'الذي يحدد معايير الانتقاء للقبول في برنامج تحسين المستوى في الخارج', `(${esc(gr.title)})`, `<span class="small">${esc(gr.subtitle)}</span>`], blank ? null : c);
    h += `<table class="p"><tr><td>اللقب والاسم: <b>${blank ? '' : esc(fullName(c))}</b></td><td>الرتبة / الصنف: ${blank ? '' : esc((S.rankOf(gr, c.rank) || {}).label || c.rankText || '')}</td></tr>
      <tr><td>تاريخ ومكان الازدياد: ${v(c.birthDate)} ${v(c.birthPlace)}</td><td>الكلية / القسم: ${blank ? '' : esc([fac ? fac.ar : '', dep ? dep.ar : (c.department || '')].filter(Boolean).join(' — '))}</td></tr>
      <tr><td>التخصص: ${v(c.specialty)}</td><td>المخبر / مشروع البحث: ${v(c.lab)}</td></tr>
      <tr><td>صنف الحركية: ${blank ? '' : esc(D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '')}</td><td>الوجهة والفترة: ${blank ? '' : esc([c.country, c.host].filter(Boolean).join(' — ') + (c.startDate ? ' (' + c.startDate + ' ← ' + (c.endDate || '') + ')' : ''))}</td></tr>
      <tr><td colspan="2">آخر استفادة: ${v(c.lastBenefitYear)} — تاريخ غلق منصة الإيداع لآخر استفادة (بداية احتساب الأعمال): ${v(c.cutoffDate)}</td></tr></table>`;
    if (gr.criteria.length) {
      h += `<table class="p"><thead><tr><th>المعيار</th><th>التفاصيل</th><th class="num">الحد الأقصى</th><th class="num">النقطة</th></tr></thead><tbody>`;
      let sec = null;
      sc.breakdown.forEach((b, i) => {
        if (b.section !== sec) { sec = b.section; h += `<tr class="p-sec"><td colspan="4">${esc(sec)}</td></tr>`; }
        h += `<tr><td>${esc(b.label)}</td><td class="small">${blank ? esc(critRuleDesc(gr.criteria[i], gr)) : esc(b.detail.join(' ؛ '))}</td><td class="num">${b.max == null ? '—' : fmt(b.max)}</td><td class="num"><b>${blank ? '' : fmt(b.pts)}</b></td></tr>`;
      });
      h += `<tr><td colspan="3"><b>مجموع النقاط</b></td><td class="num"><b>${blank ? '' : fmt(sc.total)}</b></td></tr></tbody></table>`;
    }
    const stTxt = { accepted: 'مقبول', rejected: 'مرفوض', ineligible: 'مرفوض', reserve: 'قائمة احتياط' };
    h += `<table class="p"><tr><td>ترتيب المترشح: <b>${pos && pos.pos ? pos.pos + ' / ' + pos.of : '...... / ......'}</b> (عدد المترشحين)</td>
      <td>رأي ${esc(gr.signer)}: <b>${blank ? 'مقبول / مرفوض' : (pos && stTxt[pos.status]) || '......'}</b></td></tr>
      <tr><td colspan="2">أسباب الرفض (يجب أن يكون الرفض مبررا): ${blank ? '' : esc(el.reasons.concat(c.decision === 'rejected' && c.rejectReason ? [c.rejectReason] : []).join(' ؛ '))}</td></tr>
      ${!blank && el.warnings.length ? `<tr><td colspan="2" class="small">ملاحظات: ${esc(el.warnings.join(' ؛ '))}</td></tr>` : ''}</table>`;
    h += `<div class="small"><b>ملاحظات هامة:</b><ul>${gr.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    h += `<div class="p-sign"><div>حرر بتاريخ: ${blank ? '..................' : esc(c.decisionDate || new Date().toISOString().slice(0, 10))}</div><div>${esc(gr.signer)}<br><br>..................</div></div>`;
    return h;
  }
  function printSheets(list, blank) {
    list = list.filter(Boolean);
    if (!list.length) return toast(t('noData'));
    I.withLang('ar', () => doPrint(list.map(c => sheetHTML(c, blank)).join('<div class="page-break"></div>')));
  }
  function printRanking() {
    const groups = rankingGroups();
    if (!groups.length) return toast(t('noData'));
    I.withLang('ar', () => {
      const st = P();
      let h = printHead(['محضر ترتيب المترشحين لبرنامج الحركية قصيرة المدى في الخارج', `السنة المالية ${esc(st.fy)} — السنة الجامعية ${esc(st.academicYear || '')}`, '<span class="small">طبقا للقرار رقم 345 المؤرخ في 09 مارس 2026</span>']);
      groups.forEach(gp => {
        const lbl = groupLabel(gp.key), gr = S.gridById(gp.key.split('|')[0]);
        h += `<h3 style="margin:14px 0 4px">${esc(lbl[0])}</h3><div class="small">${esc(lbl.slice(1).join(' · '))} — عدد المترشحين: ${gp.count}، المؤهلون: ${gp.eligible}${gp.seats != null ? '، المناصب: ' + gp.seats : ''}</div>
          <table class="p"><thead><tr><th class="num">الترتيب</th><th>اللقب والاسم</th><th>الرتبة</th><th>القسم / التخصص</th><th>الوجهة</th><th class="num">المجموع</th><th>القرار</th><th>الملاحظات</th></tr></thead><tbody>`;
        for (const r of gp.rows) {
          const c = r.cand;
          h += `<tr><td class="num">${r.position || '—'}</td><td>${esc(fullName(c))}</td><td>${esc(rankLabel(c))}</td><td>${esc(deptName(c))} ${c.specialty ? '/ ' + esc(c.specialty) : ''}</td>
            <td>${esc([c.country, c.host].filter(Boolean).join(' — '))}</td><td class="num">${gr && gr.noScoring ? '—' : fmt(r.score)}</td><td>${t('st.' + r.status)}</td>
            <td class="small">${esc(r.elig.reasons.concat(c.rejectReason ? [c.rejectReason] : []).join(' ؛ '))}${r.tie ? ' (تساوٍ في المجموع)' : ''}</td></tr>`;
        }
        h += `</tbody></table>`;
      });
      h += `<div class="p-sign"><div>حرر بتاريخ: ${new Date().toISOString().slice(0, 10)}</div><div>${esc(st.councilName || 'رئيس المجلس العلمي')}<br><br>..................</div></div>`;
      if ((st.committee || []).length) h += `<div class="small" style="margin-top:20px"><b>أعضاء اللجنة:</b> ${st.committee.map(esc).join('، ')}</div>`;
      doPrint(h);
    });
  }
  function printFollowup() {
    const rows = followRows();
    if (!rows.length) return toast(t('noData'));
    I.withLang('ar', () => {
      let h = printHead([`قائمة متابعة المستفيدين بعد العودة — السنة المالية ${esc(P().fy)}`, '<span class="small">المواد 16 إلى 19 من القرار رقم 345</span>']);
      h += `<table class="p"><thead><tr><th>#</th><th>اللقب والاسم</th><th>الصنف والوجهة</th><th>الفترة</th><th>الوثائق المودعة</th><th>الوثائق الناقصة</th><th>الحالة</th></tr></thead><tbody>`;
      rows.forEach((f, i) => {
        const c = f.cand, fu = c.followup || {};
        const missing = f.req.filter(k => !(fu.docs && fu.docs[k])).map(k => D.RETURN_DOC_LABELS[k].split('(')[0].trim());
        h += `<tr><td class="num">${i + 1}</td><td>${esc(fullName(c))}</td><td>${esc(D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '')}<br>${esc([c.country, c.host].filter(Boolean).join(' — '))}</td>
          <td>${esc(c.startDate || '')} ← ${esc(c.endDate || '')}</td><td class="num">${f.done}/${f.req.length}</td><td class="small">${esc(missing.join('؛ '))}</td><td>${t('fs.' + f.state)}</td></tr>`;
      });
      doPrint(h + `</tbody></table>`);
    });
  }
  function printGridRef(id) { I.withLang('ar', () => doPrint(printHead(['شبكة التقييم الملحقة بالقرار رقم 345 المؤرخ في 09 مارس 2026']) + gridRefHTML(S.gridById(id), true))); }

  /* ================= بيانات تجريبية ================= */
  function loadDemo() {
    const fy = P().fy, py = String(+fy - 1);
    P().platformClose = P().platformClose || {};
    if (!P().platformClose[py]) P().platformClose[py] = py + '-02-15';
    const mk = o => Object.assign(blankCandidate(o.gridId), { fy, docs: {} }, o);
    const fillDocs = c => { D.requiredDocs(S.gridById(c.gridId), c.rank, c.program).forEach(k => { c.docs[k] = true; }); return c; };
    const list = [
      mk({ surname: 'بوزيد', name: 'سارة', gridId: 'U_CONF', rank: 'mca', program: 'conf', facultyId: 'fdsp', deptId: 'sp', specialty: 'علاقات دولية', country: 'إسبانيا', host: 'Universidad de Granada', startDate: fy + '-05-12', endDate: fy + '-05-16',
        lastBenefitYear: py, cutoffDate: py + '-02-15',
        scores: { prev: { n: 1 }, pubs: { entries: [{ cat: 'A', pos: 1, aff: true, title: 'Energy security in the Mediterranean', date: py + '-06-10' }, { cat: 'C', pos: 2, aff: true, title: 'مقال استعمل في الاستفادة السابقة', date: (+py - 1) + '-11-20' }] }, comms: { int_cls: 1, nat: 3 }, students: { master: 4, lic: 6 }, review: { B: 3 }, councils: { member: 2 } } }),
      mk({ surname: 'حمدي', name: 'كريم', gridId: 'U_CONF', rank: 'pr', program: 'conf', facultyId: 'fdsp', deptId: 'sp', specialty: 'دراسات أمنية', country: 'إيطاليا', host: 'Sapienza', startDate: fy + '-06-02', endDate: fy + '-06-06',
        scores: { prev: { n: 2 }, pubs: { entries: [{ cat: 'Ap', pos: 2, aff: true }] }, phd: { sup: 1, jury: 3 }, projects: { nat: 1 }, senior: { v: true } } }),
      mk({ surname: 'مرابط', name: 'ليلى', gridId: 'U_CONF', rank: 'phd', program: 'conf', regCount: 3, stars: true, facultyId: 'fsesnv', deptId: 'info', specialty: 'ذكاء اصطناعي', country: 'تركيا', host: 'Ankara University', startDate: fy + '-04-20', endDate: fy + '-04-23',
        scores: { prev: { n: 0 }, pubs: { entries: [{ cat: 'B', pos: 1, aff: true }] }, comms: { int_idx: 2, nat: 2 } } }),
      mk({ surname: 'قاسمي', name: 'يوسف', gridId: 'U_CONF', rank: 'mcb', program: 'conf', facultyId: 'fdsp', deptId: 'droit', specialty: 'قانون جنائي', country: 'فرنسا', host: 'Université Paris 1', startDate: fy + '-09-08', endDate: fy + '-09-20', scores: { prev: { n: 0 }, comms: { int_non: 2 } } }),
      mk({ surname: 'بلقاسم', name: 'نوال', gridId: 'U_SEJ', rank: 'mcb', program: 'sejour', facultyId: 'fst', deptId: 'ge', specialty: 'طاقات متجددة', country: 'كندا', host: 'Université Laval', startDate: fy + '-07-01', endDate: fy + '-07-12',
        scores: { rank: { bonus: true }, prev: { n: 0 }, pubs: { entries: [{ cat: 'A', pos: 1, aff: true }, { cat: 'B', pos: 3, aff: true }] }, polycop: { entries: [{ opt: 'p', flags: { en: true, taught: true } }] }, citations: { c: 14 } } }),
      mk({ surname: 'زروقي', name: 'عمر', gridId: 'U_SEJ', rank: 'pr', program: 'sejour', facultyId: 'fsecsg', deptId: 'gest', specialty: 'إدارة عامة', country: 'ماليزيا', host: 'UKM', startDate: fy + '-10-04', endDate: fy + '-10-15',
        scores: { prev: { n: 1 }, pubs: { entries: [{ cat: 'Ap', pos: 1, aff: true }] }, phd: { sup: 2 }, book: { entries: [{ opt: 'b', flags: {} }] } } }),
      mk({ surname: 'سعيدي', name: 'أمينة', gridId: 'U_STAGE', rank: 'phd', program: 'stage', regCount: 3, facultyId: 'fll', deptId: 'le', specialty: 'تعليمية الإنجليزية', country: 'البرتغال', host: 'Universidade de Lisboa', startDate: fy + '-03-01', endDate: fy + '-03-28',
        scores: { reg: { y: 3 }, prev: { n: 0 }, comms_intl: { cls: 1, idx: 2 }, comms_nat: { nat: 2 } } }),
      mk({ surname: 'عيساوي', name: 'رضا', gridId: 'U_STAGE', rank: 'phd', program: 'stage', regCount: 1, facultyId: 'fdsp', deptId: 'droit', specialty: 'قانون أعمال', country: 'تونس', host: 'Université de Tunis', startDate: fy + '-03-05', endDate: fy + '-03-25', scores: { reg: { y: 1 } } }),
      mk({ surname: 'منصوري', name: 'هدى', gridId: 'U_STAGE', rank: 'maa', program: 'stage', regCount: 4, facultyId: 'fshs', deptId: 'ss', specialty: 'علم الاجتماع', country: 'بلجيكا', host: 'ULB', startDate: fy + '-11-02', endDate: fy + '-11-25',
        scores: { reg: { y: 4 }, prev: { n: 1 }, pubs: { entries: [{ cat: 'C', pos: 1, aff: true }] }, elearn: { entries: [{ opt: 'cours', flags: {} }, { opt: 'td', flags: {} }] }, students: { lic: 4 } } }),
      mk({ surname: 'بن عمر', name: 'فاطمة', gridId: 'U_ATS', rank: 'c13', program: 'stage', facultyId: 'rect', deptId: 'pg', specialty: 'إدارة', degree: 'ماستر', country: 'فرنسا', host: 'Université de Lyon', startDate: fy + '-06-08', endDate: fy + '-06-22',
        scores: { seniority: { y: 12 }, lang: { dest: 1, en: 1 }, eval_att: { v: 3 }, eval_comp: { v: 2.5 }, eval_init: { v: 2 }, eval_avail: { v: 3 }, support: { c: 1 } } }),
      mk({ surname: 'لعريبي', name: 'سمير', gridId: 'U_ATS', rank: 'c11', program: 'stage', facultyId: 'rect', deptId: 'rel', specialty: 'إعلام آلي', degree: 'ليسانس', country: 'إسبانيا', host: 'Universidad de Alicante', startDate: fy + '-06-08', endDate: fy + '-06-20',
        scores: { seniority: { y: 7 }, lang: { dest: 1 }, eval_att: { v: 3 }, eval_comp: { v: 3 }, eval_init: { v: 3 }, eval_avail: { v: 2 }, prev_stays: { n: 1 } } })
    ];
    list.forEach(fillDocs);
    list[3].docs.conf_paper = false;
    // ملف السنة السابقة لنفس المترشحة (لتوضيح كشف السوابق)
    const old = mk({ surname: 'بوزيد', name: 'سارة', fy: py, gridId: 'U_CONF', rank: 'mca', program: 'conf', facultyId: 'fdsp', deptId: 'sp', country: 'تونس', host: 'Université de Sousse', startDate: py + '-04-10', endDate: py + '-04-13', decision: 'accepted' });
    fillDocs(old);
    state.candidates.push(...list, old);
    save(true); renderSide(); toast(t('demoAdded', { n: list.length }));
    location.hash = '#candidates'; route();
  }

  /* ================= البدء ================= */
  applyPrefs();
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
