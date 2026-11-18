/* واجهة التطبيق */
(function () {
  'use strict';
  const D = window.GRIDS_DATA, S = window.Scoring;
  const KEY = 'tarabbusat.v1';
  const main = document.getElementById('main');

  const STATUS = {
    accepted: ['مقبول', 'b-ok'], reserve: ['قائمة احتياط', 'b-warn'], rejected: ['مرفوض', 'b-bad'],
    ineligible: ['غير مؤهل', 'b-bad'], ranked: ['مرتب', 'b-info']
  };
  const DEC_LABELS = { auto: 'حسب الترتيب', accepted: 'قبول (قرار اللجنة)', rejected: 'رفض (قرار اللجنة)' };

  /* ================= التخزين ================= */
  function defaults() {
    const now = new Date(), y = now.getFullYear();
    return {
      version: 1,
      settings: {
        institution: '', faculty: '', department: '',
        vdName: '', vdTitle: 'نائب العميد المكلف بما بعد التدرج والبحث العلمي والعلاقات الخارجية',
        academicYear: now.getMonth() >= 8 ? y + '/' + (y + 1) : (y - 1) + '/' + y,
        fy: String(y), committee: [], seats: {}, groupBy: ['rank'], starsPriority: 'tie',
        followDays: 30, councilName: 'المجلس العلمي للكلية'
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
        return { version: 1, settings: Object.assign(d.settings, s.settings || {}), candidates: Array.isArray(s.candidates) ? s.candidates : [] };
      }
    } catch (e) { console.warn(e); }
    return d;
  }
  let state = load();
  let saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    const doit = () => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { toast('تعذر الحفظ التلقائي — قم بتصدير نسخة احتياطية'); }
    };
    if (now) doit(); else saveTimer = setTimeout(doit, 250);
  }
  window.addEventListener('beforeunload', () => save(true));

  /* ================= أدوات ================= */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString('ar-DZ', { maximumFractionDigits: 2 });
  const P = () => state.settings;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function fyCands() { return state.candidates.filter(c => String(c.fy) === String(P().fy)); }
  function candById(id) { return state.candidates.find(c => c.id === id); }
  function fullName(c) { return ((c.surname || '') + ' ' + (c.name || '')).trim() || 'بدون اسم'; }
  function rankLabel(c) { const rk = S.rankOf(S.gridById(c.gridId), c.rank); return rk ? rk.label : (c.rankText || '—'); }
  function badge(status) { const s = STATUS[status] || ['—', 'b-mut']; return `<span class="badge ${s[1]}">${s[0]}</span>`; }
  function gridOptions(sel, withAll) {
    const groups = { university: 'المؤسسات الجامعية والمدارس', research: 'مراكز البحث' };
    let h = withAll ? `<option value="">كل الشبكات</option>` : `<option value="">— اختر الشبكة —</option>`;
    for (const sc of Object.keys(groups)) {
      h += `<optgroup label="${groups[sc]}">`;
      for (const g of D.GRIDS.filter(g => g.scope === sc))
        h += `<option value="${g.id}" ${g.id === sel ? 'selected' : ''}>${esc(g.code + ' — ' + g.title)}</option>`;
      h += `</optgroup>`;
    }
    return h;
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function confirmBox(msg, onYes, yesLabel) {
    const m = document.getElementById('modal'), b = document.getElementById('modalBody');
    b.innerHTML = `<p style="margin-top:0">${msg}</p><div class="btns" style="justify-content:flex-end">
      <button class="btn" data-m="no">إلغاء</button><button class="btn primary" data-m="yes">${yesLabel || 'تأكيد'}</button></div>`;
    m.classList.add('on');
    b.onclick = e => {
      const k = e.target.getAttribute('data-m'); if (!k) return;
      m.classList.remove('on'); b.onclick = null;
      if (k === 'yes') onYes();
    };
  }
  function rankingAll() { return S.rankCandidates(fyCands(), P(), { groupBy: P().groupBy || [] }); }
  function positionOf(c) {
    for (const g of rankingAll()) {
      const r = g.rows.find(x => x.cand.id === c.id);
      if (r) return { pos: r.position, of: g.eligible, count: g.count, status: r.status, group: g };
    }
    return null;
  }
  function groupLabel(key) {
    const parts = key.split('|'), g = S.gridById(parts[0]);
    const out = [g ? g.code + ' — ' + g.title : parts[0]];
    for (const p of parts.slice(1)) {
      const i = p.indexOf(':'), t = p.slice(0, i), v = p.slice(i + 1);
      if (t === 'r') { const rk = S.rankOf(g, v); out.push('الرتبة: ' + (rk ? rk.label : v)); }
      if (t === 'd') out.push('القسم: ' + v);
      if (t === 's') out.push('التخصص: ' + v);
      if (t === 'p') out.push('الصنف: ' + (D.PROGRAMS[v] ? D.PROGRAMS[v].label : v));
    }
    return out;
  }

  /* ================= التوجيه ================= */
  let cur = null;          // الملف المفتوح في المحرر
  let edTab = 'info';
  const filt = { q: '', grid: '', dept: '', status: '', sort: 'recent' };
  let rankGrid = '';

  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'dashboard';
    const [v, arg] = h.split('/');
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.v === v || (v === 'edit' && a.dataset.v === 'candidates')));
    document.getElementById('side').classList.remove('open');
    cur = null;
    switch (v) {
      case 'candidates': viewCandidates(); break;
      case 'new': newCandidate(arg); return;
      case 'edit': viewEditor(arg); break;
      case 'ranking': viewRanking(); break;
      case 'quotas': viewQuotas(); break;
      case 'followup': viewFollowup(); break;
      case 'grids': viewGrids(arg); break;
      case 'decree': viewDecree(); break;
      case 'settings': viewSettings(); break;
      default: viewDashboard();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  function topbar(title, actions) {
    return `<div class="topbar"><div class="btns"><button class="btn menu-btn" data-act="menu">☰</button><h1>${title}</h1></div><div class="btns">${actions || ''}</div></div>`;
  }

  function renderFy() {
    const sel = document.getElementById('fySelect');
    const years = new Set(state.candidates.map(c => String(c.fy)));
    const y = +P().fy || new Date().getFullYear();
    [y - 1, y, y + 1].forEach(v => years.add(String(v)));
    sel.innerHTML = [...years].sort().map(v => `<option ${v === String(P().fy) ? 'selected' : ''}>${v}</option>`).join('');
  }
  document.getElementById('fySelect').addEventListener('change', e => { P().fy = e.target.value; save(); route(); });

  /* ================= لوحة القيادة ================= */
  function viewDashboard() {
    const cands = fyCands();
    const groups = rankingAll();
    const rows = groups.flatMap(g => g.rows);
    const n = rows.length, ok = rows.filter(r => r.elig.ok).length;
    const acc = rows.filter(r => r.status === 'accepted').length;
    const st = P();
    let h = topbar('لوحة القيادة', `<a class="btn primary" href="#new">＋ ملف جديد</a>`);
    if (!st.institution) h += `<div class="alert info">ابدأ بإدخال اسم المؤسسة والكلية وأعضاء لجنة الانتقاء في <a href="#settings">الإعدادات</a> لتظهر في الوثائق المطبوعة.</div>`;
    if (!n) {
      h += `<div class="card"><h2>مرحبا</h2>
        <p>هذا البرنامج يساعدك على دراسة طلبات الاستفادة من برنامج الحركية قصيرة المدى في الخارج للسنة المالية <b>${esc(st.fy)}</b> وفق القرار رقم 345 المؤرخ في 09 مارس 2026 وشبكات التقييم الملحقة به.</p>
        <ol><li>أدخل ملفات المترشحين (أو استوردها من ملف Excel).</li>
        <li>اختر لكل مترشح شبكة التقييم المناسبة لفئته، ثم أدخل عناصر ملفه؛ يحسب البرنامج النقاط آليا مع احترام الحدود القصوى ونسب ترتيب المؤلفين.</li>
        <li>يتحقق البرنامج من شروط الأهلية (الوثائق، المدة، الاستفادة في نفس السنة المالية، التسجيل المنتظم، عضوية اللجنة).</li>
        <li>اطلع على الترتيب حسب الفئة والرتبة والقسم والتخصص، وحدد عدد المناصب، ثم اطبع المحاضر أو صدّرها إلى Excel.</li></ol>
        <div class="btns"><a class="btn primary" href="#new">＋ إضافة أول ملف</a><button class="btn" data-act="import-xlsx">استيراد من Excel</button><button class="btn" data-act="demo">تحميل بيانات تجريبية</button></div></div>`;
      main.innerHTML = h; return;
    }
    h += `<div class="grid4">
      <div class="card stat"><b>${n}</b><span>ملف مترشح (${esc(st.fy)})</span></div>
      <div class="card stat"><b style="color:var(--ok)">${ok}</b><span>ملف مؤهل</span></div>
      <div class="card stat"><b style="color:var(--bad)">${n - ok}</b><span>ملف غير مؤهل / ناقص</span></div>
      <div class="card stat"><b>${acc}</b><span>مقبول (حسب المناصب المحددة)</span></div></div>`;
    h += `<div class="card"><h2>حسب شبكة التقييم</h2><div class="tbl-wrap"><table class="t"><thead><tr>
      <th>الشبكة</th><th class="num">الملفات</th><th class="num">مؤهل</th><th class="num">مقبول</th><th class="num">أعلى مجموع</th><th class="num">المتوسط</th><th></th></tr></thead><tbody>`;
    for (const g of D.GRIDS) {
      const gr = rows.filter(r => r.cand.gridId === g.id);
      if (!gr.length) continue;
      const okr = gr.filter(r => r.elig.ok);
      const best = okr.length ? Math.max(...okr.map(r => r.score)) : 0;
      const avg = okr.length ? okr.reduce((a, r) => a + r.score, 0) / okr.length : 0;
      h += `<tr><td><b>${esc(g.code)}</b> ${esc(g.title)}<div class="small muted">${esc(g.population)}</div></td>
        <td class="num">${gr.length}</td><td class="num">${okr.length}</td><td class="num">${gr.filter(r => r.status === 'accepted').length}</td>
        <td class="num">${g.noScoring ? '—' : fmt(best)}</td><td class="num">${g.noScoring ? '—' : fmt(avg)}</td>
        <td><button class="btn sm" data-act="goto-rank" data-g="${g.id}">الترتيب</button></td></tr>`;
    }
    h += `</tbody></table></div></div>`;
    const bad = rows.filter(r => !r.elig.ok);
    if (bad.length) {
      h += `<div class="card"><h2>ملفات تحتاج مراجعة</h2><div class="tbl-wrap"><table class="t"><tbody>`;
      for (const r of bad.slice(0, 15))
        h += `<tr><td><a href="#edit/${r.cand.id}">${esc(fullName(r.cand))}</a><div class="small muted">${esc(S.gridById(r.cand.gridId) ? S.gridById(r.cand.gridId).code : '—')} · ${esc(r.cand.department || '')}</div></td><td class="small" style="color:var(--bad)">${esc(r.elig.reasons.join(' — '))}</td></tr>`;
      h += `</tbody></table></div>${bad.length > 15 ? `<p class="small muted">و${bad.length - 15} ملفات أخرى…</p>` : ''}</div>`;
    }
    const pend = followRows().filter(f => f.state === 'late' || f.state === 'pending');
    if (pend.length) h += `<div class="alert warn">${pend.length} مستفيد(ون) لم يستكملوا وثائق ما بعد العودة. <a href="#followup">المتابعة</a></div>`;
    main.innerHTML = h;
  }

  /* ================= قائمة الملفات ================= */
  function viewCandidates() {
    const cands = fyCands();
    const depts = [...new Set(cands.map(c => (c.department || '').trim()).filter(Boolean))].sort();
    let h = topbar('ملفات المترشحين — السنة المالية ' + esc(P().fy), `
      <a class="btn primary" href="#new">＋ ملف جديد</a>
      <button class="btn" data-act="import-xlsx">استيراد Excel</button>
      <button class="btn" data-act="xlsx-template">نموذج الاستيراد</button>
      <button class="btn" data-act="export-list">تصدير Excel</button>`);
    h += `<div class="card"><div class="grid4">
      <label class="f"><span>بحث</span><input type="text" id="fq" value="${esc(filt.q)}" placeholder="الاسم، التخصص، المخبر…"></label>
      <label class="f"><span>الشبكة</span><select id="fg">${gridOptions(filt.grid, true)}</select></label>
      <label class="f"><span>القسم</span><select id="fd"><option value="">كل الأقسام</option>${depts.map(d => `<option ${d === filt.dept ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
      <label class="f"><span>الحالة</span><select id="fs">
        <option value="">الكل</option><option value="ok" ${filt.status === 'ok' ? 'selected' : ''}>مؤهل</option>
        <option value="bad" ${filt.status === 'bad' ? 'selected' : ''}>غير مؤهل / ناقص</option>
        <option value="accepted" ${filt.status === 'accepted' ? 'selected' : ''}>مقبول</option></select></label>
      </div>
      <div class="btns" style="margin-top:10px"><span class="small muted">الترتيب حسب:</span>
        <select id="fo" style="width:auto">
          <option value="recent" ${filt.sort === 'recent' ? 'selected' : ''}>الأحدث إدخالا</option>
          <option value="name" ${filt.sort === 'name' ? 'selected' : ''}>اللقب</option>
          <option value="total" ${filt.sort === 'total' ? 'selected' : ''}>المجموع</option></select></div></div>
      <div class="card" id="candTable"></div>`;
    main.innerHTML = h;
    const bind = (id, k) => document.getElementById(id).addEventListener('input', e => { filt[k] = e.target.value; renderCandTable(); });
    bind('fq', 'q'); bind('fg', 'grid'); bind('fd', 'dept'); bind('fs', 'status'); bind('fo', 'sort');
    renderCandTable();
  }
  function renderCandTable() {
    const statusMap = {};
    rankingAll().forEach(g => g.rows.forEach(r => { statusMap[r.cand.id] = r; }));
    const q = filt.q.trim().toLowerCase();
    let list = fyCands().filter(c => {
      const r = statusMap[c.id];
      if (filt.grid && c.gridId !== filt.grid) return false;
      if (filt.dept && (c.department || '').trim() !== filt.dept) return false;
      if (filt.status === 'ok' && !(r && r.elig.ok)) return false;
      if (filt.status === 'bad' && r && r.elig.ok) return false;
      if (filt.status === 'accepted' && !(r && r.status === 'accepted')) return false;
      if (q && ![c.surname, c.name, c.specialty, c.department, c.lab, c.host, c.country].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    if (filt.sort === 'name') list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'ar'));
    else if (filt.sort === 'total') list.sort((a, b) => (statusMap[b.id] ? statusMap[b.id].score : 0) - (statusMap[a.id] ? statusMap[a.id].score : 0));
    else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('candTable');
    if (!list.length) { el.innerHTML = `<div class="empty">لا توجد ملفات مطابقة.</div>`; return; }
    let h = `<div class="small muted" style="margin-bottom:6px">${list.length} ملف</div><div class="tbl-wrap"><table class="t"><thead><tr>
      <th>#</th><th>اللقب والاسم</th><th>الشبكة</th><th>الرتبة</th><th>القسم / التخصص</th><th>الصنف والوجهة</th><th class="num">المجموع</th><th>الحالة</th><th></th></tr></thead><tbody>`;
    list.forEach((c, i) => {
      const r = statusMap[c.id], g = S.gridById(c.gridId);
      const prog = D.PROGRAMS[c.program];
      h += `<tr><td class="num">${i + 1}</td>
        <td><a href="#edit/${c.id}"><b>${esc(fullName(c))}</b></a></td>
        <td>${g ? `<span class="badge b-info" title="${esc(g.title)}">${esc(g.code)}</span>` : '<span class="badge b-bad">—</span>'}</td>
        <td class="small">${esc(rankLabel(c))}</td>
        <td class="small">${esc(c.department || '—')}<div class="muted">${esc(c.specialty || '')}</div></td>
        <td class="small">${esc(prog ? prog.label : '—')}<div class="muted">${esc([c.country, c.host].filter(Boolean).join(' — '))}</div></td>
        <td class="num"><b>${g && g.noScoring ? '—' : fmt(r ? r.score : 0)}</b></td>
        <td>${r ? badge(r.status) : ''}${r && r.elig.reasons.length ? `<div class="small" style="color:var(--bad)">${r.elig.reasons.length} ملاحظة</div>` : ''}</td>
        <td><div class="btns"><a class="btn sm" href="#edit/${c.id}">فتح</a><button class="btn sm" data-act="print-sheet" data-id="${c.id}">طباعة</button>
          <button class="btn sm" data-act="dup-cand" data-id="${c.id}" title="نسخ الملف">⧉</button>
          <button class="btn sm danger" data-act="del-cand" data-id="${c.id}" title="حذف">✕</button></div></td></tr>`;
    });
    el.innerHTML = h + `</tbody></table></div>`;
  }

  /* ================= المحرر ================= */
  function blankCandidate(gridId) {
    const g = S.gridById(gridId);
    return {
      id: uid(), fy: P().fy, createdAt: Date.now(), surname: '', name: '', algerian: true,
      gridId: g ? g.id : '', rank: '', program: g ? g.programs[0] : '', docs: {}, scores: {},
      decision: 'auto', followup: {}
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
    if (!c) { main.innerHTML = topbar('ملف غير موجود') + `<div class="card empty">الملف غير موجود. <a href="#candidates">العودة إلى القائمة</a></div>`; return; }
    cur = c;
    renderEditor();
  }

  function renderEditor() {
    const c = cur, g = S.gridById(c.gridId);
    let h = topbar(esc(fullName(c)), `
      <a class="btn" href="#candidates">→ القائمة</a>
      <a class="btn" href="#new/${esc(c.gridId || '')}">＋ ملف آخر بنفس الشبكة</a>
      <button class="btn" data-act="print-sheet" data-id="${c.id}">🖶 طباعة سلم التقييم</button>
      <button class="btn danger" data-act="del-cand" data-id="${c.id}">حذف</button>`);
    const tabs = [['info', '1. المعلومات والحركية'], ['docs', '2. ملف الترشح'], ['score', '3. التنقيط'], ['decision', '4. القرار']];
    h += `<div class="editor"><div>
      <div class="tabs">${tabs.map(t => `<button class="${edTab === t[0] ? 'on' : ''}" data-act="tab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      <div id="edBody">${edTab === 'info' ? edInfo(c, g) : edTab === 'docs' ? edDocs(c, g) : edTab === 'score' ? edScore(c, g) : edDecision(c, g)}</div>
      <div class="btns" style="margin-top:12px">${edTab !== 'info' ? `<button class="btn" data-act="tab" data-t="${tabs[tabs.findIndex(t => t[0] === edTab) - 1][0]}">→ السابق</button>` : ''}
        ${edTab !== 'decision' ? `<button class="btn primary" data-act="tab" data-t="${tabs[tabs.findIndex(t => t[0] === edTab) + 1][0]}">التالي ←</button>` : ''}</div>
      </div><div class="summary card" id="summary"></div></div>`;
    main.innerHTML = h;
    updateSummary();
  }

  function edInfo(c, g) {
    const progs = Object.keys(D.PROGRAMS);
    const ordered = g ? g.programs.concat(progs.filter(p => !g.programs.includes(p))) : progs;
    const days = S.durationDays(c.startDate, c.endDate);
    const rk = S.rankOf(g, c.rank);
    const needsReg = g && (['U_STAGE', 'R_STAGE'].includes(g.id) || (rk && (rk.student || rk.id === 'maa')));
    let h = `<div class="card"><h2>شبكة التقييم والفئة</h2><div class="grid2">
      <label class="f"><span>شبكة التقييم (الفئة)</span><select data-f="gridId">${gridOptions(c.gridId)}</select></label>`;
    if (g && g.ranks.length)
      h += `<label class="f"><span>الرتبة / الصنف</span><select data-f="rank"><option value="">— اختر —</option>${g.ranks.map(r => `<option value="${r.id}" ${r.id === c.rank ? 'selected' : ''}>${esc(r.label)}${r.pts ? ' (' + r.pts + ' ن)' : ''}</option>`).join('')}</select></label>`;
    else if (g) h += fText('rankText', 'الوظيفة / الصنف', c.rankText);
    h += `</div>${g ? `<p class="small muted" style="margin-bottom:0">${esc(g.population)} — ${esc(g.subtitle)}</p>` : ''}</div>`;

    h += `<div class="card"><h2>معلومات المترشح</h2><div class="grid2">
      ${fText('surname', 'اللقب', c.surname)}${fText('name', 'الاسم', c.name)}
      ${fText('birthDate', 'تاريخ الازدياد', c.birthDate, 'date')}${fText('birthPlace', 'مكان الازدياد', c.birthPlace)}
      ${fText('department', 'القسم', c.department, 'text', 'list="dl-dept"')}${fText('specialty', 'التخصص', c.specialty, 'text', 'list="dl-spec"')}
      ${fText('lab', 'مخبر / وحدة البحث', c.lab)}${fText('degree', 'الشهادة الجامعية', c.degree)}
      ${fText('email', 'البريد الإلكتروني', c.email, 'email')}${fText('phone', 'الهاتف', c.phone, 'tel')}
      </div>${datalists()}
      <div style="margin-top:8px">${fCheck('algerian', 'يحمل الجنسية الجزائرية', c.algerian !== false)}</div></div>`;

    if (needsReg) {
      h += `<div class="card"><h2>الدكتوراه</h2><div class="grid2">
        ${fText('regCount', 'عدد التسجيلات المنتظمة في الدكتوراه', c.regCount, 'number', 'min="0" step="1"')}
        ${fText('regYear', 'سنة أول تسجيل', c.regYear, 'number', 'min="1990" step="1"')}</div>
        ${rk && rk.student ? fCheck('stars', 'طالب حائز على نجوم (تعطى له الأولوية)', c.stars) : ''}
        ${g.id === 'U_STAGE' ? fCheck('reRegistered', 'تخلى عن تسجيل سابق في طور الدكتوراه واستفاد من تسجيل جديد (ليست له الأولوية)', c.reRegistered) : ''}</div>`;
    }

    h += `<div class="card"><h2>الحركية المطلوبة</h2><div class="grid2">
      <label class="f"><span>صنف الحركية (المادة 12)</span><select data-f="program"><option value="">— اختر —</option>
      ${ordered.map(p => `<option value="${p}" ${p === c.program ? 'selected' : ''}>${esc(D.PROGRAMS[p].label)} (${D.PROGRAMS[p].min}–${D.PROGRAMS[p].max} يوما)</option>`).join('')}</select></label>
      ${fText('country', 'البلد المستقبل', c.country)}
      ${fText('host', 'المؤسسة / الهيئة المستقبلة', c.host)}${fText('city', 'المدينة', c.city)}
      ${fText('startDate', 'تاريخ البداية', c.startDate, 'date')}${fText('endDate', 'تاريخ النهاية', c.endDate, 'date')}
      ${c.program === 'conf' ? fText('confTitle', 'عنوان التظاهرة العلمية', c.confTitle) + fText('confIndex', 'فهرسة التظاهرة (WOS / Scopus …)', c.confIndex) : ''}
      </div><p class="small muted" id="daysInfo">${days != null ? 'المدة: <b>' + days + '</b> يوما' : ''}</p>
      ${fCheck('fyBenefited', 'استفاد من برنامج حركية قصيرة المدى برسم نفس السنة المالية', c.fyBenefited)}
      ${c.fyBenefited && c.program !== 'conf' ? fCheck('fyException', 'الحركية تدخل ضمن الاستثناء: نشاطات مشاريع دولية غير ممولة من طرف الجزائر، أو التشاور لإبرام اتفاقيات (المادة 11)', c.fyException) : ''}
      ${g && (g.id === 'U_ATS' || g.scope === 'research') ? fCheck('inConvention', 'التربص يتم في إطار اتفاقية دولية مبرمة', c.inConvention !== false) : ''}
      ${fCheck('isCommitteeMember', 'المترشح عضو في لجنة الانتقاء برسم هذه السنة', c.isCommitteeMember)}
      </div>`;
    return h;
  }
  function datalists() {
    const d = [...new Set(state.candidates.map(c => c.department).filter(Boolean))];
    const s = [...new Set(state.candidates.map(c => c.specialty).filter(Boolean))];
    return `<datalist id="dl-dept">${d.map(x => `<option value="${esc(x)}">`).join('')}</datalist><datalist id="dl-spec">${s.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
  }

  function edDocs(c, g) {
    if (!g) return `<div class="card alert warn">اختر شبكة التقييم أولا في تبويب المعلومات.</div>`;
    const req = D.requiredDocs(g, c.rank, c.program);
    let h = `<div class="card docs"><h2>وثائق ملف الترشح (المادة 14)</h2><p class="small muted">ضع علامة على كل وثيقة موجودة في الملف. أي وثيقة ناقصة تجعل الملف غير مؤهل.</p>`;
    for (const k of req) h += fCheck(k, esc(D.DOCS[k]), c.docs && c.docs[k], 'data-doc');
    h += `<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="docs-all">تحديد الكل</button></div></div>`;
    h += `<div class="card"><h2>ملاحظات حول الملف</h2><textarea data-f="docNotes" placeholder="وثائق إضافية، تحفظات…">${esc(c.docNotes || '')}</textarea></div>`;
    return h;
  }

  function edScore(c, g) {
    if (!g) return `<div class="card alert warn">اختر شبكة التقييم أولا في تبويب المعلومات.</div>`;
    if (g.noScoring) return `<div class="card"><h2>${esc(g.title)}</h2><div class="alert info">${esc(g.subtitle)}</div><ul>${g.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    let h = `<div class="card"><h2>${esc(g.code + ' — ' + g.title)}</h2><p class="small muted" style="margin-top:-6px">${esc(g.population)}</p>`;
    let sec = null;
    for (const crit of g.criteria) {
      if (crit.section !== sec) { sec = crit.section; h += `<div class="sec-title">${esc(sec)}</div>`; }
      h += critHTML(crit, c, g);
    }
    h += `<div class="alert info small"><b>ملاحظات الشبكة:</b><ul>${g.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div></div>`;
    return h;
  }

  function ruleText(l) {
    let t = (l.pts > 0 ? l.pts : l.pts) + ' ن';
    if (l.maxCount != null) t += ' · ' + l.maxCount + ' كحد أقصى';
    if (l.maxPts != null) t += ' · سقف ' + l.maxPts + ' ن';
    return t;
  }
  function critHTML(crit, c, g) {
    const inp = (c.scores || {})[crit.id] || {};
    const res = S.scoreCriterion(crit, inp, c, g);
    const max = S.maxOfCriterion(crit, g);
    const A = `data-c="${crit.id}"`;
    let body = '';
    switch (crit.type) {
      case 'rank': {
        const rk = S.rankOf(g, c.rank);
        body = `<div class="small">${rk ? esc(rk.label) + ' — <b>' + rk.pts + '</b> نقاط' : '<span style="color:var(--bad)">حدد الرتبة في تبويب المعلومات</span>'}</div>`;
        if (crit.bonus && rk && (!crit.bonus.onlyRanks || crit.bonus.onlyRanks.includes(rk.id)))
          body += `<label class="chk small"><input type="checkbox" ${A} data-k="bonus" ${inp.bonus ? 'checked' : ''}><span>${esc(crit.bonus.label)}</span></label>`;
        break;
      }
      case 'prev':
        body = `<div class="row"><span>عدد الاستفادات السابقة (n)</span><input type="number" min="0" step="1" ${A} data-k="n" value="${esc(inp.n == null ? '' : inp.n)}"></div>`;
        break;
      case 'prevN':
        body = `<div class="row"><span>N (أكبر عدد من التسجيلات للفئة)</span><select ${A} data-k="N">${crit.options.map(o => `<option ${+inp.N === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="row"><span>n (عدد التربصات المنجزة)</span><input type="number" min="0" step="1" ${A} data-k="n" value="${esc(inp.n == null ? '' : inp.n)}"></div>`;
        break;
      case 'lines':
        for (const l of crit.lines)
          body += `<div class="row"><span>${esc(l.label)} <span class="rule">(${ruleText(l)})</span></span>
            <input type="number" min="0" step="1" ${A} data-k="${l.id}" value="${esc(inp[l.id] == null ? '' : inp[l.id])}" placeholder="العدد"></div>`;
        if (crit.maxCount != null) body += `<div class="note">الحد الأقصى للمجموعة: ${crit.maxCount} (تحتسب الأعلى نقاطا أولا)</div>`;
        break;
      case 'pubs': {
        const entries = inp.entries || [];
        body = `<table class="entries">`;
        entries.forEach((e, i) => {
          const cat = crit.cats.find(x => x.id === e.cat);
          const w = (D.AUTHOR_WEIGHTS.find(a => a.v === +e.pos) || { w: 1 }).w;
          const v = cat ? (crit.requireAff && e.aff === false ? 0 : cat.pts * w) : 0;
          body += `<tr><td style="width:38%"><input type="text" ${A} data-e="${i}" data-k="title" value="${esc(e.title || '')}" placeholder="عنوان / مرجع المقال"></td>
            <td><select ${A} data-e="${i}" data-k="cat">${crit.cats.map(x => `<option value="${x.id}" ${x.id === e.cat ? 'selected' : ''}>${esc(x.label)} (${x.pts})</option>`).join('')}</select></td>
            <td><select ${A} data-e="${i}" data-k="pos">${D.AUTHOR_WEIGHTS.map(a => `<option value="${a.v}" ${a.v === +(e.pos || 1) ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></td>
            ${crit.requireAff ? `<td class="small"><label class="chk"><input type="checkbox" ${A} data-e="${i}" data-k="aff" ${e.aff !== false ? 'checked' : ''}>تسمية المؤسسة</label></td>` : ''}
            <td class="num"><b>${fmt(v)}</b></td><td><button class="btn sm danger" data-act="del-entry" ${A} data-e="${i}">✕</button></td></tr>`;
        });
        body += `</table><button class="btn sm" data-act="add-entry" ${A} style="margin-top:6px">＋ إضافة منشور</button>`;
        const caps = crit.cats.filter(x => x.maxCount || x.maxPts).map(x => x.label + ': ' + (x.maxCount ? x.maxCount + ' كحد أقصى' : 'سقف ' + x.maxPts));
        if (caps.length) body += `<div class="note">${esc(caps.join(' · '))}</div>`;
        break;
      }
      case 'items': {
        const entries = inp.entries || [];
        body = `<table class="entries">`;
        entries.forEach((e, i) => {
          const o = crit.opts.find(x => x.id === e.opt);
          let v = o ? o.pts : 0;
          (crit.flags || []).forEach(f => { if (e.flags && e.flags[f.id]) v += f.pts; });
          body += `<tr><td style="width:36%"><input type="text" ${A} data-e="${i}" data-k="title" value="${esc(e.title || '')}" placeholder="العنوان"></td>
            ${crit.opts.length > 1 ? `<td><select ${A} data-e="${i}" data-k="opt">${crit.opts.map(x => `<option value="${x.id}" ${x.id === e.opt ? 'selected' : ''}>${esc(x.label)} (${x.pts})</option>`).join('')}</select></td>` : `<td class="small">${esc(crit.opts[0].label)} (${crit.opts[0].pts})</td>`}
            <td class="small">${(crit.flags || []).map(f => `<label class="chk"><input type="checkbox" ${A} data-e="${i}" data-k="flag:${f.id}" ${e.flags && e.flags[f.id] ? 'checked' : ''}>${esc(f.label)} (+${f.pts})</label>`).join('')}</td>
            <td class="num"><b>${fmt(v)}</b></td><td><button class="btn sm danger" data-act="del-entry" ${A} data-e="${i}">✕</button></td></tr>`;
        });
        body += `</table><button class="btn sm" data-act="add-entry" ${A} style="margin-top:6px">＋ إضافة</button>`;
        break;
      }
      case 'scale':
        body = `<div class="row"><span class="rule">علامة من 0 إلى ${crit.max}</span><input type="number" min="0" max="${crit.max}" step="${crit.step || 0.5}" ${A} data-k="v" value="${esc(inp.v == null ? '' : inp.v)}"></div>`;
        break;
      case 'check':
        body = `<label class="chk"><input type="checkbox" ${A} data-k="v" ${inp.v ? 'checked' : ''}><span>نعم (${crit.pts} ن)</span></label>`;
        break;
    }
    return `<div class="crit" id="crit-${crit.id}"><div class="crit-h"><div><div class="lbl">${esc(crit.label)}</div>${crit.note ? `<div class="note">${esc(crit.note)}</div>` : ''}</div>
      <span class="pts" id="pts-${crit.id}">${fmt(res.pts)}${max != null ? ' / ' + fmt(max) : ''}</span></div>${body}</div>`;
  }

  function edDecision(c, g) {
    const el = S.checkEligibility(c, P());
    const pos = positionOf(c);
    let h = `<div class="card"><h2>نتيجة دراسة الملف</h2>`;
    h += el.ok ? `<div class="alert ok">الملف مستوفٍ لشروط الأهلية.</div>` : `<div class="alert bad"><b>الملف غير مؤهل:</b><ul>${el.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (el.warnings.length) h += `<div class="alert warn"><ul>${el.warnings.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (pos) h += `<p>الترتيب ضمن مجموعته: <b>${pos.pos ? pos.pos + ' / ' + pos.of : '—'}</b> ${badge(pos.status)}<br><span class="small muted">${esc(groupLabel(pos.group.key).join(' · '))}</span></p>`;
    h += `</div><div class="card"><h2>قرار اللجنة / المجلس العلمي</h2><div class="grid2">
      <label class="f"><span>القرار</span><select data-f="decision">${Object.keys(DEC_LABELS).map(k => `<option value="${k}" ${c.decision === k ? 'selected' : ''}>${DEC_LABELS[k]}</option>`).join('')}</select></label>
      ${fText('decisionDate', 'تاريخ المداولة', c.decisionDate, 'date')}</div>
      <label class="f" style="margin-top:10px"><span>أسباب الرفض (يجب أن يكون الرفض مبررا)</span><textarea data-f="rejectReason">${esc(c.rejectReason || '')}</textarea></label>
      ${c.decision === 'rejected' && !(c.rejectReason || '').trim() ? `<div class="alert warn">يجب تبرير قرار الرفض.</div>` : ''}
      <label class="f" style="margin-top:10px"><span>ملاحظات اللجنة</span><textarea data-f="notes">${esc(c.notes || '')}</textarea></label></div>`;
    return h;
  }

  function updateSummary() {
    if (!cur) return;
    const sc = S.computeScore(cur), el = S.checkEligibility(cur, P());
    const g = sc.grid;
    sc.breakdown.forEach(b => {
      const s = document.getElementById('pts-' + b.id);
      if (s) s.textContent = fmt(b.pts) + (b.max != null ? ' / ' + fmt(b.max) : '');
    });
    const di = document.getElementById('daysInfo');
    if (di) di.innerHTML = el.days != null ? 'المدة: <b>' + el.days + '</b> يوما' : '';
    const box = document.getElementById('summary');
    if (!box) return;
    let h = `<div class="small muted">${g ? esc(g.code + ' — ' + g.title) : 'لم تحدد الشبكة'}</div>
      <div class="total">${g && g.noScoring ? '—' : fmt(sc.total)}</div><div class="small muted">مجموع النقاط</div>
      <div style="margin:10px 0">${el.ok ? '<span class="badge b-ok">مؤهل</span>' : '<span class="badge b-bad">غير مؤهل / ناقص</span>'}
      ${cur.decision !== 'auto' ? ' ' + badge(cur.decision) : ''}</div>`;
    if (el.reasons.length) h += `<div class="alert bad small"><ul>${el.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    if (el.warnings.length) h += `<div class="alert warn small"><ul>${el.warnings.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    const nz = sc.breakdown.filter(b => b.pts);
    if (nz.length) h += `<h3>تفصيل النقاط</h3><div class="bk">${nz.map(b => `<div><span>${esc(b.label.length > 60 ? b.label.slice(0, 58) + '…' : b.label)}</span><b>${fmt(b.pts)}</b></div>`).join('')}</div>`;
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
      return k !== 'title'; // إعادة رسم المعيار
    }
    inp[k] = val;
    return false;
  }
  function rerenderCrit(cid) {
    const g = S.gridById(cur.gridId), crit = g && g.criteria.find(x => x.id === cid);
    const node = document.getElementById('crit-' + cid);
    if (crit && node) node.outerHTML = critHTML(crit, cur, g);
  }

  function onInput(e) {
    const el = e.target;
    const isChange = e.type === 'change';
    if (cur && el.dataset.f) {
      const f = el.dataset.f;
      if (el.type === 'checkbox') cur[f] = el.checked;
      else cur[f] = el.value;
      save();
      if (isChange && ['gridId', 'rank', 'program', 'fyBenefited', 'decision', 'regCount'].includes(f)) {
        if (f === 'gridId') {
          const g = S.gridById(cur.gridId);
          if (g && !S.rankOf(g, cur.rank)) cur.rank = '';
          if (g && !g.programs.includes(cur.program)) cur.program = g.programs[0];
        }
        save(); renderEditor(); return;
      }
      if (f === 'surname' || f === 'name') { const t = main.querySelector('.topbar h1'); if (t) t.textContent = fullName(cur); }
      updateSummary(); return;
    }
    if (cur && el.dataset.doc) {
      cur.docs = cur.docs || {}; cur.docs[el.dataset.doc] = el.checked; save(); updateSummary(); return;
    }
    if (cur && el.dataset.c) {
      if (el.dataset.e != null && el.dataset.k === 'title' && isChange) return;
      if (el.dataset.e != null && el.dataset.k !== 'title' && !isChange && el.tagName === 'SELECT') return;
      const needRerender = setScore(el);
      save();
      if (needRerender) rerenderCrit(el.dataset.c);
      updateSummary(); return;
    }
    if (el.dataset.set) {
      const k = el.dataset.set;
      if (k === 'committee') P().committee = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      else if (k.startsWith('groupBy:')) {
        const g = k.slice(8), gb = new Set(P().groupBy || []);
        el.checked ? gb.add(g) : gb.delete(g); P().groupBy = [...gb];
      } else P()[k] = el.type === 'number' ? el.value : el.value;
      save();
      if (isChange && el.dataset.rerender) route();
      return;
    }
    if (el.dataset.seat != null && isChange) { P().seats[el.dataset.seat] = el.value; save(); viewRanking(true); return; }
    if (el.dataset.dec && isChange) { const c = candById(el.dataset.dec); c.decision = el.value; save(); viewRanking(true); return; }
    if (el.dataset.fu) {
      const c = candById(el.dataset.id); c.followup = c.followup || {};
      const k = el.dataset.fu;
      if (k.startsWith('doc:')) { c.followup.docs = c.followup.docs || {}; c.followup.docs[k.slice(4)] = el.checked; }
      else c.followup[k] = el.type === 'checkbox' ? el.checked : el.value;
      save();
      if (isChange && el.type !== 'text') viewFollowup(true);
    }
  }
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
        const g = S.gridById(cur.gridId), crit = g.criteria.find(x => x.id === b.dataset.c);
        cur.scores = cur.scores || {};
        const inp = cur.scores[crit.id] = cur.scores[crit.id] || {};
        inp.entries = inp.entries || [];
        inp.entries.push(crit.type === 'pubs' ? { cat: crit.cats[0].id, pos: 1, aff: true, title: '' } : { opt: crit.opts[0].id, flags: {}, title: '' });
        save(); rerenderCrit(crit.id); updateSummary(); break;
      }
      case 'del-entry': {
        const inp = cur.scores[b.dataset.c];
        inp.entries.splice(+b.dataset.e, 1);
        save(); rerenderCrit(b.dataset.c); updateSummary(); break;
      }
      case 'docs-all': {
        const g = S.gridById(cur.gridId);
        cur.docs = cur.docs || {};
        D.requiredDocs(g, cur.rank, cur.program).forEach(k => { cur.docs[k] = true; });
        save(); renderEditor(); break;
      }
      case 'del-cand': {
        const c = candById(b.dataset.id);
        confirmBox(`حذف ملف <b>${esc(fullName(c))}</b> نهائيا؟`, () => {
          state.candidates = state.candidates.filter(x => x.id !== c.id); save(true);
          toast('تم حذف الملف');
          if (location.hash.startsWith('#edit')) location.hash = '#candidates'; else route();
        }, 'حذف');
        break;
      }
      case 'dup-cand': {
        const c = JSON.parse(JSON.stringify(candById(b.dataset.id)));
        c.id = uid(); c.createdAt = Date.now(); c.surname = (c.surname || '') + ' (نسخة)'; c.followup = {}; c.decision = 'auto';
        state.candidates.push(c); save(); toast('تم نسخ الملف'); route(); break;
      }
      case 'print-sheet': printSheets([candById(b.dataset.id)]); break;
      case 'print-sheets-all': printSheets(rankingRowsForPrint().map(r => r.cand)); break;
      case 'goto-rank': rankGrid = b.dataset.g; location.hash = '#ranking'; break;
      case 'print-ranking': printRanking(); break;
      case 'export-ranking': exportRanking(); break;
      case 'export-list': exportList(); break;
      case 'xlsx-template': exportTemplate(); break;
      case 'import-xlsx': pickFile('.xlsx,.xls,.csv', importXlsx); break;
      case 'backup': backup(); break;
      case 'restore': pickFile('.json', restore); break;
      case 'reset': confirmBox('حذف جميع البيانات (كل السنوات)؟ قم بتصدير نسخة احتياطية أولا.', () => { state = defaults(); save(true); renderFy(); location.hash = '#dashboard'; route(); }, 'حذف الكل'); break;
      case 'demo': loadDemo(); break;
      case 'print-follow': printFollowup(); break;
      case 'print-blank': printSheets([blankCandidate(b.dataset.g)], true); break;
      case 'print-grid-ref': printGridRef(b.dataset.g); break;
    }
  });

  function pickFile(accept, cb) {
    const inp = document.getElementById('fileInput');
    inp.value = ''; inp.accept = accept;
    inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
    inp.click();
  }

  /* ================= الترتيب ================= */
  function rankingGroups() {
    return S.rankCandidates(fyCands(), P(), { groupBy: P().groupBy || [], gridId: rankGrid || undefined });
  }
  function rankingRowsForPrint() { return rankingGroups().flatMap(g => g.rows); }

  function viewRanking(keepScroll) {
    const y = window.scrollY;
    const gb = P().groupBy || [];
    const groups = rankingGroups();
    let h = topbar('الترتيب والقوائم — ' + esc(P().fy), `
      <button class="btn primary" data-act="print-ranking">🖶 طباعة محضر الترتيب</button>
      <button class="btn" data-act="print-sheets-all">🖶 طباعة سلالم التقييم</button>
      <button class="btn" data-act="export-ranking">تصدير Excel</button>`);
    h += `<div class="card"><div class="grid2"><label class="f"><span>الشبكة / الفئة</span><select id="rg">${gridOptions(rankGrid, true)}</select></label>
      <div><span class="small" style="font-weight:700">الترتيب داخل مجموعات حسب:</span><div class="btns">
      ${[['rank', 'الرتبة'], ['department', 'القسم'], ['specialty', 'التخصص'], ['program', 'صنف الحركية']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-set="groupBy:${k}" data-rerender="1" ${gb.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}
      </div></div></div>
      <p class="small muted" style="margin-bottom:0">معايير الفصل عند تساوي المجموع: ${P().starsPriority === 'absolute' ? '' : 'الحيازة على نجوم (للطلبة)، '}أقل عدد من الاستفادات السابقة، ثم الرتبة الأعلى. حدد عدد المناصب لكل مجموعة لإظهار المقبولين وقائمة الاحتياط. تظهر علامة <span class="badge b-warn">تساوٍ</span> عند تساوي المجموع لتنبيه اللجنة.</p></div>`;
    if (!groups.length) h += `<div class="card empty">لا توجد ملفات في هذه السنة المالية.</div>`;
    for (const grp of groups) {
      const lbl = groupLabel(grp.key);
      const g = S.gridById(grp.key.split('|')[0]);
      h += `<div class="card"><div class="group-h"><div><h3>${esc(lbl[0])}</h3><div class="small muted">${esc(lbl.slice(1).join(' · ') || (g ? g.population : ''))} — ${grp.count} مترشح، ${grp.eligible} مؤهل</div></div>
        <label class="seats">عدد المناصب: <input type="number" min="0" step="1" data-seat="${esc(grp.key)}" value="${esc(grp.seats == null ? '' : grp.seats)}"></label></div>
        <div class="tbl-wrap"><table class="t"><thead><tr><th class="num">الترتيب</th><th>اللقب والاسم</th><th>الرتبة</th><th>القسم / التخصص</th><th>الوجهة</th><th class="num">المجموع</th><th>الحالة</th><th>القرار</th></tr></thead><tbody>`;
      for (const r of grp.rows) {
        const c = r.cand;
        h += `<tr class="${r.status === 'accepted' ? 'row-acc' : (r.status === 'ineligible' || r.status === 'rejected') ? 'row-bad' : ''}">
          <td class="num"><b>${r.position || '—'}</b></td>
          <td><a href="#edit/${c.id}">${esc(fullName(c))}</a>${c.stars ? ' <span title="حائز على نجوم">★</span>' : ''}${r.tie ? ' <span class="badge b-warn">تساوٍ</span>' : ''}</td>
          <td class="small">${esc(rankLabel(c))}</td><td class="small">${esc(c.department || '—')}<div class="muted">${esc(c.specialty || '')}</div></td>
          <td class="small">${esc([c.country, c.host].filter(Boolean).join(' — ') || '—')}</td>
          <td class="num"><b>${g && g.noScoring ? '—' : fmt(r.score)}</b></td>
          <td>${badge(r.status)}${r.elig.reasons.length ? `<div class="small" style="color:var(--bad);max-width:260px">${esc(r.elig.reasons[0])}${r.elig.reasons.length > 1 ? ' (+' + (r.elig.reasons.length - 1) + ')' : ''}</div>` : ''}</td>
          <td><select data-dec="${c.id}" style="width:auto">${Object.keys(DEC_LABELS).map(k => `<option value="${k}" ${c.decision === k ? 'selected' : ''}>${DEC_LABELS[k]}</option>`).join('')}</select></td></tr>`;
      }
      h += `</tbody></table></div></div>`;
    }
    main.innerHTML = h;
    document.getElementById('rg').addEventListener('change', e => { rankGrid = e.target.value; viewRanking(); });
    if (keepScroll) window.scrollTo(0, y);
  }

  /* ================= الحصص (المادة 5) ================= */
  function viewQuotas() {
    const st = P();
    const T = +st.quotaTotal || 0, B = +st.quotaBudget || 0;
    const cands = fyCands();
    const isAts = c => ['U_ATS', 'R_ADM', 'R_TECH_ENG', 'R_TECH_DEV'].includes(c.gridId);
    const nSpecial = cands.filter(c => c.gridId === 'X_SPECIAL').length;
    const nAts = cands.filter(isAts).length;
    const nOther = cands.filter(c => c.gridId && c.gridId !== 'X_SPECIAL' && !isAts(c)).length;
    const row = (lbl, pct, n, sub) => `<tr><td>${lbl}${sub ? `<div class="small muted">${sub}</div>` : ''}</td><td class="num">${pct}%</td>
      <td class="num"><b>${T ? fmt(T * pct / 100) : '—'}</b></td><td class="num">${B ? fmt(B * pct / 100) : '—'}</td><td class="num">${n == null ? '' : n}</td></tr>`;
    let h = topbar('توزيع حصص برامج تحسين المستوى (المادة 5)');
    h += `<div class="card"><div class="grid2">
      <label class="f"><span>العدد الإجمالي للمناصب المتاحة</span><input type="number" min="0" data-set="quotaTotal" data-rerender="1" value="${esc(st.quotaTotal || '')}"></label>
      <label class="f"><span>الميزانية المتاحة (دج) — اختياري</span><input type="number" min="0" data-set="quotaBudget" data-rerender="1" value="${esc(st.quotaBudget || '')}"></label></div></div>
      <div class="card"><div class="tbl-wrap"><table class="t"><thead><tr><th>الحصة</th><th class="num">النسبة</th><th class="num">المناصب</th><th class="num">المبلغ</th><th class="num">ملفات مسجلة</th></tr></thead><tbody>
      <tr class="p-sec"><td colspan="5"><b>90% لتربصات تحسين المستوى</b></td></tr>
      ${row('الأساتذة الباحثون والأساتذة الباحثون الاستشفائيون الجامعيون والباحثون الدائمون — في إطار البرنامج الخاص المسطر من قبل الوصاية', 80, nSpecial, 'شبكة خ-1')}
      ${row('المستخدمون الإداريون والتقنيون في الإدارة المركزية والمؤسسات تحت الوصاية — الأولوية لمترشحي البرنامج الخاص', 10, nAts, 'الشبكات ج-4، م-3، م-4، م-5')}
      <tr class="p-sec"><td colspan="5"><b>10% تشمل</b></td></tr>
      ${row('الإقامات العلمية قصيرة المدى ذات المستوى العالي؛ التظاهرات العلمية المفهرسة في WOS؛ تداريب الأساتذة/الباحثين الذين يحضرون الدكتوراه وطلبة الدكتوراه غير الأجراء (ابتداء من التسجيل الثاني) وطلبة الإشراف المشترك وطلبة ماستر 2 في التكوين المشترك الدولي', 10, nOther, 'الشبكات ج-1، ج-2، ج-3، م-1، م-2، خ-2')}
      </tbody></table></div>
      <p class="small muted">يمكن تعديل هذه الحصص إذا لزم الأمر وبشكل استثنائي بعد موافقة الهيئة العلمية مع إعلام الإدارة المركزية بالمبررات المعتمدة (المادة 6). يُعد مخطط الحركية حسب ميزانية محددة بالأهداف والوثائق الثبوتية (المادة 8).</p></div>`;
    main.innerHTML = h;
  }

  /* ================= المتابعة بعد العودة ================= */
  function followRows() {
    const today = new Date().toISOString().slice(0, 10);
    const delay = +P().followDays || 30;
    return rankingAll().flatMap(g => g.rows).filter(r => r.status === 'accepted').map(r => {
      const c = r.cand, fu = c.followup || {};
      const req = D.RETURN_DOCS[c.program] || D.RETURN_DOCS.stage;
      const done = req.filter(k => fu.docs && fu.docs[k]).length;
      let stateK;
      if (fu.notDone) stateK = 'cancel';
      else if (!c.endDate || c.endDate >= today) stateK = 'future';
      else if (done === req.length) stateK = 'ok';
      else {
        const lim = new Date(c.endDate + 'T00:00:00'); lim.setDate(lim.getDate() + delay);
        stateK = lim.toISOString().slice(0, 10) < today ? 'late' : 'pending';
      }
      return { cand: c, req, done, state: stateK };
    });
  }
  const FSTATE = { cancel: ['لم تنفذ / أُجلت', 'b-mut'], future: ['لم تنته بعد', 'b-info'], ok: ['مستوفٍ', 'b-ok'], pending: ['في انتظار الوثائق', 'b-warn'], late: ['متأخر (المادة 19)', 'b-bad'] };
  function viewFollowup(keepScroll) {
    const y = window.scrollY;
    const rows = followRows();
    let h = topbar('المتابعة بعد العودة — ' + esc(P().fy), `<button class="btn" data-act="print-follow">🖶 طباعة قائمة المتابعة</button>`);
    h += `<div class="card small muted">تعرض هنا الملفات المقبولة. يتعين على المستفيدين بعد العودة تقديم الوثائق المنصوص عليها في المادة 16، وتقييمها من الهيئة العلمية (المادة 17)، وتقديم عرض أو محاضرة حول النتائج (المادة 18). تتخذ المؤسسة الإجراءات المقررة في حق من لم يوفوا بالتزاماتهم (المادة 19). يتم التكوين خلال السنة المالية ولا يمكن تأجيله إلا للضرورة أو القوة القاهرة (المادة 7).
      <div style="margin-top:6px">أجل داخلي لإيداع الوثائق بعد العودة: <input type="number" min="1" style="width:80px" data-set="followDays" data-rerender="1" value="${esc(P().followDays || 30)}"> يوما</div></div>`;
    if (!rows.length) h += `<div class="card empty">لا توجد ملفات مقبولة بعد. حدد عدد المناصب في صفحة الترتيب أو اقبل الملفات بقرار اللجنة.</div>`;
    for (const f of rows) {
      const c = f.cand, fu = c.followup || {}, g = S.gridById(c.gridId);
      const outFy = c.startDate && c.startDate.slice(0, 4) !== String(c.fy);
      h += `<div class="card"><div class="group-h"><div><h3><a href="#edit/${c.id}">${esc(fullName(c))}</a> <span class="badge ${FSTATE[f.state][1]}">${FSTATE[f.state][0]}</span></h3>
        <div class="small muted">${esc(g ? g.code : '')} · ${esc(D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '')} · ${esc([c.country, c.host].filter(Boolean).join(' — '))} · ${esc(c.startDate || '?')} ← ${esc(c.endDate || '?')}</div></div>
        <span class="small">${f.done} / ${f.req.length}</span></div>
        ${outFy ? `<div class="alert warn small">تاريخ الحركية خارج السنة المالية ${esc(c.fy)} (المادة 7).</div>` : ''}
        <div class="grid2"><div>${f.req.map(k => `<label class="chk small"><input type="checkbox" data-fu="doc:${k}" data-id="${c.id}" ${fu.docs && fu.docs[k] ? 'checked' : ''}>${esc(D.RETURN_DOC_LABELS[k])}</label>`).join('')}</div>
        <div><div class="grid2">
          <label class="f"><span>تاريخ العودة الفعلي</span><input type="date" data-fu="returnDate" data-id="${c.id}" value="${esc(fu.returnDate || '')}"></label>
          <label class="f"><span>تاريخ العرض / المحاضرة</span><input type="date" data-fu="lectureDate" data-id="${c.id}" value="${esc(fu.lectureDate || '')}"></label></div>
          <label class="chk small"><input type="checkbox" data-fu="notDone" data-id="${c.id}" ${fu.notDone ? 'checked' : ''}>لم تنفذ الحركية / أُجلت (ضرورة أو قوة قاهرة)</label>
          <label class="f"><span>ملاحظات</span><input type="text" data-fu="note" data-id="${c.id}" value="${esc(fu.note || '')}"></label></div></div></div>`;
    }
    main.innerHTML = h;
    if (keepScroll) window.scrollTo(0, y);
  }

  /* ================= مرجع الشبكات ================= */
  function critRuleDesc(crit, g) {
    switch (crit.type) {
      case 'rank': return (g.ranks || []).map(r => r.label + ': ' + r.pts).join('؛ ') + (crit.bonus ? '؛ ' + crit.bonus.label : '');
      case 'prev': return crit.base + ' - n';
      case 'prevN': return 'N - n (N = ' + crit.options.join(' أو ') + ')';
      case 'lines': return crit.lines.map(l => l.label + ': ' + ruleText(l)).join('؛ ') + (crit.maxCount ? ' — ' + crit.maxCount + ' كحد أقصى للمجموعة' : '');
      case 'pubs': return crit.cats.map(c => c.label + ': ' + c.pts + (c.maxCount ? ' (' + c.maxCount + ' كحد أقصى)' : '')).join('؛ ') + ' — × نسبة ترتيب المؤلف (100/90/80/70/50%)' + (crit.maxPts ? ' — سقف ' + crit.maxPts : '');
      case 'items': return crit.opts.map(o => o.label + ': ' + o.pts).join('؛ ') + ((crit.flags || []).length ? ' — ' + crit.flags.map(f => f.label + ' +' + f.pts).join('؛ ') : '');
      case 'scale': return 'من 0 إلى ' + crit.max;
      case 'check': return crit.pts + ' ن';
    }
    return '';
  }
  function viewGrids(id) {
    const g = S.gridById(id) || D.GRIDS[0];
    let h = topbar('شبكات التقييم الملحقة بالقرار', `<button class="btn" data-act="print-blank" data-g="${g.id}">🖶 طباعة سلم فارغ</button><button class="btn" data-act="print-grid-ref" data-g="${g.id}">🖶 طباعة الشبكة</button>`);
    h += `<div class="card"><label class="f"><span>الشبكة</span><select id="gsel">${gridOptions(g.id)}</select></label></div>`;
    h += gridRefHTML(g);
    main.innerHTML = h;
    document.getElementById('gsel').addEventListener('change', e => { location.hash = '#grids/' + e.target.value; });
  }
  function gridRefHTML(g, printMode) {
    const cls = printMode ? 'p' : 't ref-tbl';
    let h = `<div class="${printMode ? '' : 'card'}"><h2>${esc(g.code + ' — ' + g.title)}</h2><p class="small muted">${esc(g.population)} — ${esc(g.subtitle)}</p>
      <p class="small">أصناف الحركية: ${g.programs.map(p => esc(D.PROGRAMS[p].label + ' (' + D.PROGRAMS[p].min + '–' + D.PROGRAMS[p].max + ' يوما)')).join('، ')}</p>`;
    if (g.criteria.length) {
      h += `<div class="tbl-wrap"><table class="${cls}"><thead><tr><th>المعيار</th><th>طريقة التنقيط</th><th class="num">الحد الأقصى</th></tr></thead><tbody>`;
      let sec = null;
      for (const c of g.criteria) {
        if (c.section !== sec) { sec = c.section; h += `<tr class="p-sec"><td colspan="3"><b>${esc(sec)}</b></td></tr>`; }
        const m = S.maxOfCriterion(c, g);
        h += `<tr><td>${esc(c.label)}${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ''}</td><td class="small">${esc(critRuleDesc(c, g))}</td><td class="num">${m == null ? 'غير مسقف' : fmt(m)}</td></tr>`;
      }
      h += `</tbody></table></div>`;
    }
    h += `<h3>الوثائق المطلوبة (حسب الرتبة)</h3><ul class="small">${[...new Set((g.ranks.length ? g.ranks : [{ id: '' }]).flatMap(r => g.programs.flatMap(p => D.requiredDocs(g, r.id, p))))].map(k => `<li>${esc(D.DOCS[k])}</li>`).join('')}</ul>
      <h3>ملاحظات</h3><ul class="small">${g.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    return h;
  }

  /* ================= ملخص القرار ================= */
  function viewDecree() {
    const arts = [
      ['الفصل الأول: أحكام عامة', [
        ['المادة 1', 'تطبيقا للمادة 40 من المرسوم الرئاسي رقم 14-196، يهدف القرار إلى تحديد معايير تطبيق المواد 36 و37 و38 و39 منه.'],
        ['المادة 2', 'تنظم الحركية قصيرة المدى في مجالات الامتياز التي تتطلب استخدام تجهيزات كبرى وأجهزة عالية الأداء خارج البلد، أو أعمال الخبرة والأعمال التجريبية وأخذ العينات واستخدام المواد النادرة، أو في إطار الاتفاقيات (عروض التكوين المشتركة الدولية ومشاريع البحث المتطورة)، وبشكل استثنائي الإقامة لمرئية أكبر، وبعض المجالات المبتكرة في العلوم الاجتماعية والإنسانية، واكتساب مهارات لغوية لاسيما الإنجليزية.'],
        ['المادة 3', 'ينشأ برنامج خاص في إطار تداريب تحسين المستوى تحدد فيه مجالات التكوين وشروط الترشح وملف العودة.'],
        ['المادة 4', 'أهداف البرنامج: التكوين في مجالات الامتياز، ترقية النشر الدولي، المرئية الدولية، الحركية والتوأمة، دعم خطة التطوير، الابتكار، الحوكمة، التعليم بالإنجليزية، إتقان التقنيات وصيانة المعدات، المنهجية والبيداغوجيا.'],
        ['المادة 5', '90% لتربصات تحسين المستوى (80% للأساتذة الباحثين والاستشفائيين والباحثين الدائمين في البرنامج الخاص؛ 10% للمستخدمين الإداريين والتقنيين) و10% للإقامات العلمية والتظاهرات المفهرسة في WOS وتربصات المحضرين للدكتوراه وطلبة الدكتوراه (من التسجيل الثاني) والإشراف المشترك وماستر 2.'],
        ['المادة 6', 'يمكن تعديل الحصص استثنائيا بعد موافقة الهيئة العلمية مع إعلام الإدارة المركزية بالمبررات.'],
        ['المادة 7', 'يتم التكوين خلال السنة المالية ولا يمكن تأجيله إلا للضرورة أو القوة القاهرة بعد موافقة مدير المؤسسة مع إيفاد الإدارة المركزية بالمبررات.'],
        ['المادة 8', 'يعد مخطط الحركية الدولية وفق خطة عمل الحكومة وتتكفل كل مؤسسة بتحديد احتياجاتها حسب ميزانية محددة بالأهداف والوثائق الثبوتية.'],
        ['المادة 9', 'يتم الإعلان عن افتتاح دورات الاستفادة مع بداية كل سنة مالية عبر منصة رقمية.'],
        ['المادة 10', 'تمنح للمستفيدين منحة تربص طبقا للتنظيم؛ ويتكفل بطلبة الدكتوراه غير الأجراء وطلبة ماستر 2 من قبل مؤسسات تسجيلهم.'],
        ['المادة 11', 'لا يمكن الاستفادة إلا مرة واحدة برسم نفس السنة المالية، ويستثنى: المشاركة في تظاهرة علمية واحدة مفهرسة في WOS، والإقامات في إطار نشاطات المشاريع الدولية غير الممولة من الجزائر، أو التشاور لإبرام اتفاقيات بعد استهلاك التربص.']
      ]],
      ['الفصل الثاني: أصناف الحركية قصيرة المدى (المادتان 12 و13)', [
        ['تداريب البرنامج الخاص', 'من 15 إلى 30 يوما — الأساتذة الباحثون والاستشفائيون والباحثون الدائمون والمستخدمون الإداريون والتقنيون المرسمون الحائزون على شهادة جامعية — حصرا حسب البرنامج المسطر في إطار الاتفاقيات.'],
        ['تداريب تحسين المستوى', 'من 15 إلى 30 يوما — الأساتذة والباحثون الذين يحضرون الدكتوراه؛ طلبة الدكتوراه غير الأجراء ابتداء من التسجيل الثاني (الأولوية للحائزين على نجوم)؛ المستخدمون الإداريون والتقنيون.'],
        ['تداريب لا تتعدى 5 أشهر و29 يوما', 'طلبة ماستر 2 في التكوين المشترك الدولي، وطلبة الدكتوراه في الإشراف المشترك الدولي.'],
        ['الإقامات العلمية ذات المستوى العالي', 'من 7 إلى 15 يوما — الأساتذة المميزون والأساتذة والمحاضرون "أ" ومدراء البحث وأساتذة البحث "أ"، والمحاضرون "ب" وأساتذة البحث "ب" لتحضير التأهيل.'],
        ['التظاهرات العلمية الدولية المصنفة والمفهرسة في WOS', 'لا تتجاوز 7 أيام — جميع الرتب وطلبة الدكتوراه (الأولوية للحائزين على نجوم). لا يسمح بالحركية من الصنف البيبليوغرافي إلا لمراكز التوثيق وقواعد البيانات المتخصصة.'],
        ['المادة 13', 'لا يمكن بأي حال من الأحوال تقليص مدة الحركية إلى مدة تقل عن الحد الأدنى.']
      ]],
      ['الفصل الثالث: كيفيات الانتقاء وما بعد الاستفادة', [
        ['المادة 14', 'يقوم المجلس العلمي بانتقاء الأساتذة والباحثين وطلبة الدكتوراه (بما فيهم الإشراف المشترك)، وتقوم لجان الانتقاء بانتقاء المستخدمين الإداريين والتقنيين، وفقا لشبكات التقييم، باستثناء طلبة ماستر 2؛ من بين المترشحين الحاملين للجنسية الجزائرية المستوفين للوثائق المطلوبة.'],
        ['المادة 15', 'تنشأ لجان انتقاء المستخدمين الإداريين والتقنيين بمقرر من مدير المؤسسة، وتتكون من ممثلين عن الإدارة وممثلين عن المستخدمين بالتساوي.'],
        ['المادة 16', 'بعد العودة: تقرير التربص مؤشر عليه من الهيئة المستقبلة (أو موقع من المستفيد للإقامة)، شهادة المشاركة للتظاهرات، ونسخة من جواز السفر مع ختم شرطة الحدود (PAF).'],
        ['المادة 17', 'تقوم الهيئات العلمية بتقييم جميع التقارير بعد الرجوع.'],
        ['المادة 18', 'يتعين على كل مستفيد تقديم عرض أو محاضرة حول النتائج المحققة أمام هيئة التدريس أو المخبر أو الباحثين أو المستخدمين.']
      ]],
      ['الفصل الرابع: أحكام ختامية', [
        ['المادة 19', 'تتخذ المؤسسات الإجراءات المقررة في حق المستفيدين الذين لم يوفوا بالتزاماتهم.'],
        ['المادة 20', 'تلغى جميع الأحكام المخالفة لاسيما القرار رقم 255 المؤرخ في 25 فيفري 2024.'],
        ['المادة 21', 'يكلف الأمين العام ومدير التعاون والتبادل الجامعي ومدراء المؤسسات بتنفيذ القرار.']
      ]]
    ];
    let h = topbar('ملخص القرار رقم 345 المؤرخ في 09 مارس 2026');
    h += `<div class="alert info small">ملخص عملي لتسهيل الرجوع إلى الأحكام. النص الرسمي هو المرجع في جميع الحالات.</div>`;
    for (const [ch, list] of arts) {
      h += `<div class="card"><h2>${esc(ch)}</h2>${list.map(([t, x]) => `<details class="art" open><summary>${esc(t)}</summary><p style="margin:6px 0 0">${esc(x)}</p></details>`).join('')}</div>`;
    }
    main.innerHTML = h;
  }

  /* ================= الإعدادات ================= */
  function viewSettings() {
    const st = P();
    const sText = (k, l, t) => `<label class="f"><span>${l}</span><input type="${t || 'text'}" data-set="${k}" value="${esc(st[k] || '')}"></label>`;
    let h = topbar('الإعدادات والنسخ الاحتياطي');
    h += `<div class="card"><h2>المؤسسة</h2><div class="grid2">
      ${sText('institution', 'المؤسسة الجامعية / مركز البحث')}${sText('faculty', 'الكلية / المعهد')}
      ${sText('vdName', 'اسم نائب العميد / رئيس القسم المساعد')}${sText('vdTitle', 'الصفة')}
      ${sText('councilName', 'الهيئة المكلفة بالانتقاء (تظهر في المحاضر)')}${sText('academicYear', 'السنة الجامعية')}</div></div>
      <div class="card"><h2>لجنة الانتقاء</h2><p class="small muted">اسم عضو في كل سطر (اللقب ثم الاسم). يُرفض آليا كل مترشح يطابق اسمه أحد الأعضاء.</p>
      <textarea data-set="committee" rows="5">${esc((st.committee || []).join('\n'))}</textarea></div>
      <div class="card"><h2>الترتيب</h2>
      <label class="f"><span>أولوية طلبة الدكتوراه الحائزين على نجوم</span><select data-set="starsPriority">
        <option value="tie" ${st.starsPriority !== 'absolute' ? 'selected' : ''}>معيار فاصل عند تساوي المجموع</option>
        <option value="absolute" ${st.starsPriority === 'absolute' ? 'selected' : ''}>أولوية مطلقة (قبل غير الحائزين)</option></select></label></div>
      <div class="card"><h2>البيانات</h2>
      <p class="small muted">تحفظ البيانات آليا على هذا الجهاز. ننصح بتصدير نسخة احتياطية بانتظام، وهي أيضا وسيلة نقل البيانات إلى جهاز آخر.</p>
      <div class="btns"><button class="btn primary" data-act="backup">تصدير نسخة احتياطية (JSON)</button><button class="btn" data-act="restore">استرجاع نسخة</button>
      <button class="btn" data-act="demo">إضافة بيانات تجريبية</button><button class="btn danger" data-act="reset">حذف كل البيانات</button></div>
      <p class="small muted">عدد الملفات المخزنة (كل السنوات): ${state.candidates.length}</p></div>`;
    main.innerHTML = h;
  }

  function backup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    download('tarabbusat-backup-' + new Date().toISOString().slice(0, 10) + '.json', blob);
  }
  function restore(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || !Array.isArray(s.candidates)) throw new Error('bad');
        confirmBox(`استبدال البيانات الحالية بالنسخة (${s.candidates.length} ملف)؟`, () => {
          state = { version: 1, settings: Object.assign(defaults().settings, s.settings || {}), candidates: s.candidates };
          save(true); renderFy(); toast('تم الاسترجاع'); route();
        }, 'استرجاع');
      } catch (e) { toast('ملف غير صالح'); }
    };
    r.readAsText(file);
  }

  /* ================= Excel ================= */
  function wbRtl(wb) { wb.Workbook = wb.Workbook || {}; wb.Workbook.Views = [{ RTL: true }]; return wb; }
  function sheetName(s, used) {
    let n = s.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 28).trim() || 'ورقة';
    let k = n, i = 2; while (used.has(k)) k = n.slice(0, 25) + ' ' + i++;
    used.add(k); return k;
  }
  function rowObj(r, i) {
    const c = r.cand, g = S.gridById(c.gridId);
    return {
      'الترتيب': r.position || '', 'اللقب': c.surname || '', 'الاسم': c.name || '', 'الشبكة': g ? g.code : '', 'الرتبة': rankLabel(c),
      'القسم': c.department || '', 'التخصص': c.specialty || '', 'صنف الحركية': D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '',
      'البلد': c.country || '', 'الهيئة المستقبلة': c.host || '', 'من': c.startDate || '', 'إلى': c.endDate || '',
      'المجموع': g && g.noScoring ? '' : r.score, 'الحالة': (STATUS[r.status] || [''])[0],
      'أسباب عدم الأهلية / الرفض': r.elig.reasons.concat(c.rejectReason ? [c.rejectReason] : []).join(' ؛ ')
    };
  }
  function exportRanking() {
    const groups = rankingGroups();
    if (!groups.length) return toast('لا توجد بيانات');
    const wb = wbRtl(XLSX.utils.book_new()), used = new Set();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups.flatMap(g => g.rows.map(rowObj)).map((o, i) => Object.assign({ '#': i + 1 }, o))), sheetName('الكل', used));
    for (const g of groups) {
      const lbl = groupLabel(g.key);
      const ws = XLSX.utils.aoa_to_sheet([[lbl.join(' — ')], []]);
      XLSX.utils.sheet_add_json(ws, g.rows.map(rowObj), { origin: 'A3' });
      // تفاصيل المعايير
      const grid = S.gridById(g.key.split('|')[0]);
      if (grid && grid.criteria.length) {
        const det = g.rows.map(r => { const o = { 'اللقب والاسم': fullName(r.cand) }; r.breakdown.forEach(b => { o[b.label.slice(0, 60)] = b.pts; }); o['المجموع'] = r.score; return o; });
        XLSX.utils.sheet_add_aoa(ws, [[], ['تفصيل النقاط']], { origin: -1 });
        XLSX.utils.sheet_add_json(ws, det, { origin: -1 });
      }
      ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 26 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, sheetName(lbl.slice(1).join(' ') || lbl[0], used));
    }
    XLSX.writeFile(wb, 'ترتيب-المترشحين-' + P().fy + '.xlsx');
  }
  function exportList() {
    const rows = rankingAll().flatMap(g => g.rows);
    if (!rows.length) return toast('لا توجد بيانات');
    const wb = wbRtl(XLSX.utils.book_new());
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(r => Object.assign(rowObj(r), {
      'البريد': r.cand.email || '', 'الهاتف': r.cand.phone || '', 'المخبر': r.cand.lab || '', 'القرار': DEC_LABELS[r.cand.decision || 'auto']
    }))), 'الملفات');
    XLSX.writeFile(wb, 'ملفات-المترشحين-' + P().fy + '.xlsx');
  }
  const IMPORT_COLS = ['اللقب', 'الاسم', 'رمز الشبكة', 'الرتبة', 'القسم', 'التخصص', 'صنف الحركية', 'البلد', 'الهيئة المستقبلة', 'من', 'إلى', 'البريد', 'الهاتف'];
  function exportTemplate() {
    const wb = wbRtl(XLSX.utils.book_new());
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLS, ['بن علي', 'محمد', 'ج-1', 'أستاذ محاضر قسم "أ"', 'العلوم السياسية', 'علاقات دولية', 'conf', 'فرنسا', 'جامعة ...', '2026-05-10', '2026-05-14', '', '']]);
    ws['!cols'] = IMPORT_COLS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'المترشحون');
    const ref = [['رمز الشبكة', 'الشبكة', 'الرتب المقبولة']].concat(D.GRIDS.map(g => [g.code, g.title, g.ranks.map(r => r.label).join(' | ')]));
    ref.push([], ['صنف الحركية', 'الرمز']); Object.keys(D.PROGRAMS).forEach(k => ref.push([D.PROGRAMS[k].label, k]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ref), 'مرجع');
    XLSX.writeFile(wb, 'نموذج-استيراد-المترشحين.xlsx');
  }
  function importXlsx(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const wb = XLSX.read(new Uint8Array(r.result), { type: 'array', cellDates: false });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
        let n = 0;
        const norm = s => String(s || '').replace(/[\s"«»]/g, '');
        const toDate = v => { v = String(v || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
        for (const row of rows) {
          if (!row['اللقب'] && !row['الاسم']) continue;
          const g = D.GRIDS.find(x => x.code === String(row['رمز الشبكة']).trim() || x.id === String(row['رمز الشبكة']).trim());
          const c = blankCandidate(g ? g.id : '');
          c.surname = String(row['اللقب']).trim(); c.name = String(row['الاسم']).trim();
          if (g && row['الرتبة']) { const rk = g.ranks.find(x => norm(x.label) === norm(row['الرتبة']) || norm(x.label).includes(norm(row['الرتبة']))); if (rk) c.rank = rk.id; else c.rankText = row['الرتبة']; }
          c.department = row['القسم']; c.specialty = row['التخصص'];
          const pk = String(row['صنف الحركية'] || '').trim();
          if (D.PROGRAMS[pk]) c.program = pk; else { const f = Object.keys(D.PROGRAMS).find(k => D.PROGRAMS[k].label === pk); if (f) c.program = f; }
          c.country = row['البلد']; c.host = row['الهيئة المستقبلة']; c.startDate = toDate(row['من']); c.endDate = toDate(row['إلى']);
          c.email = row['البريد']; c.phone = row['الهاتف'];
          state.candidates.push(c); n++;
        }
        save(true); toast('تم استيراد ' + n + ' ملف'); location.hash = '#candidates'; route();
      } catch (e) { console.error(e); toast('تعذر قراءة الملف'); }
    };
    r.readAsArrayBuffer(file);
  }

  /* ================= الطباعة ================= */
  function printHead(lines) {
    const st = P();
    return `<div class="p-head"><div class="rep">الجمهورية الجزائرية الديمقراطية الشعبية</div><div class="min">وزارة التعليم العالي والبحث العلمي</div>
      ${st.institution ? `<div>${esc(st.institution)}</div>` : ''}${st.faculty ? `<div>${esc(st.faculty)}</div>` : ''}
      ${st.vdTitle ? `<div class="small">${esc(st.vdTitle)}</div>` : ''}</div>${lines.map(l => `<div class="p-title">${l}</div>`).join('')}`;
  }
  function doPrint(html) {
    document.getElementById('print').innerHTML = html;
    setTimeout(() => window.print(), 50);
  }
  function sheetHTML(c, blank) {
    const g = S.gridById(c.gridId);
    if (!g) return `<div class="p-title">${esc(fullName(c))}: لم تحدد الشبكة</div>`;
    const sc = S.computeScore(c), el = S.checkEligibility(c, P()), pos = blank ? null : positionOf(c);
    const v = x => blank ? '' : esc(x || '');
    let h = printHead([`سلم تقييم ملحق بالقرار رقم 345 المؤرخ في 09 مارس 2026`, `الذي يحدد معايير الانتقاء للقبول في برنامج تحسين المستوى في الخارج`, `(${esc(g.title)})`, `<span class="small">${esc(g.subtitle)}</span>`]);
    h += `<table class="p"><tr><td>اللقب والاسم: <b>${blank ? '' : esc(fullName(c))}</b></td><td>الرتبة / الصنف: ${blank ? '' : esc(rankLabel(c))}</td></tr>
      <tr><td>تاريخ ومكان الازدياد: ${v(c.birthDate)} ${v(c.birthPlace)}</td><td>القسم / الوحدة: ${v(c.department)}</td></tr>
      <tr><td>التخصص: ${v(c.specialty)}</td><td>المخبر / مشروع البحث: ${v(c.lab)}</td></tr>
      <tr><td>صنف الحركية: ${blank ? '' : esc(D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '')}</td><td>الوجهة والفترة: ${blank ? '' : esc([c.country, c.host].filter(Boolean).join(' — ') + (c.startDate ? ' (' + c.startDate + ' ← ' + (c.endDate || '') + ')' : ''))}</td></tr></table>`;
    if (g.criteria.length) {
      h += `<table class="p"><thead><tr><th>المعيار</th><th>التفاصيل</th><th class="num">الحد الأقصى</th><th class="num">النقطة</th></tr></thead><tbody>`;
      let sec = null;
      sc.breakdown.forEach((b, i) => {
        if (b.section !== sec) { sec = b.section; h += `<tr class="p-sec"><td colspan="4">${esc(sec)}</td></tr>`; }
        const crit = g.criteria[i];
        h += `<tr><td>${esc(b.label)}</td><td class="small">${blank ? esc(critRuleDesc(crit, g)) : esc(b.detail.join(' ؛ '))}</td><td class="num">${b.max == null ? '—' : fmt(b.max)}</td><td class="num"><b>${blank ? '' : fmt(b.pts)}</b></td></tr>`;
      });
      h += `<tr><td colspan="3"><b>مجموع النقاط</b></td><td class="num"><b>${blank ? '' : fmt(sc.total)}</b></td></tr></tbody></table>`;
    }
    h += `<table class="p"><tr><td>ترتيب المترشح: <b>${pos && pos.pos ? pos.pos + ' / ' + pos.of : '...... / ......'}</b> (عدد المترشحين)</td>
      <td>رأي ${esc(g.signer)}: <b>${blank ? 'مقبول / مرفوض' : (pos && pos.status === 'accepted' ? 'مقبول' : pos && (pos.status === 'rejected' || pos.status === 'ineligible') ? 'مرفوض' : pos && pos.status === 'reserve' ? 'قائمة احتياط' : '......')}</b></td></tr>
      <tr><td colspan="2">أسباب الرفض (يجب أن يكون الرفض مبررا): ${blank ? '' : esc(el.reasons.concat(c.decision === 'rejected' && c.rejectReason ? [c.rejectReason] : []).join(' ؛ '))}</td></tr></table>`;
    h += `<div class="small"><b>ملاحظات هامة:</b><ul>${g.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    h += `<div class="p-sign"><div>حرر بتاريخ: ${blank ? '..................' : esc(c.decisionDate || new Date().toISOString().slice(0, 10))}</div><div>${esc(g.signer)}<br><br>..................</div></div>`;
    return h;
  }
  function printSheets(list, blank) {
    list = list.filter(Boolean);
    if (!list.length) return toast('لا توجد ملفات');
    doPrint(list.map(c => sheetHTML(c, blank)).join('<div class="page-break"></div>'));
  }
  function printRanking() {
    const groups = rankingGroups();
    if (!groups.length) return toast('لا توجد بيانات');
    const st = P();
    let h = printHead([`محضر ترتيب المترشحين لبرنامج الحركية قصيرة المدى في الخارج`, `السنة المالية ${esc(st.fy)} — السنة الجامعية ${esc(st.academicYear || '')}`, `<span class="small">طبقا للقرار رقم 345 المؤرخ في 09 مارس 2026</span>`]);
    groups.forEach((grp, gi) => {
      const lbl = groupLabel(grp.key), g = S.gridById(grp.key.split('|')[0]);
      h += `<h3 style="margin:14px 0 4px">${esc(lbl[0])}</h3><div class="small">${esc(lbl.slice(1).join(' · '))} — عدد المترشحين: ${grp.count}، المؤهلون: ${grp.eligible}${grp.seats != null ? '، المناصب: ' + grp.seats : ''}</div>
        <table class="p"><thead><tr><th class="num">الترتيب</th><th>اللقب والاسم</th><th>الرتبة</th><th>القسم / التخصص</th><th>الوجهة</th><th class="num">المجموع</th><th>القرار</th><th>الملاحظات</th></tr></thead><tbody>`;
      for (const r of grp.rows) {
        const c = r.cand;
        h += `<tr><td class="num">${r.position || '—'}</td><td>${esc(fullName(c))}</td><td>${esc(rankLabel(c))}</td><td>${esc(c.department || '')} ${c.specialty ? '/ ' + esc(c.specialty) : ''}</td>
          <td>${esc([c.country, c.host].filter(Boolean).join(' — '))}</td><td class="num">${g && g.noScoring ? '—' : fmt(r.score)}</td><td>${(STATUS[r.status] || [''])[0]}</td>
          <td class="small">${esc(r.elig.reasons.concat(c.rejectReason ? [c.rejectReason] : []).join(' ؛ '))}${r.tie ? ' (تساوٍ في المجموع)' : ''}</td></tr>`;
      }
      h += `</tbody></table>`;
    });
    h += `<div class="p-sign"><div>حرر بتاريخ: ${new Date().toISOString().slice(0, 10)}</div><div>${esc(st.councilName || 'رئيس المجلس العلمي')}<br><br>..................</div></div>`;
    if ((st.committee || []).length) h += `<div class="small" style="margin-top:20px"><b>أعضاء اللجنة:</b> ${st.committee.map(esc).join('، ')}</div>`;
    doPrint(h);
  }
  function printFollowup() {
    const rows = followRows();
    if (!rows.length) return toast('لا توجد ملفات مقبولة');
    let h = printHead([`قائمة متابعة المستفيدين بعد العودة — السنة المالية ${esc(P().fy)}`, `<span class="small">المواد 16 إلى 19 من القرار رقم 345</span>`]);
    h += `<table class="p"><thead><tr><th>#</th><th>اللقب والاسم</th><th>الصنف والوجهة</th><th>الفترة</th><th>الوثائق المودعة</th><th>الوثائق الناقصة</th><th>الحالة</th></tr></thead><tbody>`;
    rows.forEach((f, i) => {
      const c = f.cand, fu = c.followup || {};
      const missing = f.req.filter(k => !(fu.docs && fu.docs[k])).map(k => D.RETURN_DOC_LABELS[k].split('(')[0].trim());
      h += `<tr><td class="num">${i + 1}</td><td>${esc(fullName(c))}</td><td>${esc(D.PROGRAMS[c.program] ? D.PROGRAMS[c.program].label : '')}<br>${esc([c.country, c.host].filter(Boolean).join(' — '))}</td>
        <td>${esc(c.startDate || '')} ← ${esc(c.endDate || '')}</td><td class="num">${f.done}/${f.req.length}</td><td class="small">${esc(missing.join('؛ '))}</td><td>${FSTATE[f.state][0]}</td></tr>`;
    });
    doPrint(h + `</tbody></table>`);
  }
  function printGridRef(id) {
    const g = S.gridById(id);
    doPrint(printHead(['شبكة التقييم الملحقة بالقرار رقم 345 المؤرخ في 09 مارس 2026']) + gridRefHTML(g, true));
  }

  /* ================= بيانات تجريبية ================= */
  function loadDemo() {
    const fy = P().fy;
    const mk = (o) => Object.assign(blankCandidate(o.gridId), { fy, docs: {} }, o);
    const fillDocs = c => { D.requiredDocs(S.gridById(c.gridId), c.rank, c.program).forEach(k => { c.docs[k] = true; }); return c; };
    const list = [
      mk({ surname: 'بوزيد', name: 'سارة', gridId: 'U_CONF', rank: 'mca', program: 'conf', department: 'العلوم السياسية', specialty: 'علاقات دولية', country: 'إسبانيا', host: 'Universidad de Granada', startDate: fy + '-05-12', endDate: fy + '-05-16',
        scores: { prev: { n: 1 }, pubs: { entries: [{ cat: 'A', pos: 1, aff: true, title: 'Energy security in the Mediterranean' }, { cat: 'C', pos: 2, aff: true }] }, comms: { int_cls: 1, nat: 3 }, students: { master: 4, lic: 6 }, review: { B: 3 }, councils: { member: 2 } } }),
      mk({ surname: 'حمدي', name: 'كريم', gridId: 'U_CONF', rank: 'pr', program: 'conf', department: 'العلوم السياسية', specialty: 'دراسات أمنية', country: 'إيطاليا', host: 'Sapienza', startDate: fy + '-06-02', endDate: fy + '-06-06',
        scores: { prev: { n: 2 }, pubs: { entries: [{ cat: 'Ap', pos: 2, aff: true }] }, phd: { sup: 1, jury: 3 }, projects: { nat: 1 }, senior: { v: true } } }),
      mk({ surname: 'مرابط', name: 'ليلى', gridId: 'U_CONF', rank: 'phd', program: 'conf', regCount: 3, stars: true, department: 'العلوم السياسية', specialty: 'علاقات دولية', country: 'تركيا', host: 'Ankara University', startDate: fy + '-04-20', endDate: fy + '-04-23',
        scores: { prev: { n: 0 }, pubs: { entries: [{ cat: 'B', pos: 1, aff: true }] }, comms: { int_idx: 2, nat: 2 } } }),
      mk({ surname: 'قاسمي', name: 'يوسف', gridId: 'U_CONF', rank: 'mcb', program: 'conf', department: 'الحقوق', specialty: 'قانون جنائي', country: 'فرنسا', host: 'Université Paris 1', startDate: fy + '-09-08', endDate: fy + '-09-20',
        scores: { prev: { n: 0 }, comms: { int_non: 2 } } }),
      mk({ surname: 'بلقاسم', name: 'نوال', gridId: 'U_SEJ', rank: 'mcb', program: 'sejour', department: 'الحقوق', specialty: 'قانون دولي', country: 'كندا', host: 'Université Laval', startDate: fy + '-07-01', endDate: fy + '-07-12',
        scores: { rank: { bonus: true }, prev: { n: 0 }, pubs: { entries: [{ cat: 'A', pos: 1, aff: true }, { cat: 'B', pos: 3, aff: true }] }, polycop: { entries: [{ opt: 'p', flags: { en: true, taught: true } }] }, citations: { c: 14 } } }),
      mk({ surname: 'زروقي', name: 'عمر', gridId: 'U_SEJ', rank: 'pr', program: 'sejour', department: 'العلوم السياسية', specialty: 'إدارة عامة', country: 'ماليزيا', host: 'UKM', startDate: fy + '-10-04', endDate: fy + '-10-15',
        scores: { prev: { n: 1 }, pubs: { entries: [{ cat: 'Ap', pos: 1, aff: true }] }, phd: { sup: 2 }, book: { entries: [{ opt: 'b', flags: { en: false } }] } } }),
      mk({ surname: 'سعيدي', name: 'أمينة', gridId: 'U_STAGE', rank: 'phd', program: 'stage', regCount: 3, stars: false, department: 'العلوم السياسية', specialty: 'علاقات دولية', country: 'البرتغال', host: 'Universidade de Lisboa', startDate: fy + '-03-01', endDate: fy + '-03-28',
        scores: { reg: { y: 3 }, prev: { n: 0 }, comms_intl: { cls: 1, idx: 2 }, comms_nat: { nat: 2 } } }),
      mk({ surname: 'عيساوي', name: 'رضا', gridId: 'U_STAGE', rank: 'phd', program: 'stage', regCount: 1, department: 'الحقوق', specialty: 'قانون أعمال', country: 'تونس', host: 'Université de Tunis', startDate: fy + '-03-05', endDate: fy + '-03-25',
        scores: { reg: { y: 1 } } }),
      mk({ surname: 'منصوري', name: 'هدى', gridId: 'U_STAGE', rank: 'maa', program: 'stage', regCount: 4, department: 'العلوم السياسية', specialty: 'دراسات أمنية', country: 'بلجيكا', host: 'ULB', startDate: fy + '-11-02', endDate: fy + '-11-25',
        scores: { reg: { y: 4 }, prev: { n: 1 }, pubs: { entries: [{ cat: 'C', pos: 1, aff: true }] }, elearn: { entries: [{ opt: 'cours', flags: {} }, { opt: 'td', flags: {} }] }, students: { lic: 4 } } }),
      mk({ surname: 'بن عمر', name: 'فاطمة', gridId: 'U_ATS', rank: 'c13', program: 'stage', department: 'مصلحة ما بعد التدرج', specialty: 'إدارة', degree: 'ماستر', country: 'فرنسا', host: 'Université de Lyon', startDate: fy + '-06-08', endDate: fy + '-06-22',
        scores: { seniority: { y: 12 }, lang: { dest: 1, en: 1 }, eval_att: { v: 3 }, eval_comp: { v: 2.5 }, eval_init: { v: 2 }, eval_avail: { v: 3 }, support: { c: 1 } } }),
      mk({ surname: 'لعريبي', name: 'سمير', gridId: 'U_ATS', rank: 'c11', program: 'stage', department: 'مصلحة العلاقات الخارجية', specialty: 'إعلام آلي', degree: 'ليسانس', country: 'إسبانيا', host: 'Universidad de Alicante', startDate: fy + '-06-08', endDate: fy + '-06-20',
        scores: { seniority: { y: 7 }, lang: { dest: 1 }, eval_att: { v: 3 }, eval_comp: { v: 3 }, eval_init: { v: 3 }, eval_avail: { v: 2 }, prev_stays: { n: 1 } } })
    ];
    list.forEach(c => { fillDocs(c); });
    list[3].docs.conf_paper = false; // ملف ناقص للتوضيح
    state.candidates.push(...list);
    save(true); renderFy(); toast('تمت إضافة ' + list.length + ' ملفات تجريبية');
    location.hash = '#candidates'; route();
  }

  /* ================= البدء ================= */
  renderFy();
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
