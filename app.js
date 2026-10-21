/* AI 劇本工坊：介面層。資料邏輯都在 core.js，這裡只管畫面、儲存、複製與分享。
   所有使用者／AI 給的文字一律用 textContent 放進畫面，不用 innerHTML，避免貼上的內容被當成程式執行。 */
'use strict';
(function () {
  const APP_VER = '1.2.0';
  const C = window.DramaCore;
  const P = window.DramaPresets;
  const T = window.DramaTools;
  const KEY = {
    index: 'aidrama.index',
    cur: 'aidrama.cur',
    tab: 'aidrama.tab',
    p: id => 'aidrama.p.' + id,
    undo: id => 'aidrama.undo.' + id,
    tools: 'aidrama.tools',
  };
  const TABS = ['plan', 'setup', 'episodes', 'shots', 'export', 'tools'];
  const ui = { tab: 'plan', ep: '', setup: 'characters', aiTask: 'bible', aiEp: '', exportEp: '', sheetKind: 'turnaround', sheetOutfit: '', styleOpen: false, toolGroup: 'video' };
  let project = null;
  let saveTimer = null;
  let uid = 0;

  /* ---------- 小工具 ---------- */

  function h(tag, props) {
    const el = document.createElement(tag);
    let value;
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') value = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    if (value !== undefined) el.value = value;
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(x => append(el, x)); return; }
    el.append(c.nodeType ? c : String(c));
  }
  const $ = s => document.querySelector(s);

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) {
      toast('存不進去：手機的網站儲存空間滿了。請到「匯出」備份後刪掉用不到的專案。', true);
      return false;
    }
  }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* 無痕模式可能整個不能用，略過 */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* 復原只是方便功能，存不了就算了 */ } }

  let toastTimer;
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast' + (isErr ? ' err' : ''); }, isErr ? 6000 : 2200);
  }

  async function copy(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // 舊版 iOS 或沒有剪貼簿權限時的退路
      const ta = h('textarea', { readonly: true, class: 'offscreen' });
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.append(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (!ok) { toast('複製失敗：請長按文字自己選取複製', true); return false; }
    }
    toast(okMsg || '已複製');
    return true;
  }

  // iPhone 存檔走分享面板；不能帶 title，否則 iOS 只送出文字、檔案被丟掉
  function deliver(name, text, mime) {
    const type = mime || 'text/plain;charset=utf-8';
    const blob = new Blob([text], { type });
    try {
      const file = new File([blob], name, { type });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(err => { if (err && err.name !== 'AbortError') download(blob, name); });
        return;
      }
    } catch (e) { /* 不支援 File 建構子就直接下載 */ }
    download(blob, name);
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('已下載 ' + name);
  }
  function safeName(s) { return String(s || '未命名').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40); }

  /* ---------- 儲存 ---------- */

  function readIndex() {
    try { const v = JSON.parse(lsGet(KEY.index) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeIndex(list) { lsSet(KEY.index, JSON.stringify(list)); }
  function loadProject(id) {
    const raw = lsGet(KEY.p(id));
    if (!raw) return null;
    try { return C.normalize(JSON.parse(raw)); } catch (e) { return null; }
  }
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!project) return;
    project.updatedAt = new Date().toISOString();
    if (!lsSet(KEY.p(project.id), JSON.stringify(project))) return;
    const idx = readIndex().filter(x => x.id !== project.id);
    idx.unshift({ id: project.id, title: project.meta.title || '未命名', updatedAt: project.updatedAt });
    writeIndex(idx);
    lsSet(KEY.cur, project.id);
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }
  function switchTo(p) {
    if (saveTimer) saveNow();
    project = p;
    ui.ep = ''; ui.aiEp = ''; ui.exportEp = '';
    saveNow();
    render();
  }

  /* ---------- 表單 ---------- */

  function refOptions(ref, extra) {
    const opts = (extra || []).map(x => h('option', { value: x, text: x }));
    if (ref === 'characters') return opts.concat(project.characters.map(c => h('option', { value: c.id, text: c.name || c.id })));
    if (ref === 'locations') return opts.concat(project.locations.map(l => h('option', { value: l.id, text: l.name || l.id })));
    if (ref === 'episodes') return opts.concat(sortedEps().map(e => h('option', { value: e.id, text: epLabel(e) })));
    if (ref === 'props') return opts.concat(project.props.map(p => h('option', { value: p.id, text: p.name || p.id })));
    return opts;
  }
  // 值不在選項裡（例如 AI 給了怪值）時補一個選項，否則 select 會默默顯示空白、使用者以為資料不見
  function keepValue(sel, v) {
    if (v && ![...sel.options].some(o => o.value === v)) sel.append(h('option', { value: v, text: v + '（不在清單）' }));
    sel.value = v || '';
  }

  function inputFor(f, value, onValue, idAttr) {
    let el;
    if (f.opts || f.ref) {
      el = h('select', { id: idAttr }, h('option', { value: '', text: '（未選）' }), f.opts ? f.opts.map(o => h('option', { value: o, text: o })) : refOptions(f.ref, f.extra));
      keepValue(el, value);
      el.addEventListener('change', () => onValue(el.value));
    } else if (f.type === 'area') {
      el = h('textarea', { id: idAttr, rows: /英文/.test(f.l) ? 4 : 3, class: /英文/.test(f.l) ? 'mono' : null, value: value || '' });
      el.addEventListener('input', () => onValue(el.value));
    } else if (f.type === 'num') {
      el = h('input', { id: idAttr, type: 'number', inputmode: 'decimal', min: f.min, max: f.max, step: 'any', value: value === null || value === undefined ? '' : value });
      el.addEventListener('change', () => {
        const n = Number(el.value);
        onValue(el.value === '' || !Number.isFinite(n) ? null : n);
      });
    } else {
      el = h('input', { id: idAttr, type: 'text', value: value || '', enterkeyhint: 'done' });
      el.addEventListener('input', () => onValue(el.value));
    }
    return el;
  }

  function field(f, obj, onChange) {
    if (f.type === 'rows') return rowsField(f, obj, onChange);
    const id = 'f' + (++uid);
    const el = inputFor(f, obj[f.k], v => {
      if (v === null) delete obj[f.k]; else obj[f.k] = v;
      scheduleSave();
      if (onChange) onChange(f.k);
    }, id);
    return h('div', { class: 'field' },
      h('label', { for: id }, f.l, f.req ? h('span', { class: 'req', 'aria-hidden': 'true', text: '＊' }) : null),
      el,
      f.tip ? h('p', { class: 'tip', text: f.tip }) : null);
  }

  function rowsField(f, obj, onChange) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    const wrap = h('div', { class: 'field' });
    const box = h('div', { class: 'rows' });
    const draw = () => {
      box.textContent = '';
      // 列裡的每個輸入都要通知外層：分鏡編輯器的提示詞預覽靠這個重算，否則改了道具或服裝預覽還是舊的
      obj[f.k].forEach((row, i) => box.append(rowEditor(f, obj, row, i, draw, () => { if (onChange) onChange(f.k); })));
      if (!obj[f.k].length) box.append(h('p', { class: 'tip', text: '還沒有，按下面新增。' }));
    };
    const add = h('button', { type: 'button', class: 'btn block', text: '新增' + f.l, onclick: () => {
      const row = {};
      for (const s of f.sub) row[s.k] = '';
      if (f.prefix) {
        let n = 1;
        while (obj[f.k].some(r => r.id === f.prefix + n)) n++;
        row.id = f.prefix + n;
      }
      obj[f.k].push(row);
      scheduleSave();
      draw();
      if (onChange) onChange(f.k);
    } });
    wrap.append(h('div', { class: 'row-head', text: f.l }), box, add);
    if (f.k === 'outfits') wrap.append(outfitPresetRow(obj[f.k], () => { scheduleSave(); draw(); if (onChange) onChange(f.k); }));
    if (f.tip) wrap.append(h('p', { class: 'tip', text: f.tip }));
    draw();
    return wrap;
  }

  // 服裝範本：照類別分組的下拉選單，比一排排按鈕好在手機上捲
  function outfitPresetRow(rows, done) {
    const id = 'f' + (++uid);
    const sel = h('select', { id }, h('option', { value: '', text: '（選一套）' }),
      P.OUTFITS.map(g => h('optgroup', { label: g.g }, g.items.map(o => h('option', { value: o.name, text: o.name })))));
    const add = h('button', { type: 'button', class: 'btn', text: '加入', onclick: () => {
      const o = P.outfit(sel.value);
      if (!o) { toast('先選一套服裝範本', true); return; }
      let n = 1;
      while (rows.some(r => r.id === 'o' + n)) n++;
      rows.push({ id: 'o' + n, name: o.name, prompt: o.prompt });
      sel.value = '';
      done();
      toast('已加入服裝：' + o.name);
    } });
    return h('div', { class: 'field preset' }, h('label', { for: id, text: '從服裝範本加入' }), h('div', { class: 'inline' }, sel, add));
  }

  function rowEditor(f, obj, row, i, redraw, changed) {
    const el = h('fieldset', { class: 'row' });
    const label = f.l + ' ' + (i + 1);
    el.append(h('legend', { class: 'small muted', text: label + (row.id ? '（' + row.id + '）' : '') }));
    let outfitHolder = null;
    for (const s of f.sub) {
      const id = 'f' + (++uid);
      if (s.ref === 'outfits') {
        outfitHolder = h('div', { class: 'field' });
        const drawOutfit = () => {
          outfitHolder.textContent = '';
          const ch = C.find(project.characters, row.c);
          const sel = h('select', { id }, h('option', { value: '', text: '（預設第一套）' }), (ch && ch.outfits || []).map(o => h('option', { value: o.id, text: o.name || o.id })));
          keepValue(sel, row.outfit);
          sel.addEventListener('change', () => { row.outfit = sel.value; scheduleSave(); changed(); });
          outfitHolder.append(h('label', { for: id, text: s.l }), sel);
        };
        drawOutfit();
        outfitHolder.redraw = drawOutfit;
        el.append(outfitHolder);
        continue;
      }
      const input = inputFor(s.k === 'prompt' ? { l: '英文', type: 'area' } : s, row[s.k], v => {
        row[s.k] = v === null ? '' : v;
        scheduleSave();
        if (s.k === 'c' && outfitHolder) { row.outfit = ''; outfitHolder.redraw(); }
        changed();
      }, id);
      el.append(h('div', { class: 'field' }, h('label', { for: id, text: s.l }), input));
    }
    el.append(h('button', { type: 'button', class: 'btn danger row-del', text: '移除', 'aria-label': '移除' + label, onclick: () => {
      obj[f.k].splice(i, 1);
      scheduleSave();
      redraw();
      changed();
    } }));
    return el;
  }

  /* ---------- 面板 ---------- */

  const sheet = () => $('#sheet');
  let onSheetClose = null;
  function openSheet(title, body, onClose) {
    $('#sheetTitle').textContent = title;
    const b = $('#sheetBody');
    b.textContent = '';
    b.append(body);
    onSheetClose = onClose || null;
    const d = sheet();
    if (!d.open) d.showModal();
    // showModal 預設會把焦點給第一個輸入框，iPhone 鍵盤就會馬上跳出來；改成停在標題
    $('#sheetTitle').focus({ preventScroll: true });
    b.scrollTop = 0;
    d.scrollTop = 0;
  }
  function closeSheet() { if (sheet().open) sheet().close(); }

  /* ---------- 共用顯示 ---------- */

  function sortedEps() { return project.episodes.slice().sort((a, b) => (a.no || 0) - (b.no || 0)); }
  function epLabel(e) { return '第' + e.no + '集' + (e.title ? '　' + e.title : ''); }
  function itemTitle(coll, it) {
    if (coll === 'episodes') return epLabel(it);
    if (coll === 'shots') return '鏡 ' + it.id;
    return it.name || '（未命名）';
  }

  function issuesBlock(list, openIfError) {
    if (!list.length) return h('p', { class: 'small muted', text: '沒有發現問題。' });
    const ul = h('ul', { class: 'issues' });
    for (const x of list.slice(0, 80)) ul.append(h('li', { class: x.level }, h('b', { text: x.where + '：' }), x.msg));
    if (list.length > 80) ul.append(h('li', { text: '……還有 ' + (list.length - 80) + ' 項' }));
    return ul;
  }

  function lintDetails(list, title) {
    const errs = list.filter(x => x.level === 'error').length;
    const d = h('details', null, h('summary', { text: title + '（' + (list.length ? list.length + ' 項' + (errs ? '，' + errs + ' 項要修' : '') : '沒問題') + '）' }), issuesBlock(list));
    if (errs) d.open = true;
    return d;
  }

  /* ---------- 編輯器 ---------- */

  // 按了「新增」又什麼都沒填就關掉，不留一筆空白資料
  function isBlank(coll, it) {
    if (coll === 'shots') return !it.action && !(it.lines || []).some(l => l.text) && !it.visualEn;
    if (coll === 'episodes') return !it.title && !it.hook && !it.synopsis;
    return !it.name;
  }

  function openEditor(coll, item, isNew) {
    const spec = C.SPEC[coll];
    const body = h('div');
    const form = h('div');
    const preview = h('div');
    const drawPreview = () => {
      preview.textContent = '';
      if (coll === 'characters') { preview.append(sheetBlock(item)); return; }
      if (coll === 'episodes') {
        const b = inspoBlock();
        if (b) preview.append(b);
        preview.append(h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', text: '複製這集劇本', onclick: () => copy(C.exportScript(project, item.id), '已複製第' + item.no + '集劇本') })));
        return;
      }
      if (coll !== 'shots') return;
      const img = C.imagePrompt(project, item), vid = C.videoPrompt(project, item);
      preview.append(
        h('h3', { text: '組好的提示詞' }),
        h('div', { class: 'row-head', text: '圖片（先生出這一鏡的關鍵畫面）' }), h('div', { class: 'prompt', text: img }),
        h('div', { class: 'row-head', text: '影片（拿上面的圖做圖生影片）' }), h('div', { class: 'prompt', text: vid }),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', text: '複製圖片提示詞', onclick: () => copy(C.imagePrompt(project, item), '已複製圖片提示詞') }),
          h('button', { type: 'button', class: 'btn', text: '複製影片提示詞', onclick: () => copy(C.videoPrompt(project, item), '已複製影片提示詞') })),
        h('div', { class: 'btn-row' }, toolButton(favTool('image'), '開生圖'), toolButton(favTool('video'), '開影片')),
        h('p', { class: 'tip', text: '「開生圖」「開影片」用的是「工具」分頁設定的常用工具，會另開分頁；先複製好再過去貼上。' }));
    };
    const onChange = () => {
      if (coll === 'shots' || coll === 'characters') drawPreview();
      if (coll === 'characters' || coll === 'episodes') $('#sheetTitle').textContent = itemTitle(coll, item);
    };
    // 常改的欄位放上面，其餘收進 details，手機上不用滑很久才找到外觀與服裝
    const primary = EDITOR_PRIMARY[coll];
    const more = primary ? h('details', null, h('summary', { text: EDITOR_MORE[coll] })) : null;
    for (const f of spec.fields) {
      const el = field(f, item, onChange);
      if (!primary || primary.includes(f.k)) form.append(el); else more.append(el);
      if (coll === 'characters' && f.k === 'appearance') form.append(lookBuilder(item, el, onChange));
    }
    if (more) form.append(more);
    drawPreview();
    const del = h('button', { type: 'button', class: 'btn danger block', text: '刪除這個' + spec.label, onclick: () => {
      const refs = refCount(coll, item.id);
      const msg = '確定刪除「' + itemTitle(coll, item) + '」？' + (refs ? '\n有 ' + refs + ' 個分鏡用到它，刪掉後那些分鏡會出現錯誤提醒。' : '') + (coll === 'episodes' ? '\n這一集的分鏡也會一起刪掉。' : '');
      if (!confirm(msg)) return;
      project[coll] = project[coll].filter(x => x !== item);
      if (coll === 'episodes') project.shots = project.shots.filter(s => s.ep !== item.id);
      saveNow();
      closeSheet();
      toast('已刪除');
    } });
    body.append(form, preview, h('div', { class: 'btn-row' }, del));
    openSheet(itemTitle(coll, item), body, () => {
      if (isNew && project[coll].includes(item) && isBlank(coll, item)) project[coll] = project[coll].filter(x => x !== item);
      saveNow();
      render();
    });
  }

  // 外觀錨點產生器：選項改寫自咒語盒的角色工坊；組出來的英文可以再手改
  function lookBuilder(item, fieldEl, onChange) {
    const sel = {};
    const grid = h('div', { class: 'look-grid' });
    const out = h('div', { class: 'prompt' });
    const upd = () => { out.textContent = P.composeAppearance(sel) || '（選幾項就會出現）'; };
    const guess = { gender: item.gender, age: item.age ? String(item.age).replace(/\D.*$/, '') + ' 歲' : '' };
    for (const ax of P.LOOK) {
      const id = 'f' + (++uid);
      const s = h('select', { id }, h('option', { value: '', text: '（不指定）' }), ax.opts.map(o => h('option', { value: o[0], text: o[0] })));
      if (guess[ax.k] && ax.opts.some(o => o[0] === guess[ax.k])) { s.value = guess[ax.k]; sel[ax.k] = s.value; }
      s.addEventListener('change', () => { sel[ax.k] = s.value; upd(); });
      grid.append(h('div', { class: 'field' }, h('label', { for: id, text: ax.l }), s));
    }
    upd();
    return h('details', { class: 'look' }, h('summary', { text: '用選單產生外觀錨點' }), grid,
      h('p', { class: 'tip', text: '「辨識特徵」最重要：換了衣服還認得出是同一人，靠的就是它。' }), out,
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn primary', text: '填入外觀錨點', onclick: () => {
        const text = P.composeAppearance(sel);
        if (!text) { toast('先選幾項', true); return; }
        if (item.appearance && item.appearance !== text && !confirm('會取代目前的外觀錨點，確定嗎？')) return;
        item.appearance = text;
        const ta = fieldEl.querySelector('textarea');
        if (ta) ta.value = text;
        scheduleSave();
        onChange('appearance');
        toast('已填入外觀錨點');
      } })));
  }

  function sheetBlock(ch) {
    const wrap = h('div', null, h('h3', { text: '定裝照提示詞' }),
      h('p', { class: 'tip', text: '先用這段生出定裝照存起來；之後每一鏡都上傳它當參考圖（到「企劃 → 風格」把「生圖參考圖」改成定裝照），臉和衣服就不容易跑掉。' }));
    if (!ch.appearance) { wrap.append(h('p', { class: 'small muted', text: '先填外觀錨點（或用上面的選單產生），才能組定裝照提示詞。' })); return wrap; }
    const kid = 'f' + (++uid), oid = 'f' + (++uid);
    const kind = h('select', { id: kid }, Object.entries(C.SHEETS).map(([k, x]) => h('option', { value: k, text: x.label })));
    kind.value = ui.sheetKind;
    const fits = ch.outfits || [];
    const fit = h('select', { id: oid }, fits.length ? fits.map(o => h('option', { value: o.id, text: o.name || o.id })) : h('option', { value: '', text: '（還沒有服裝）' }));
    if (fits.some(o => o.id === ui.sheetOutfit)) fit.value = ui.sheetOutfit;
    const out = h('div', { class: 'prompt' });
    const upd = () => { ui.sheetKind = kind.value; ui.sheetOutfit = fit.value; out.textContent = C.sheetPrompt(project, ch.id, kind.value, fit.value); };
    kind.addEventListener('change', upd);
    fit.addEventListener('change', upd);
    upd();
    wrap.append(h('div', { class: 'look-grid' },
      h('div', { class: 'field' }, h('label', { for: kid, text: '哪一種' }), kind),
      h('div', { class: 'field' }, h('label', { for: oid, text: '哪一套服裝' }), fit)), out,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', text: '複製定裝照提示詞', onclick: () => copy(C.sheetPrompt(project, ch.id, kind.value, fit.value), '已複製' + C.SHEETS[kind.value].label + '提示詞') })));
    return wrap;
  }

  function inspoBlock() {
    const s = P.story(project.meta.genre);
    if (!s) return null;
    return h('details', null, h('summary', { text: '鉤子與懸念靈感（' + s.genre + '）' }),
      h('div', { class: 'row-head', text: '前 3 秒鉤子' }), h('ul', { class: 'small' }, s.hooks.map(x => h('li', { text: x }))),
      h('div', { class: 'row-head', text: '結尾懸念' }), h('ul', { class: 'small' }, s.cliffs.map(x => h('li', { text: x }))));
  }

  /* ---------- 範本 ---------- */

  function uniqueName(coll, name) {
    let n = name, i = 2;
    while (project[coll].some(x => x.name === n)) n = name + ' ' + (i++);
    return n;
  }

  function openPresetPicker(coll) {
    const groups = { characters: P.CHARACTERS, locations: P.LOCATIONS, props: P.PROPS }[coll];
    const label = C.SPEC[coll].label;
    const sel = h('select', { id: 'presetGroup' }, groups.map((g, i) => h('option', { value: String(i), text: g.g + '（' + g.items.length + '）' })));
    const list = h('div', { class: 'list' });
    const draw = () => {
      list.textContent = '';
      for (const it of groups[Number(sel.value)].items) {
        const title = coll === 'characters' ? it.t + '｜' + it.name : it.name;
        const sub = coll === 'characters' ? [it.role, it.age, it.job].join('，') : it.desc;
        list.append(h('button', { type: 'button', class: 'item', onclick: () => {
          const seed = coll === 'characters' ? P.characterSeed(it.t) : coll === 'locations' ? P.locationSeed(it.name) : P.propSeed(it.name);
          seed.name = uniqueName(coll, seed.name);
          const added = C.newItem(project, coll, seed);
          saveNow();
          toast('已加入' + label + '：' + added.name);
          openEditor(coll, added);
        } }, h('span', { class: 'item-title', text: title }), h('span', { class: 'item-sub', text: sub })));
      }
    };
    sel.addEventListener('change', draw);
    draw();
    openSheet(label + '範本', h('div', null,
      h('div', { class: 'field' }, h('label', { for: 'presetGroup', text: '類別' }), sel), list,
      h('p', { class: 'tip', text: '點一下就加入並打開編輯，名字和設定都可以改。外觀錨點裡那個辨識特徵（痣、疤、眼鏡）盡量留著。' })), () => render());
  }

  function storyBlock() {
    const sel = h('select', { id: 'storySel' }, P.STORIES.map(s => h('option', { value: s.genre, text: s.genre + '｜' + s.n })));
    sel.value = P.story(project.meta.genre) ? project.meta.genre : P.STORIES[0].genre;
    const info = h('div');
    const draw = () => {
      const s = P.story(sel.value);
      info.textContent = '';
      info.append(h('p', { class: 'small', text: s.meta.logline }),
        h('p', { class: 'small muted', text: '賣點：' + s.meta.hook + '｜畫風：' + s.style }),
        h('p', { class: 'small muted', text: '角色：' + s.cast.join('、') + '｜場景：' + s.locations.join('、') }));
    };
    sel.addEventListener('change', draw);
    draw();
    const empty = !project.characters.length && !project.episodes.length;
    return h('details', { open: empty }, h('summary', { text: '從故事範本開始（' + P.STORIES.length + ' 種類型）' }),
      h('div', { class: 'field' }, h('label', { for: 'storySel', text: '故事範本' }), sel), info,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn primary', text: '整套套用', onclick: () => applyStory(P.story(sel.value), true) }),
        h('button', { type: 'button', class: 'btn', text: '只套企劃', onclick: () => applyStory(P.story(sel.value), false) })),
      h('p', { class: 'tip', text: '整套＝企劃＋畫風＋建議角色與場景（同名的不會重複加）。只套企劃＝只填類型、一句話故事、賣點、調性、觀眾、主題。' }));
  }

  function applyStory(s, full) {
    const keys = ['logline', 'hook', 'tone', 'audience', 'theme'];
    const filled = keys.filter(k => project.meta[k] && project.meta[k] !== s.meta[k]);
    if (filled.length && !confirm('企劃裡已經有內容，會被範本取代：' + filled.map(k => C.SPEC.meta.fields.find(f => f.k === k).l).join('、') + '。確定嗎？')) return;
    if (!project.meta.title || project.meta.title === '新的短劇') project.meta.title = s.n;
    project.meta.genre = s.genre;
    Object.assign(project.meta, s.meta);
    const done = ['企劃'];
    if (full) {
      const st = P.style(s.style);
      if (st) { Object.assign(project.style, st.set); done.push('畫風「' + st.n + '」'); }
      let nc = 0, nl = 0;
      for (const t of s.cast) {
        const seed = P.characterSeed(t);
        if (seed && !project.characters.some(c => c.name === seed.name)) { C.newItem(project, 'characters', seed); nc++; }
      }
      for (const n of s.locations) {
        const seed = P.locationSeed(n);
        if (seed && !project.locations.some(l => l.name === seed.name)) { C.newItem(project, 'locations', seed); nl++; }
      }
      done.push('角色 ' + nc + ' 位', '場景 ' + nl + ' 個');
    }
    saveNow();
    render();
    toast('已套用：' + done.join('、'));
  }

  function stylePresetField() {
    const sel = h('select', { id: 'stylePreset' }, h('option', { value: '', text: '（選一種）' }), P.STYLES.map(s => h('option', { value: s.n, text: s.n + '｜' + s.d })));
    return h('div', { class: 'field' }, h('label', { for: 'stylePreset', text: '套用畫風範本' }),
      h('div', { class: 'inline' }, sel, h('button', { type: 'button', class: 'btn', text: '套用', onclick: () => {
        const st = P.style(sel.value);
        if (!st) { toast('先選一種畫風', true); return; }
        if (!confirm('會改掉畫風、色調、光線、提示詞開頭與結尾、負面提示詞，確定嗎？')) return;
        Object.assign(project.style, st.set);
        ui.styleOpen = true;
        saveNow();
        render();
        toast('已套用畫風「' + st.n + '」');
      } })),
      h('p', { class: 'tip', text: '寫實和動畫的負面提示詞不一樣，會一起換。' }));
  }

  const EDITOR_PRIMARY = {
    characters: ['name', 'role', 'appearance', 'outfits', 'voice', 'voiceId', 'refImage'],
    episodes: ['no', 'title', 'hook', 'synopsis', 'cliffhanger', 'seconds'],
    shots: ['sec', 'loc', 'time', 'size', 'angle', 'move', 'cast', 'items', 'action', 'lines', 'status'],
  };
  const EDITOR_MORE = {
    characters: '人物設定（年齡、性格、動機、秘密、說話方式）',
    episodes: '衝突、反轉、小說版',
    shots: '進階（英文描述、其他人、文字朝向、場次、音效、轉場、備註）',
  };

  function refCount(coll, id) {
    if (coll === 'characters') return project.shots.filter(s => (s.cast || []).some(r => r.c === id) || (s.lines || []).some(l => l.c === id)).length;
    if (coll === 'locations') return project.shots.filter(s => s.loc === id).length;
    if (coll === 'props') return project.shots.filter(s => (s.items || []).some(it => it.p === id)).length;
    return 0;
  }

  /* ---------- 分頁 ---------- */

  function render() {
    $('#projTitle').textContent = project.meta.title || '未命名專案';
    document.title = (project.meta.title ? project.meta.title + '｜' : '') + 'AI 劇本工坊';
    for (const b of document.querySelectorAll('.tabs button')) {
      if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    const v = $('#view');
    v.textContent = '';
    const fn = { plan: renderPlan, setup: renderSetup, episodes: renderEpisodes, shots: renderShots, export: renderExport, tools: renderTools }[ui.tab];
    v.append(fn());
  }

  function renderPlan() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-plan' });
    const empty = !project.characters.length && !project.episodes.length;
    if (empty) {
      card.append(h('div', { class: 'hint' },
        h('strong', { text: '還沒有故事也沒關係' }),
        h('ol', null,
          h('li', { text: '下面選個故事範本「整套套用」，或自己選類型、想法可以空著。' }),
          h('li', { text: '按「AI 助手」→ 生成設定集 → 複製指令，貼到 Claude 或 ChatGPT。' }),
          h('li', { text: '把 AI 的回覆整段貼回來，角色、場景、風格就都填好了。' })),
        h('button', { type: 'button', class: 'btn primary', text: '打開 AI 助手', onclick: () => openAI('bible') })));
    }
    card.append(h('h2', { id: 'h-plan', text: '企劃' }), storyBlock());
    for (const f of C.SPEC.meta.fields) card.append(field(f, project.meta, k => { if (k === 'title') $('#projTitle').textContent = project.meta.title || '未命名專案'; }));
    const style = h('details', { open: ui.styleOpen }, h('summary', { text: '風格與提示詞設定' }), stylePresetField());
    style.addEventListener('toggle', () => { ui.styleOpen = style.open; });
    for (const f of C.SPEC.style.fields) style.append(field(f, project.style));
    card.append(style, lintDetails(C.lint(project), '全劇健檢'));
    return card;
  }

  function renderSetup() {
    const coll = ui.setup;
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-setup' });
    const sel = h('select', { id: 'setupColl', 'aria-label': '要編輯的種類' },
      ['characters', 'locations', 'props'].map(k => h('option', { value: k, text: C.SPEC[k].label + '（' + project[k].length + '）' })));
    sel.value = coll;
    sel.addEventListener('change', () => { ui.setup = sel.value; render(); });
    card.append(h('h2', { id: 'h-setup', text: '設定' }), h('div', { class: 'field' }, sel));
    const list = h('div', { class: 'list' });
    for (const it of project[coll]) {
      let sub = '';
      if (coll === 'characters') sub = [it.role, it.age, it.job].filter(Boolean).join('，');
      if (coll === 'locations') sub = [it.type, it.desc].filter(Boolean).join('，');
      if (coll === 'props') sub = it.desc || '';
      const missing = (coll === 'characters' && !it.appearance) || (coll === 'locations' && !it.prompt);
      list.append(h('button', { type: 'button', class: 'item', onclick: () => openEditor(coll, it) },
        h('span', { class: 'item-title' }, it.name || '（未命名）', missing ? h('span', { class: 'badge', text: '缺英文描述' }) : null),
        sub ? h('span', { class: 'item-sub', text: sub }) : null));
    }
    if (!project[coll].length) list.append(h('p', { class: 'empty', text: '還沒有' + C.SPEC[coll].label + '。可以自己新增、從範本加入，或用 AI 助手一次生成整套設定。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', text: '新增' + C.SPEC[coll].label, onclick: () => openEditor(coll, C.newItem(project, coll), true) }),
      h('button', { type: 'button', class: 'btn', text: '從範本加入', onclick: () => openPresetPicker(coll) }),
      h('button', { type: 'button', class: 'btn', text: 'AI 生成設定集', onclick: () => openAI('bible') })));
    if (coll === 'characters') card.append(h('details', null, h('summary', { text: '為什麼外觀要寫英文、而且要固定？' }),
      h('p', { class: 'small', text: 'AI 影片最難的是同一個角色每一鏡長得一樣。每張圖都貼同一段外觀描述（年齡、髮型、體型、一個辨識特徵），再搭配同一張定裝照當參考圖，臉崩的機率會低很多。多數生圖工具對英文描述比較準。' })));
    return card;
  }

  function renderEpisodes() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-eps' });
    card.append(h('h2', { id: 'h-eps', text: '分集' }));
    const list = h('div', { class: 'list' });
    const target = Number(project.meta.epSeconds) || 0;
    for (const e of sortedEps()) {
      const n = C.epShots(project, e.id).length;
      const sec = C.epSeconds(project, e.id);
      const goal = Number(e.seconds) || target;
      list.append(h('button', { type: 'button', class: 'item', onclick: () => openEditor('episodes', e) },
        h('span', { class: 'item-title', text: epLabel(e) }),
        h('span', { class: 'item-sub', text: e.hook ? '鉤子：' + e.hook : '還沒寫前 3 秒鉤子' }),
        h('span', { class: 'item-sub', text: n ? n + ' 鏡，' + sec + '／' + goal + ' 秒' : '還沒拆分鏡' })));
    }
    if (!project.episodes.length) list.append(h('p', { class: 'empty', text: '還沒有分集。先在「企劃」填好集數，再用 AI 助手寫分集大綱。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', text: '新增一集', onclick: () => openEditor('episodes', C.newItem(project, 'episodes'), true) }),
      h('button', { type: 'button', class: 'btn', text: 'AI 寫分集大綱', onclick: () => openAI('episodes') })));
    return card;
  }

  function currentEp() {
    const eps = sortedEps();
    if (!eps.some(e => e.id === ui.ep)) ui.ep = eps.length ? eps[0].id : '';
    return C.find(project.episodes, ui.ep);
  }

  function renderShots() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-shots' });
    card.append(h('h2', { id: 'h-shots', text: '分鏡' }));
    const ep = currentEp();
    if (!ep) {
      card.append(h('p', { class: 'empty', text: '要先有分集才能拆分鏡。' }),
        h('button', { type: 'button', class: 'btn primary block', text: '到「分集」新增', onclick: () => go('episodes') }));
      return card;
    }
    const sel = h('select', { id: 'shotEp', 'aria-label': '選擇集數' }, refOptions('episodes'));
    sel.value = ep.id;
    sel.addEventListener('change', () => { ui.ep = sel.value; render(); });
    card.append(h('div', { class: 'field' }, sel));

    const shots = C.epShots(project, ep.id);
    const total = shots.reduce((a, s) => a + (Number(s.sec) || 0), 0);
    const goal = Number(ep.seconds) || Number(project.meta.epSeconds) || 0;
    if (shots.length) {
      const done = shots.filter(s => s.status === '完成').length;
      // 時間軸只負責「看」：短鏡頭的寬度必然小於 44pt，做成按鈕會點不準；要操作就用下面的分鏡卡
      const bar = h('div', { class: 'timeline', role: 'img', 'aria-label': '時間軸：' + shots.length + ' 鏡，已完成 ' + done + ' 鏡，每段寬度是秒數' });
      for (const s of shots) {
        const seg = h('span', { class: 'seg', 'data-st': s.status || '待生成' });
        seg.style.flexGrow = String(Number(s.sec) || 1);
        bar.append(seg);
      }
      const over = goal && Math.abs(total - goal) > goal * 0.25;
      card.append(h('div', { class: 'timeline-wrap' }, bar,
        h('div', { class: 'timeline-meta' },
          h('span', { class: over ? 'over' : null, text: C.clock(total) + '／目標 ' + C.clock(goal) }),
          h('span', { text: '完成 ' + done + '／' + shots.length + ' 鏡' }))));
    }
    card.append(lintDetails(C.lint(project, ep.id), '這集的提醒'));

    const list = h('div', { class: 'shots' });
    let t = 0;
    for (const s of shots) { list.append(shotCard(ep, s, t)); t += Number(s.sec) || 0; }
    if (!shots.length) list.append(h('p', { class: 'empty', text: '這集還沒有分鏡。用 AI 助手「拆單集分鏡」最快。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', text: '新增分鏡', onclick: () => openEditor('shots', C.newItem(project, 'shots', { ep: ep.id }), true) }),
      h('button', { type: 'button', class: 'btn', text: 'AI 拆分鏡', onclick: () => openAI('shots', ep.id) }),
      h('button', { type: 'button', class: 'btn', text: '複製劇本', onclick: () => copy(C.exportScript(project, ep.id), '已複製第' + ep.no + '集劇本') })));
    return card;
  }

  function shotCard(ep, s, start) {
    const loc = C.find(project.locations, s.loc);
    const status = h('select', { 'aria-label': '鏡 ' + s.id + ' 進度' }, C.OPT.status.map(o => h('option', { value: o, text: o })));
    keepValue(status, s.status || '待生成');
    status.addEventListener('change', () => { s.status = status.value; saveNow(); render(); });
    const num = String(s.id).split('-').pop();
    const lines = (s.lines || []).filter(l => l.text);
    return h('article', { class: 'shot', id: 'shot-' + s.id },
      h('div', { class: 'slate', 'aria-hidden': 'true' },
        h('span', { text: '第' + ep.no + '集' }),
        h('span', { text: '場 ' + (s.scene || 1) }),
        h('strong', { text: num })),
      h('div', { class: 'shot-body' },
        h('div', { class: 'shot-top' },
          h('span', { class: 'shot-time', text: C.clock(start) + '–' + C.clock(start + (Number(s.sec) || 0)) }),
          h('span', { class: 'muted', text: s.sec + ' 秒' }),
          status),
        h('div', { class: 'chips' },
          [loc ? loc.name : null, s.time, s.size, s.angle, s.move].concat((s.items || []).map(it => { const pr = C.find(project.props, it.p); return pr ? pr.name : null; })).filter(Boolean).map(x => h('span', { class: 'chip', text: x }))),
        h('p', { class: 'shot-action', text: s.action || '（還沒寫畫面）' }),
        lines.length ? h('ul', { class: 'shot-lines' }, lines.map(l => h('li', null, h('span', { class: 'who', text: C.speakerName(project, l.c) + '：' }), l.text))) : null),
      h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', text: '圖片提示詞', 'aria-label': '複製鏡 ' + s.id + ' 圖片提示詞', onclick: () => copy(C.imagePrompt(project, s), '已複製鏡 ' + s.id + ' 圖片提示詞') }),
          h('button', { type: 'button', class: 'btn', text: '影片提示詞', 'aria-label': '複製鏡 ' + s.id + ' 影片提示詞', onclick: () => copy(C.videoPrompt(project, s), '已複製鏡 ' + s.id + ' 影片提示詞') }),
          h('button', { type: 'button', class: 'btn', text: '編輯', 'aria-label': '編輯鏡 ' + s.id, onclick: () => openEditor('shots', s) })));
  }

  function renderExport() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-export' });
    card.append(h('h2', { id: 'h-export', text: '匯出' }));
    const eps = sortedEps();
    if (ui.exportEp && !C.find(project.episodes, ui.exportEp)) ui.exportEp = '';
    const sel = h('select', { id: 'exportEp' }, h('option', { value: '', text: '全部集數' }), refOptions('episodes'));
    sel.value = ui.exportEp;
    sel.addEventListener('change', () => { ui.exportEp = sel.value; render(); });
    card.append(h('div', { class: 'field' }, h('label', { for: 'exportEp', text: '範圍' }), sel));
    const base = safeName(project.meta.title);
    const epTag = ui.exportEp ? '_第' + C.find(project.episodes, ui.exportEp).no + '集' : '';
    const srtEp = ui.exportEp || (eps[0] && eps[0].id);
    const rows = [
      ['分鏡提示詞包', '每一鏡的圖片、影片、配音提示詞，照順序生成。', () => deliver(base + epTag + '_提示詞.txt', C.exportPromptPack(project, ui.exportEp))],
      ['分鏡表', 'Numbers 或 Excel 打開，剪輯時對照用。', () => deliver(base + epTag + '_分鏡表.csv', C.exportCSV(project, ui.exportEp), 'text/csv;charset=utf-8')],
      ['字幕', srtEp ? '剪映、CapCut 可直接匯入。' + (ui.exportEp ? '' : '（全部集數時匯出第 1 集）') : '要先有分集。', () => {
        if (!srtEp) return toast('還沒有分集', true);
        const e = C.find(project.episodes, srtEp);
        deliver(base + '_第' + e.no + '集.srt', C.exportSRT(project, srtEp), 'application/x-subrip');
      }],
      ['劇本', '純文字：場次、畫面、對白、音效；沒拆分鏡的集輸出大綱與小說版。', () => deliver(base + epTag + '_劇本.txt', C.exportScript(project, ui.exportEp))],
      ['複製劇本', '直接複製劇本文字（範圍照上面選的），貼給 AI 或傳給別人看。', () => copy(C.exportScript(project, ui.exportEp), '已複製劇本')],
      ['設定集', 'Markdown，貼給任何 AI 當背景資料。', () => deliver(base + '_設定集.md', C.exportMarkdown(project), 'text/markdown;charset=utf-8')],
      ['複製設定集', '直接複製文字，不存檔。', () => copy(C.exportMarkdown(project), '已複製設定集')],
      ['範本庫', '角色、服裝、場景、道具、畫風、故事範本全集（Markdown），不用 App 時也能複製。', () => deliver('AI短劇範本庫.md', P.libraryMarkdown(), 'text/markdown;charset=utf-8')],
      ['空白模板', '不用 App 時，自己填的設定集模板。', () => deliver('AI短劇設定集模板.md', C.exportMarkdown(C.newProject(), { tips: true, heading: 'AI 短劇設定集模板' }), 'text/markdown;charset=utf-8')],
      ['備份專案', '整個專案存成 JSON，換手機或清快取前一定要做。', () => { saveNow(); deliver(base + '_備份_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(project, null, 1), 'application/json'); }],
    ];
    const list = h('div', { class: 'list' });
    for (const [t, d, fn] of rows) list.append(h('button', { type: 'button', class: 'item', onclick: fn }, h('span', { class: 'item-title', text: t }), h('span', { class: 'item-sub', text: d })));
    const file = h('input', { type: 'file', id: 'importFile', accept: '.json,application/json', class: 'visually-hidden' });
    file.style.display = 'none';
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 4 * 1024 * 1024) { toast('檔案超過 4MB，不像這個 App 的備份', true); return; }
      const r = new FileReader();
      r.onload = () => {
        try {
          const p = C.normalize(JSON.parse(r.result));
          if (readIndex().some(x => x.id === p.id)) p.id = C.newProject().id;
          switchTo(p);
          toast('已還原成新專案：' + (p.meta.title || '未命名'));
        } catch (e) { toast('這個檔案不是有效的備份：' + e.message, true); }
      };
      r.onerror = () => toast('讀檔失敗，請再選一次', true);
      r.readAsText(f);
      file.value = '';
    });
    list.append(h('button', { type: 'button', class: 'item', onclick: () => file.click() },
      h('span', { class: 'item-title', text: '從備份還原' }), h('span', { class: 'item-sub', text: '會另開一個專案，不會蓋掉現在這個。' })));
    card.append(list, file);
    return card;
  }

  /* ---------- 工具 ---------- */

  // 常用工具只存在這支手機（每個人用的工具不同，不跟專案走）；讀不到就用該類第一個
  function toolPrefs() {
    try { const v = JSON.parse(lsGet(KEY.tools) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function favTool(k) {
    const g = T.group(k);
    const name = toolPrefs()[k];
    return g.items.find(t => t.n === name && t.status !== '已關閉') || g.items.find(t => t.status !== '已關閉');
  }

  // 外部連結一律另開分頁、不帶 referrer：專案資料不會因為點了連結被帶出去
  function toolLink(t) {
    return h('a', { class: 'item tool', href: t.u, target: '_blank', rel: 'noopener noreferrer' },
      h('span', { class: 'item-title' }, t.n,
        t.cn ? h('span', { class: 'badge cn', text: '中國廠牌' }) : null,
        t.status && t.status !== '營運中' ? h('span', { class: 'badge', text: t.status }) : null),
      h('span', { class: 'item-sub', text: t.d }),
      t.uCN ? h('span', { class: 'item-sub', text: '中國大陸版：' + t.uCN }) : null);
  }
  function toolButton(t, verb) {
    if (!t) return null;
    return h('a', { class: 'btn', href: t.u, target: '_blank', rel: 'noopener noreferrer', text: verb + ' ' + t.short + (t.cn ? '（中）' : ''), 'aria-label': verb + ' ' + t.n + (t.cn ? '（中國廠牌）' : '') });
  }

  function renderTools() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-tools' });
    card.append(h('h2', { id: 'h-tools', text: '工具' }),
      h('p', { class: 'small muted', text: '點一下另開官方網站。先在 App 複製好指令或提示詞，到那邊貼上。網址查證於 ' + T.CHECKED + '。' }));
    if (!T.GROUPS.some(g => g.k === ui.toolGroup)) ui.toolGroup = T.GROUPS[0].k;
    const sel = h('select', { id: 'toolGroup', 'aria-label': '工具類別' }, T.GROUPS.map(g => h('option', { value: g.k, text: g.l + '（' + g.items.length + '）' })));
    sel.value = ui.toolGroup;
    sel.addEventListener('change', () => { ui.toolGroup = sel.value; render(); });
    const g = T.group(ui.toolGroup);
    card.append(h('div', { class: 'field' }, sel), g.tip ? h('p', { class: 'tip', text: g.tip }) : null,
      h('div', { class: 'list' }, g.items.map(toolLink)));
    const prefs = h('details', null, h('summary', { text: '常用工具（分鏡編輯器的「開生圖」「開影片」）' }));
    for (const [k, l] of [['image', '常用生圖工具'], ['video', '常用影片工具']]) {
      const id = 'fav-' + k;
      const s = h('select', { id }, T.group(k).items.filter(t => t.status !== '已關閉').map(t => h('option', { value: t.n, text: t.n + (t.cn ? '（中國廠牌）' : '') })));
      s.value = favTool(k).n;
      s.addEventListener('change', () => {
        const v = toolPrefs();
        v[k] = s.value;
        lsSet(KEY.tools, JSON.stringify(v));
        toast('已設為' + l + '：' + s.value);
      });
      prefs.append(h('div', { class: 'field' }, h('label', { for: id, text: l }), s));
    }
    card.append(prefs, h('details', null, h('summary', { text: '使用前注意' }),
      h('ul', { class: 'small' }, T.NOTES.map(x => h('li', { text: x })))));
    return card;
  }

  /* ---------- AI 助手 ---------- */

  function openAI(task, epId) {
    if (task) ui.aiTask = task;
    if (epId) ui.aiEp = epId;
    const body = h('div');
    const taskSel = h('select', { id: 'aiTask' }, Object.entries(C.TASKS).map(([k, t]) => h('option', { value: k, text: t.label })));
    taskSel.value = ui.aiTask;
    const epSel = h('select', { id: 'aiEp' }, refOptions('episodes'));
    const eps = sortedEps();
    if (!eps.some(e => e.id === ui.aiEp)) ui.aiEp = ui.ep && C.find(project.episodes, ui.ep) ? ui.ep : (eps[0] ? eps[0].id : '');
    epSel.value = ui.aiEp;
    const epField = h('div', { class: 'field' }, h('label', { for: 'aiEp', text: '哪一集' }), epSel);
    const info = h('p', { class: 'small muted' });
    const peek = h('div', { class: 'prompt' });
    const pasteBox = h('div');
    const paste = h('textarea', { id: 'aiPaste', rows: 6, class: 'mono', placeholder: '長按 → 貼上' });
    const report = h('div', { 'aria-live': 'polite' });

    const current = () => {
      try { return C.aiPrompt(ui.aiTask, project, ui.aiEp); } catch (e) { return { error: e.message }; }
    };
    const refresh = () => {
      const t = C.TASKS[ui.aiTask];
      epField.style.display = t.needEp ? '' : 'none';
      const p = current();
      if (typeof p === 'string') {
        info.textContent = '指令約 ' + p.length + ' 字。' + (t.json ? '' : '這項 AI 會用條列回覆，直接在聊天裡看就好，不用貼回來。');
        peek.textContent = p;
      } else {
        info.textContent = p.error + '（到「分集」新增，或先跑「寫分集大綱」）';
        peek.textContent = '';
      }
      pasteBox.style.display = t.json ? '' : 'none';
      report.textContent = '';
    };
    taskSel.addEventListener('change', () => { ui.aiTask = taskSel.value; refresh(); });
    epSel.addEventListener('change', () => { ui.aiEp = epSel.value; refresh(); });

    const doImport = () => {
      report.textContent = '';
      const text = paste.value.trim();
      if (!text) { report.append(h('div', { class: 'report err', text: '先把 AI 的回覆貼到上面。' })); return; }
      let data;
      try { data = C.extractJSON(text); } catch (e) { report.append(h('div', { class: 'report err', text: e.message })); return; }
      const snap = JSON.stringify(project);
      let r;
      try { r = C.merge(project, data); } catch (e) {
        project = C.normalize(JSON.parse(snap));
        report.append(h('div', { class: 'report err', text: '匯入失敗：' + e.message }));
        return;
      }
      ssSet(KEY.undo(project.id), snap);
      saveNow();
      const parts = [];
      const names = { characters: '角色', locations: '場景', props: '道具', episodes: '分集', shots: '分鏡' };
      for (const [k, n] of Object.entries(r.added)) parts.push('新增' + names[k] + ' ' + n);
      for (const [k, n] of Object.entries(r.updated)) parts.push('更新' + (names[k] || (k === 'meta' ? '企劃' : '風格')) + (k === 'meta' || k === 'style' ? '' : ' ' + n));
      for (const [k, n] of Object.entries(r.replaced)) { const e = C.find(project.episodes, k); parts.push('取代' + (e ? '第' + e.no + '集' : k) + '原有 ' + n + ' 鏡'); }
      const issues = C.lint(project, ui.aiTask === 'shots' || ui.aiTask === 'polish' ? ui.aiEp : undefined);
      const errs = issues.filter(x => x.level === 'error');
      report.append(h('div', { class: 'report' },
        h('strong', { text: parts.length ? '已匯入：' + parts.join('，') : '沒有可匯入的內容，請確認是不是貼錯回覆。' }),
        r.notes.length ? h('p', { class: 'small', text: r.notes.join('；') }) : null,
        issues.length ? h('p', { class: 'small', text: '檢查到 ' + issues.length + ' 項提醒' + (errs.length ? '（' + errs.length + ' 項要修）' : '') + '，可以在各分頁的提醒裡看。' }) : null,
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', text: '復原這次匯入', onclick: undoImport }),
          h('button', { type: 'button', class: 'btn primary', text: '去看結果', onclick: () => {
            const dest = { bible: 'setup', episodes: 'episodes', novel: 'episodes', shots: 'shots', polish: 'shots' }[ui.aiTask] || 'plan';
            if (dest === 'shots') ui.ep = ui.aiEp;
            closeSheet();
            go(dest);
          } }))));
      paste.value = '';
      toast('已匯入');
    };

    body.append(
      h('div', { class: 'field' }, h('label', { for: 'aiTask', text: '要 AI 做什麼' }), taskSel),
      epField,
      h('div', { class: 'step' }, h('span', { class: 'step-n', text: '1' }), h('span', { text: '複製指令，按下面的按鈕開一個 AI 貼上' })),
      h('button', { type: 'button', class: 'btn primary block', text: '複製指令', onclick: () => {
        const p = current();
        if (typeof p !== 'string') { toast(p.error, true); return; }
        copy(p, '已複製指令，去 AI 那邊貼上');
      } }),
      info,
      h('div', { class: 'btn-row tool-row' }, T.group('chat').items.slice(0, 4).map(t => toolButton(t, '開')),
        h('button', { type: 'button', class: 'btn', text: '更多 AI', onclick: () => { ui.toolGroup = 'chat'; closeSheet(); go('tools'); } })),
      h('details', null, h('summary', { text: '看指令內容' }), peek),
      pasteBox);
    pasteBox.append(
      h('div', { class: 'step' }, h('span', { class: 'step-n', text: '2' }), h('label', { for: 'aiPaste', text: '把 AI 的回覆整段貼到這裡' })),
      paste,
      h('p', { class: 'tip', text: '說明文字、```json 標記都沒關係，會自動抓出資料。回覆被截斷時，叫 AI「繼續」，把兩段接起來再貼。' }),
      h('div', { class: 'step' }, h('span', { class: 'step-n', text: '3' }), h('span', { text: '匯入' })),
      h('button', { type: 'button', class: 'btn key block', text: '匯入', onclick: doImport }),
      report);
    refresh();
    openSheet('AI 助手', body, () => render());
  }

  function undoImport() {
    const snap = ssGet(KEY.undo(project.id));
    if (!snap) { toast('沒有可以復原的匯入', true); return; }
    try {
      project = C.normalize(JSON.parse(snap));
      sessionStorage.removeItem(KEY.undo(project.id));
      saveNow();
      closeSheet();
      render();
      toast('已復原上一次匯入');
    } catch (e) { toast('復原失敗：' + e.message, true); }
  }

  /* ---------- 專案選單 ---------- */

  function openProjects() {
    saveNow();
    const body = h('div');
    const list = h('div', { class: 'list' });
    for (const it of readIndex()) {
      const cur = it.id === project.id;
      list.append(h('button', { type: 'button', class: 'item', 'aria-current': cur ? 'true' : null, onclick: () => {
        if (cur) { closeSheet(); return; }
        const p = loadProject(it.id);
        if (!p) { toast('這個專案讀不到了，可能被瀏覽器清掉', true); writeIndex(readIndex().filter(x => x.id !== it.id)); openProjects(); return; }
        closeSheet();
        switchTo(p);
      } },
      h('span', { class: 'item-title' }, it.title || '未命名', cur ? h('span', { class: 'chip', text: '目前' }) : null),
      h('span', { class: 'item-sub', text: '更新於 ' + new Date(it.updatedAt).toLocaleString('zh-TW', { hour12: false }) })));
    }
    const hasUndo = !!ssGet(KEY.undo(project.id));
    body.append(list,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn primary', text: '新專案', onclick: () => { closeSheet(); switchTo(C.newProject('新的短劇')); ui.tab = 'plan'; render(); } }),
        h('button', { type: 'button', class: 'btn', text: '載入示範專案', onclick: () => { closeSheet(); switchTo(C.demoProject()); } })),
      hasUndo ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn block', text: '復原上一次 AI 匯入', onclick: undoImport })) : null,
      h('details', null, h('summary', { text: '資料存在哪裡？' }),
        h('p', { class: 'small', text: '只存在這支手機的瀏覽器裡，不會上傳。清除 Safari 網站資料或換手機就會不見，所以記得到「匯出」做備份。加到主畫面後可以離線使用。' })),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn danger block', text: '刪除這個專案', onclick: () => {
        if (!confirm('確定刪除「' + (project.meta.title || '未命名') + '」？刪了就救不回來，建議先備份。')) return;
        lsDel(KEY.p(project.id));
        const rest = readIndex().filter(x => x.id !== project.id);
        writeIndex(rest);
        closeSheet();
        const next = rest.length ? loadProject(rest[0].id) : null;
        project = null;
        switchTo(next || C.newProject('新的短劇'));
        toast('已刪除');
      } })),
      h('p', { class: 'small muted', text: '版本 ' + APP_VER }));
    openSheet('專案', body);
  }

  /* ---------- 啟動 ---------- */

  function go(tab) {
    ui.tab = TABS.includes(tab) ? tab : 'plan';
    lsSet(KEY.tab, ui.tab);
    render();
    window.scrollTo(0, 0);
  }

  function boot() {
    const curId = lsGet(KEY.cur);
    project = (curId && loadProject(curId)) || null;
    if (!project) {
      const idx = readIndex();
      for (const it of idx) { project = loadProject(it.id); if (project) break; }
    }
    // 第一次打開給示範專案：沒有想法的人先看一個完整例子最快上手
    if (!project) project = C.demoProject();
    saveNow();
    ui.tab = TABS.includes(lsGet(KEY.tab)) ? lsGet(KEY.tab) : 'plan';

    for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => go(b.dataset.tab));
    $('#btnAI').addEventListener('click', () => {
      const t = { plan: 'bible', setup: 'bible', episodes: 'episodes', shots: 'shots' }[ui.tab];
      openAI(t, ui.tab === 'shots' ? ui.ep : '');
    });
    $('#btnProject').addEventListener('click', openProjects);
    sheet().addEventListener('click', e => {
      if (e.target.closest('[data-close]') || e.target === sheet()) closeSheet();
    });
    sheet().addEventListener('close', () => { const f = onSheetClose; onSheetClose = null; if (f) f(); });
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveNow();
      else checkVersion();
    });
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* 離線快取失敗不影響使用 */ });
    }
  }

  // 手機上開著的舊頁面發現有新版就自動重載（先存檔）
  async function checkVersion() {
    try {
      const r = await fetch('version.json', { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.json()).v;
      if (v && v !== APP_VER) { saveNow(); location.reload(); }
    } catch (e) { /* 離線時略過 */ }
  }

  window.__dramaApp = { get project() { return project; }, saveNow, APP_VER };
  boot();
})();
