/* محرك التنقيط والأهلية والترتيب */
(function (global) {
  'use strict';
  const D = global.GRIDS_DATA;

  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

  function gridById(id) { return D.GRIDS.find(g => g.id === id) || null; }
  function rankOf(grid, rankId) { return grid && grid.ranks ? grid.ranks.find(r => r.id === rankId) || null : null; }
  function authorWeight(pos) { const a = D.AUTHOR_WEIGHTS.find(x => x.v === +pos); return a ? a.w : 1; }

  /* ----- تنقيط معيار واحد ----- */
  function scoreCriterion(crit, input, cand, grid) {
    input = input || {};
    const detail = [];
    let pts = 0;
    switch (crit.type) {
      case 'rank': {
        const rk = rankOf(grid, cand.rank);
        pts = rk ? rk.pts : 0;
        if (rk) detail.push(rk.label + ': ' + rk.pts);
        if (crit.bonus && input.bonus && rk && (!crit.bonus.onlyRanks || crit.bonus.onlyRanks.includes(rk.id))) {
          pts += crit.bonus.pts; detail.push('علاوة التأهيل: +' + crit.bonus.pts);
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
        detail.push(N + ' - ' + n + ' (حد أقصى ' + (N - 1) + ')');
        break;
      }
      case 'lines': {
        // توزيع العدد على الأسطر (الأعلى نقاطا أولا عند وجود حد أقصى للمجموعة)
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
          if (raw) detail.push(l.label + ' × ' + raw + ' = ' + r2(lineRes[l.id]));
          pts += lineRes[l.id];
        }
        break;
      }
      case 'pubs': {
        const entries = Array.isArray(input.entries) ? input.entries : [];
        const byCat = {};
        for (const e of entries) {
          const cat = crit.cats.find(c => c.id === e.cat);
          if (!cat) continue;
          let v = cat.pts * authorWeight(e.pos);
          if (crit.requireAff && e.aff === false) v = 0;
          (byCat[cat.id] = byCat[cat.id] || []).push(v);
        }
        for (const cat of crit.cats) {
          let vals = (byCat[cat.id] || []).sort((a, b) => b - a);
          if (cat.maxCount != null) vals = vals.slice(0, cat.maxCount);
          let s = vals.reduce((a, b) => a + b, 0);
          if (cat.maxPts != null) s = Math.min(s, cat.maxPts);
          if (vals.length) detail.push(cat.label + ': ' + vals.length + ' → ' + r2(s));
          pts += s;
        }
        break;
      }
      case 'items': {
        const entries = Array.isArray(input.entries) ? input.entries : [];
        for (const e of entries) {
          const o = crit.opts.find(x => x.id === e.opt);
          if (!o) continue;
          let v = o.pts;
          for (const f of crit.flags || []) if (e.flags && e.flags[f.id]) v += f.pts;
          pts += v;
        }
        if (entries.length) detail.push(entries.length + ' عمل');
        break;
      }
      case 'scale': {
        pts = Math.min(crit.max, Math.max(0, num(input.v)));
        break;
      }
      case 'check': {
        pts = input.v ? crit.pts : 0;
        break;
      }
    }
    if (crit.maxPts != null && pts > crit.maxPts) { pts = crit.maxPts; detail.push('سقف ' + crit.maxPts); }
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
    const total = r2(breakdown.reduce((a, b) => a + b.pts, 0));
    return { total, breakdown, grid };
  }

  /* ----- المدة بالأيام (شاملة) ----- */
  function durationDays(start, end) {
    if (!start || !end) return null;
    const a = new Date(start + 'T00:00:00'), b = new Date(end + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000) + 1;
  }

  function normalizeName(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  /* ----- الأهلية ----- */
  function checkEligibility(cand, settings) {
    const reasons = [], warnings = [];
    const grid = gridById(cand.gridId);
    if (!grid) { reasons.push('لم تحدد شبكة التقييم'); return { ok: false, reasons, warnings }; }

    if (cand.algerian === false) reasons.push('المترشح لا يحمل الجنسية الجزائرية (المادة 14)');

    const rk = rankOf(grid, cand.rank);
    if (grid.ranks.length && !rk) reasons.push('لم تحدد الرتبة / الصنف');

    const prog = D.PROGRAMS[cand.program];
    if (!prog) warnings.push('لم يحدد صنف الحركية');
    else if (!grid.programs.includes(cand.program)) warnings.push('صنف الحركية "' + prog.label + '" غير معتاد لهذه الشبكة');

    // المدة (المادتان 12 و13)
    const days = durationDays(cand.startDate, cand.endDate);
    if (prog && days != null) {
      if (days <= 0) reasons.push('تاريخ النهاية يسبق تاريخ البداية');
      else if (days < prog.min) reasons.push('المدة (' + days + ' يوما) أقل من الحد الأدنى ' + prog.min + ' يوما — لا يمكن تقليص مدة الحركية (المادة 13)');
      else if (days > prog.max) reasons.push('المدة (' + days + ' يوما) تتجاوز الحد الأقصى ' + prog.max + ' يوما (' + prog.art + ')');
    } else if (prog) warnings.push('لم تحدد فترة الحركية');

    // مرة واحدة في السنة المالية (المادة 11)
    if (cand.fyBenefited) {
      if (cand.program === 'conf') warnings.push('استفاد خلال نفس السنة المالية: يستثنى فقط المشاركة في تظاهرة علمية واحدة مفهرسة في WOS (المادة 11)');
      else if (cand.fyException) warnings.push('استفاد خلال نفس السنة المالية: مقبول في إطار الاستثناء (مشروع دولي غير ممول من طرف الجزائر / التشاور لإبرام اتفاقيات) — المادة 11');
      else reasons.push('لا يمكن الاستفادة إلا مرة واحدة من برامج الحركية برسم نفس السنة المالية (المادة 11)');
    }

    // التسجيل المنتظم ابتداء من التسجيل الثاني
    const needsReg = (rk && (rk.student || rk.id === 'maa')) || grid.id === 'R_STAGE';
    if (needsReg && !(rk && rk.id === 'cotutelle')) {
      const fromScore = cand.scores && cand.scores.reg ? num(cand.scores.reg.y) : 0;
      const reg = Math.max(num(cand.regCount), fromScore);
      if (reg < 2) reasons.push('يشترط تسجيل منتظم في الدكتوراه ابتداءً من التسجيل الثاني (المادة 14)');
    }

    // عضو لجنة الانتقاء
    const full = normalizeName((cand.surname || '') + ' ' + (cand.name || ''));
    const full2 = normalizeName((cand.name || '') + ' ' + (cand.surname || ''));
    const committee = ((settings && settings.committee) || []).map(normalizeName).filter(Boolean);
    if (cand.isCommitteeMember || (full.trim() && (committee.includes(full) || committee.includes(full2))))
      reasons.push('لا يمكن أن يكون عضو لجنة الانتقاء يحمل صفة المترشح برسم سنة الانتقاء');

    // الوثائق
    const req = D.requiredDocs(grid, cand.rank, cand.program);
    const missing = req.filter(k => !(cand.docs && cand.docs[k]));
    if (missing.length) reasons.push('ملف ناقص: ' + missing.map(k => D.DOCS[k]).join('؛ '));

    if (grid.id === 'U_STAGE' && cand.reRegistered) warnings.push('تخلى عن تسجيل سابق في الدكتوراه: ليست له الأولوية');
    if (cand.inConvention === false && (grid.id === 'U_ATS' || grid.scope === 'research') && /stage/.test(cand.program || ''))
      warnings.push('يتم تنفيذ التربص حصرا في إطار الاتفاقيات الدولية المبرمة');

    return { ok: reasons.length === 0, reasons, warnings, days };
  }

  /* ----- الترتيب ----- */
  function groupKeyOf(cand, groupBy) {
    const parts = [cand.gridId];
    if (groupBy.includes('rank')) parts.push('r:' + (cand.rank || cand.rankText || '—'));
    if (groupBy.includes('department')) parts.push('d:' + (cand.department || '—').trim());
    if (groupBy.includes('specialty')) parts.push('s:' + (cand.specialty || '—').trim());
    if (groupBy.includes('program')) parts.push('p:' + (cand.program || '—'));
    return parts.join('|');
  }

  function rankCandidates(cands, settings, opts) {
    opts = opts || {};
    const groupBy = opts.groupBy || [];
    const seats = (settings && settings.seats) || {};
    const starsAbsolute = settings && settings.starsPriority === 'absolute';
    const rows = cands.filter(c => !opts.gridId || c.gridId === opts.gridId).map(c => {
      const sc = computeScore(c);
      const el = checkEligibility(c, settings);
      const grid = sc.grid;
      const rk = rankOf(grid, c.rank);
      const prevB = sc.breakdown.find(b => b.id === 'prev');
      return { cand: c, score: sc.total, breakdown: sc.breakdown, elig: el, grid,
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
      if (b.prevPts !== a.prevPts) return b.prevPts - a.prevPts; // أقل استفادات سابقة
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

  global.Scoring = { computeScore, scoreCriterion, maxOfCriterion, checkEligibility, rankCandidates, groupKeyOf, durationDays, gridById, rankOf, r2 };
})(typeof window !== 'undefined' ? window : globalThis);
