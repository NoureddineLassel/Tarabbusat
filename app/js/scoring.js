/* محرك التنقيط والأهلية والترتيب وتحليل الوثائق */
(function (global) {
  'use strict';
  const D = global.GRIDS_DATA;
  const T = (k, v) => global.I18N ? global.I18N.t(k, v) : k;
  const G = s => global.I18N ? global.I18N.g(s) : s;

  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const today = () => new Date().toISOString().slice(0, 10);

  function gridById(id) { return D.GRIDS.find(g => g.id === id) || null; }
  function rankOf(grid, rankId) { return grid && grid.ranks ? grid.ranks.find(r => r.id === rankId) || null : null; }
  function authorWeight(pos) { const a = D.AUTHOR_WEIGHTS.find(x => x.v === +pos); return a ? a.w : 1; }

  /* عمل مستبعد: يدويا، أو مؤرخ قبل تاريخ غلق منصة آخر استفادة */
  function entryDate(e) { return (e && (e.date || (e.ev && e.ev.date))) || ''; }
  function isBeforeCutoff(e, cand) { const d = entryDate(e); return !!(cand && cand.cutoffDate && d && d < cand.cutoffDate); }
  function isExcluded(e, cand) { return !!(e.excl || (isBeforeCutoff(e, cand) && !e.keep)); }

  /* ----- تنقيط معيار واحد ----- */
  function scoreCriterion(crit, input, cand, grid) {
    input = input || {};
    const detail = [];
    let pts = 0;
    switch (crit.type) {
      case 'rank': {
        const rk = rankOf(grid, cand.rank);
        pts = rk ? rk.pts : 0;
        if (rk) detail.push(G(rk.label) + ': ' + rk.pts);
        if (crit.bonus && input.bonus && rk && (!crit.bonus.onlyRanks || crit.bonus.onlyRanks.includes(rk.id))) {
          pts += crit.bonus.pts; detail.push(T('d.hab') + ' +' + crit.bonus.pts);
        }
        break;
      }
      case 'prev': {
        const n = Math.max(0, num(input.n));
        pts = crit.base - n;
        detail.push(crit.base + ' - ' + n);
        break;
      }
      case 'prevN': {
        const N = num(input.N) || crit.options[0];
        const n = Math.max(0, num(input.n));
        pts = Math.max(0, Math.min(N - 1, N - n));
        detail.push(N + ' - ' + n + ' (' + T('d.max', { n: N - 1 }) + ')');
        break;
      }
      case 'lines': {
        let remaining = crit.maxCount != null ? crit.maxCount : Infinity;
        const order = crit.lines.slice().sort((a, b) => b.pts - a.pts);
        const lineRes = {};
        for (const l of order) {
          let c = Math.max(0, num(input[l.id]));
          if (l.maxCount != null) c = Math.min(c, l.maxCount);
          if (l.pts > 0) { c = Math.min(c, remaining); remaining -= c; }
          let p = c * l.pts;
          if (l.maxPts != null && p > l.maxPts) p = l.maxPts;
          lineRes[l.id] = p;
        }
        for (const l of crit.lines) {
          const raw = num(input[l.id]);
          if (raw) detail.push(G(l.label) + ' × ' + raw + ' = ' + r2(lineRes[l.id]));
          pts += lineRes[l.id];
        }
        break;
      }
      case 'pubs': {
        const entries = Array.isArray(input.entries) ? input.entries : [];
        const byCat = {};
        let excl = 0;
        for (const e of entries) {
          const cat = crit.cats.find(c => c.id === e.cat);
          if (!cat) continue;
          if (isExcluded(e, cand)) { excl++; continue; }
          let v = cat.pts * authorWeight(e.pos);
          if (crit.requireAff && e.aff === false) v = 0;
          (byCat[cat.id] = byCat[cat.id] || []).push(v);
        }
        for (const cat of crit.cats) {
          let vals = (byCat[cat.id] || []).sort((a, b) => b - a);
          if (cat.maxCount != null) vals = vals.slice(0, cat.maxCount);
          let s = vals.reduce((a, b) => a + b, 0);
          if (cat.maxPts != null) s = Math.min(s, cat.maxPts);
          if (vals.length) detail.push(G(cat.label) + ': ' + vals.length + ' → ' + r2(s));
          pts += s;
        }
        if (excl) detail.push(T('d.excluded', { n: excl }));
        break;
      }
      case 'items': {
        const entries = Array.isArray(input.entries) ? input.entries : [];
        let n = 0, excl = 0;
        for (const e of entries) {
          const o = crit.opts.find(x => x.id === e.opt);
          if (!o) continue;
          if (isExcluded(e, cand)) { excl++; continue; }
          let v = o.pts;
          for (const f of crit.flags || []) if (e.flags && e.flags[f.id]) v += f.pts;
          pts += v; n++;
        }
        if (n) detail.push(T('d.works', { n }));
        if (excl) detail.push(T('d.excluded', { n: excl }));
        break;
      }
      case 'scale': pts = Math.min(crit.max, Math.max(0, num(input.v))); break;
      case 'check': pts = input.v ? crit.pts : 0; break;
    }
    if (crit.maxPts != null && pts > crit.maxPts) { pts = crit.maxPts; detail.push(T('d.cap', { n: crit.maxPts })); }
    return { pts: r2(pts), detail };
  }

  function maxOfCriterion(crit, grid) {
    switch (crit.type) {
      case 'rank': return Math.max(0, ...(grid.ranks || []).map(r => r.pts)) + (crit.bonus ? crit.bonus.pts : 0);
      case 'prev': return crit.base;
      case 'prevN': return Math.max(...crit.options) - 1;
      case 'scale': return crit.max;
      case 'check': return crit.pts;
      default: {
        if (crit.maxPts != null) return crit.maxPts;
        if (crit.type === 'lines') {
          let unbounded = false, s = 0;
          for (const l of crit.lines) {
            if (l.pts < 0) continue;
            if (l.maxPts != null) s += l.maxPts;
            else if (l.maxCount != null) s += l.maxCount * l.pts;
            else unbounded = true;
          }
          return unbounded ? null : s;
        }
        if (crit.type === 'pubs') {
          let s = 0;
          for (const c of crit.cats) {
            if (c.maxPts != null) s += c.maxPts;
            else if (c.maxCount != null) s += c.maxCount * c.pts;
            else return null;
          }
          return s;
        }
        return null;
      }
    }
  }

  function computeScore(cand) {
    const grid = gridById(cand.gridId);
    if (!grid) return { total: 0, breakdown: [], grid: null };
    const scores = cand.scores || {};
    const breakdown = grid.criteria.map(c => {
      const res = scoreCriterion(c, scores[c.id], cand, grid);
      return { id: c.id, section: c.section, label: c.label, pts: res.pts, detail: res.detail, max: maxOfCriterion(c, grid) };
    });
    return { total: r2(breakdown.reduce((a, b) => a + b.pts, 0)), breakdown, grid };
  }

  function durationDays(start, end) {
    if (!start || !end) return null;
    const a = new Date(start + 'T00:00:00'), b = new Date(end + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000) + 1;
  }
  function normalizeName(s) { return String(s || '').replace(/[\sً-ٟ]+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim().toLowerCase(); }
  function personKey(c) { return normalizeName((c.surname || '') + ' ' + (c.name || '')); }
  function samePerson(a, b) {
    if (a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()) return true;
    const ka = personKey(a), kb = personKey(b);
    return ka.length > 2 && ka === kb;
  }

  /* ----- تحليل الوثائق المرفقة ----- */
  const TIME_SENSITIVE = ['reg_regular', 'reg_proof', 'reg_master2', 'workplan', 'conf_invitation', 'conf_program', 'conf_paper', 'conf_request'];
  const REG_DOCS = ['reg_regular', 'reg_proof', 'reg_master2'];

  function evidenceOf(cand) {
    const out = [];
    const grid = gridById(cand.gridId);
    for (const [k, ev] of Object.entries(cand.docFiles || {})) if (ev && ev.fileId) out.push({ kind: 'doc', key: k, label: D.DOCS[k] || k, ev });
    if (grid) for (const crit of grid.criteria) {
      const inp = (cand.scores || {})[crit.id] || {};
      (inp.entries || []).forEach((e, i) => { if (e.ev && e.ev.fileId) out.push({ kind: 'entry', crit, idx: i, entry: e, label: crit.label, ev: e.ev }); });
      (inp.ev || []).forEach((ev, i) => { if (ev && ev.fileId) out.push({ kind: 'crit', crit, idx: i, label: crit.label, ev }); });
    }
    return out;
  }

  function analyzeDocs(cand, all) {
    const items = evidenceOf(cand);
    const others = (all || []).filter(o => o.id !== cand.id);
    const idx = {};
    for (const o of others) for (const it of evidenceOf(o)) (idx[it.ev.hash] = idx[it.ev.hash] || []).push({ o, it });
    const seen = {};
    items.forEach(it => { seen[it.ev.hash] = (seen[it.ev.hash] || 0) + 1; });
    const regStart = (+cand.fy - 1) + '-09-01';
    const td = today();
    const counts = { before: 0, reused: 0, dup: 0, oldReg: 0, future: 0, shared: 0 };
    for (const it of items) {
      const f = [];
      const d = it.ev.date || (it.entry && it.entry.date) || '';
      if (d && d > td) { f.push({ k: 'future' }); counts.future++; }
      if (d && cand.cutoffDate && d < cand.cutoffDate && (it.kind !== 'doc' || TIME_SENSITIVE.includes(it.key))) { f.push({ k: 'before', p: { d: cand.cutoffDate } }); counts.before++; }
      if (it.kind === 'doc' && REG_DOCS.includes(it.key) && d && d < regStart) { f.push({ k: 'oldReg', p: { d: regStart } }); counts.oldReg++; }
      if (seen[it.ev.hash] > 1) { f.push({ k: 'dup' }); counts.dup++; }
      const hits = idx[it.ev.hash] || [];
      const mine = hits.filter(h => samePerson(h.o, cand));
      if (mine.length) {
        const fys = [...new Set(mine.map(h => h.o.fy))].sort();
        if (it.kind !== 'doc' || TIME_SENSITIVE.includes(it.key)) { f.push({ k: 'reused', p: { fy: fys.join('، ') } }); counts.reused++; }
      } else if (hits.length && it.kind === 'doc' && it.key !== 'convention' && it.key !== 'convention_cotutelle' && it.key !== 'convention_master') {
        f.push({ k: 'shared', p: { name: hits[0].o.surname || '' } }); counts.shared++;
      }
      it.flags = f;
    }
    return { items, counts };
  }

  /* سوابق الاستفادة المسجلة في البرنامج لنفس الشخص */
  function historyOf(cand, all, acceptedIds) {
    return (all || []).filter(o => o.id !== cand.id && +o.fy < +cand.fy && samePerson(o, cand) && acceptedIds.has(o.id))
      .map(o => ({ fy: o.fy, program: o.program, gridId: o.gridId, id: o.id })).sort((a, b) => b.fy - a.fy);
  }

  /* ----- الأهلية ----- */
  function checkEligibility(cand, settings, all) {
    const reasons = [], warnings = [];
    const grid = gridById(cand.gridId);
    if (!grid) { reasons.push(T('el.noGrid')); return { ok: false, reasons, warnings }; }
    if (cand.algerian === false) reasons.push(T('el.noNat'));
    const rk = rankOf(grid, cand.rank);
    if (grid.ranks.length && !rk) reasons.push(T('el.noRank'));
    const prog = D.PROGRAMS[cand.program];
    if (!prog) warnings.push(T('el.noProgram'));
    else if (!grid.programs.includes(cand.program)) warnings.push(T('el.oddProgram', { p: G(prog.label) }));

    const days = durationDays(cand.startDate, cand.endDate);
    if (prog && days != null) {
      if (days <= 0) reasons.push(T('el.durNeg'));
      else if (days < prog.min) reasons.push(T('el.durMin', { d: days, min: prog.min }));
      else if (days > prog.max) reasons.push(T('el.durMax', { d: days, max: prog.max, art: G(prog.art) }));
    } else if (prog) warnings.push(T('el.noDates'));

    if (cand.fyBenefited) {
      if (cand.program === 'conf') warnings.push(T('el.fyConf'));
      else if (cand.fyException) warnings.push(T('el.fyExc'));
      else reasons.push(T('el.fyOnce'));
    }

    const needsReg = (rk && (rk.student || rk.id === 'maa')) || grid.id === 'R_STAGE';
    if (needsReg && !(rk && rk.id === 'cotutelle')) {
      const fromScore = cand.scores && cand.scores.reg ? num(cand.scores.reg.y) : 0;
      if (Math.max(num(cand.regCount), fromScore) < 2) reasons.push(T('el.reg2'));
    }

    const committee = ((settings && settings.committee) || []).map(normalizeName).filter(Boolean);
    const full = personKey(cand), full2 = normalizeName((cand.name || '') + ' ' + (cand.surname || ''));
    if (cand.isCommitteeMember || (full && (committee.includes(full) || committee.includes(full2)))) reasons.push(T('el.committee'));

    const req = D.requiredDocs(grid, cand.rank, cand.program);
    const has = k => (cand.docs && cand.docs[k]) || (cand.docFiles && cand.docFiles[k] && cand.docFiles[k].fileId);
    const missing = req.filter(k => !has(k));
    if (missing.length) reasons.push(T('el.missing', { list: missing.map(k => G(D.DOCS[k])).join('؛ ') }));

    // تحليل الوثائق
    const an = analyzeDocs(cand, all);
    for (const it of an.items) {
      if (it.kind !== 'doc') continue;
      for (const f of it.flags) {
        if (f.k === 'oldReg' && req.includes(it.key)) reasons.push(T('el.oldReg', { doc: G(it.label) }));
        if (f.k === 'reused') warnings.push(T('el.reusedDoc', { doc: G(it.label), fy: f.p.fy }));
      }
    }
    if (grid) {
      let excl = 0, before = 0;
      for (const crit of grid.criteria) {
        const inp = (cand.scores || {})[crit.id] || {};
        (inp.entries || []).forEach(e => { if (isExcluded(e, cand)) excl++; });
        (inp.ev || []).forEach(ev => { if (ev && ev.date && cand.cutoffDate && ev.date < cand.cutoffDate) before++; });
      }
      if (excl) warnings.push(T('el.excluded', { n: excl }));
      if (before) warnings.push(T('el.evBefore', { n: before }));
    }
    if (an.counts.reused && an.items.some(i => i.kind !== 'doc' && i.flags.some(f => f.k === 'reused'))) warnings.push(T('el.reusedWork'));

    if (grid.id === 'U_STAGE' && cand.reRegistered) warnings.push(T('el.reReg'));
    if (cand.inConvention === false && (grid.id === 'U_ATS' || grid.scope === 'research') && /stage/.test(cand.program || '')) warnings.push(T('el.conv'));

    return { ok: reasons.length === 0, reasons, warnings, days, docs: an };
  }

  /* ----- الترتيب ----- */
  function groupKeyOf(cand, groupBy) {
    const parts = [cand.gridId];
    if (groupBy.includes('faculty')) parts.push('f:' + (cand.facultyId || '—'));
    if (groupBy.includes('rank')) parts.push('r:' + (cand.rank || cand.rankText || '—'));
    if (groupBy.includes('department')) parts.push('d:' + (cand.deptId || (cand.department || '—').trim()));
    if (groupBy.includes('specialty')) parts.push('s:' + (cand.specialty || '—').trim());
    if (groupBy.includes('program')) parts.push('p:' + (cand.program || '—'));
    return parts.join('|');
  }

  function rankCandidates(cands, settings, opts) {
    opts = opts || {};
    const groupBy = opts.groupBy || [];
    const seats = (settings && settings.seats) || {};
    const starsAbsolute = settings && settings.starsPriority === 'absolute';
    const all = opts.all || cands;
    const rows = cands.filter(c => !opts.gridId || c.gridId === opts.gridId).map(c => {
      const sc = computeScore(c);
      const el = checkEligibility(c, settings, all);
      const rk = rankOf(sc.grid, c.rank);
      const prevB = sc.breakdown.find(b => b.id === 'prev');
      return { cand: c, score: sc.total, breakdown: sc.breakdown, elig: el, grid: sc.grid,
        rankPts: rk ? rk.pts : 0, prevPts: prevB ? prevB.pts : 0, key: groupKeyOf(c, groupBy) };
    });
    const groups = {};
    for (const r of rows) (groups[r.key] = groups[r.key] || []).push(r);
    const cmp = (a, b) => {
      const ea = a.cand.decision === 'rejected' || !a.elig.ok ? 1 : 0;
      const eb = b.cand.decision === 'rejected' || !b.elig.ok ? 1 : 0;
      if (ea !== eb) return ea - eb;
      if (starsAbsolute && !!a.cand.stars !== !!b.cand.stars) return a.cand.stars ? -1 : 1;
      if (!!a.cand.reRegistered !== !!b.cand.reRegistered) return a.cand.reRegistered ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      if (!!a.cand.stars !== !!b.cand.stars) return a.cand.stars ? -1 : 1;
      if (b.prevPts !== a.prevPts) return b.prevPts - a.prevPts;
      if (b.rankPts !== a.rankPts) return b.rankPts - a.rankPts;
      return String(a.cand.surname || '').localeCompare(String(b.cand.surname || ''), 'ar');
    };
    const out = [];
    for (const key of Object.keys(groups).sort()) {
      const list = groups[key].sort(cmp);
      const nSeats = seats[key] != null && seats[key] !== '' ? +seats[key] : null;
      let pos = 0, accepted = 0;
      list.forEach((r, i) => {
        const valid = r.elig.ok && r.cand.decision !== 'rejected';
        r.position = valid ? ++pos : null;
        r.tie = valid && list.some((o, j) => j !== i && o.elig.ok && o.cand.decision !== 'rejected' && o.score === r.score);
        if (!r.elig.ok && r.cand.decision !== 'accepted') r.status = 'ineligible';
        else if (r.cand.decision === 'rejected') r.status = 'rejected';
        else if (r.cand.decision === 'accepted') { r.status = 'accepted'; accepted++; }
        else if (nSeats == null) r.status = 'ranked';
        else if (accepted < nSeats) { r.status = 'accepted'; accepted++; }
        else r.status = 'reserve';
      });
      out.push({ key, rows: list, seats: nSeats, count: list.length, eligible: pos });
    }
    return out;
  }

  global.Scoring = { computeScore, scoreCriterion, maxOfCriterion, checkEligibility, rankCandidates, groupKeyOf, durationDays,
    gridById, rankOf, r2, analyzeDocs, historyOf, samePerson, isExcluded, isBeforeCutoff, entryDate };
})(typeof window !== 'undefined' ? window : globalThis);
