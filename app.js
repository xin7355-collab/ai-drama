/* AI 劇本工坊：介面層。資料邏輯都在 core.js，這裡只管畫面、儲存、複製與分享。
   所有使用者／AI 給的文字一律用 textContent 放進畫面，不用 innerHTML，避免貼上的內容被當成程式執行。
   分頁照製作順序只留「流程、角色、分集、工具」四個：使用者最常卡在「做完這步，下一步是什麼」，
   所以第一頁永遠指出下一步，其他頁只放那一步要用的東西；整部的匯出與備份放在「專案」選單。 */
'use strict';
(function () {
  const APP_VER = '1.3.0';
  const C = window.DramaCore;
  const P = window.DramaPresets;
  const T = window.DramaTools;
  const Ph = window.DramaPhotos;
  const KEY = {
    index: 'aidrama.index',
    cur: 'aidrama.cur',
    tab: 'aidrama.tab',
    p: id => 'aidrama.p.' + id,
    undo: id => 'aidrama.undo.' + id,
    backup: id => 'aidrama.bk.' + id,
    tools: 'aidrama.tools',
  };
  const TABS = ['flow', 'cast', 'eps', 'tools'];
  // 1.2 以前的分頁名稱：手機上存著舊值的人更新後，不要落到空白頁
  const TAB_ALIAS = { plan: 'flow', export: 'flow', setup: 'cast', episodes: 'eps', shots: 'eps' };
  const ui = { tab: 'flow', ep: '', cast: 'characters', aiTask: 'bible', aiEp: '', sheetKind: 'turnaround', sheetOutfit: '', styleOpen: false, toolGroup: 'video', flash: null };
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
  // 原生 el.append(null) 會印出「null」字樣、陣列會變成「[object …]」：可能是空值的地方一律用 fill
  function fill(el) {
    for (let i = 1; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  const $ = s => document.querySelector(s);

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) {
      toast('存不進去：手機的網站儲存空間滿了。請到「專案」選單備份後，刪掉用不到的專案。', true);
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
    toastTimer = setTimeout(() => { t.className = 'toast' + (isErr ? ' err' : ''); }, isErr ? 6000 : 2600);
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

  // iPhone 存檔走分享面板；不能帶 title，否則 iOS 只送出文字、檔案被丟掉。
  // 分享面板只能在點擊的當下打開，所以呼叫前不能再 await 任何東西
  function deliver(name, text, mime) {
    const type = mime || 'text/plain;charset=utf-8';
    deliverBlob(name, new Blob([text], { type }));
  }
  function deliverBlob(name, blob) {
    try {
      const file = new File([blob], name, { type: blob.type });
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
  function ago(iso) {
    const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
    return d <= 0 ? '今天' : d + ' 天前';
  }

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
    const old = readIndex();
    const me = old.find(x => x.id === project.id);
    const idx = old.filter(x => x.id !== project.id);
    // createdAt 給「該備份了」的提醒用：剛建立的專案不要一打開就被催
    idx.unshift({ id: project.id, title: project.meta.title || '未命名', updatedAt: project.updatedAt, createdAt: (me && me.createdAt) || project.updatedAt });
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
    ui.ep = ''; ui.aiEp = ''; ui.flash = null;
    saveNow();
    render();
    refreshPhotos();
  }

  /* ---------- 參考圖（定裝照、場景圖、道具圖） ---------- */

  // 照片存在 IndexedDB；縮圖要同步畫、分享要在點擊當下呼叫，所以先把這個專案的照片讀進記憶體
  const photos = new Map();
  let photoOK = !!Ph;
  let photoGen = 0;
  const PHOTO_LABEL = { characters: '定裝照', locations: '場景參考圖', props: '道具參考圖' };
  const pkey = (coll, id) => coll + '|' + id;
  const hasPhoto = (coll, id) => photos.has(pkey(coll, id));
  const photoURL = (coll, id) => { const x = photos.get(pkey(coll, id)); return x ? x.url : ''; };

  function refreshPhotos() {
    if (!Ph) return Promise.resolve();
    const gen = ++photoGen;
    const pid = project.id;
    return Ph.list(pid).then(rows => {
      if (gen !== photoGen || !project || pid !== project.id) return;
      for (const x of photos.values()) URL.revokeObjectURL(x.url);
      photos.clear();
      for (const r of rows) photos.set(pkey(r.coll, r.id), { blob: r.blob, url: URL.createObjectURL(r.blob) });
      photoOK = true;
      render();
    }).catch(() => {
      // 無痕模式等存不了照片的情況：立刻重畫，卡片才不會顯示做不到的「沒定裝照」提醒
      if (photoOK) { photoOK = false; render(); }
    });
  }

  async function savePhoto(coll, id, file) {
    const blob = await Ph.shrink(file);
    await Ph.put(project.id, coll, id, blob);
    Ph.persist();
    await refreshPhotos();
    let msg = '已存入' + PHOTO_LABEL[coll];
    // 有了定裝照，圖片提示詞就該帶「照參考圖」那句：自動打開並講清楚，免得使用者不知道要去風格設定裡改
    if (coll === 'characters' && project.style.ref !== '定裝照') {
      project.style.ref = '定裝照';
      saveNow();
      msg += '；「生圖參考圖」已改成定裝照，生成每一鏡時記得上傳它';
    }
    toast(msg);
  }
  function removePhoto(coll, id) {
    if (!Ph) return Promise.resolve();
    return Ph.del(project.id, coll, id).then(refreshPhotos);
  }
  function sharePhoto(coll, it) {
    const x = photos.get(pkey(coll, it.id));
    if (x) deliverBlob(safeName(project.meta.title) + '_' + safeName(it.name) + '_' + PHOTO_LABEL[coll] + '.jpg', x.blob);
  }
  function thumb(coll, it) {
    const u = photoURL(coll, it.id);
    return u ? h('img', { class: 'thumb', src: u, alt: '' })
      : h('span', { class: 'thumb ph', 'aria-hidden': 'true', text: String(it.name || '？').slice(0, 1) });
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

  function issuesBlock(list) {
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

  function itemButton(title, sub, onclick) {
    return h('button', { type: 'button', class: 'item', onclick }, h('span', { class: 'item-title', text: title }), sub ? h('span', { class: 'item-sub', text: sub }) : null);
  }

  /* ---------- 編輯器 ---------- */

  // 按了「新增」又什麼都沒填就關掉，不留一筆空白資料
  function isBlank(coll, it) {
    if (coll === 'shots') return !it.action && !(it.lines || []).some(l => l.text) && !it.visualEn;
    if (coll === 'episodes') return !it.title && !it.hook && !it.synopsis;
    return !it.name;
  }
  const isCard = coll => coll === 'characters' || coll === 'locations' || coll === 'props';

  function openEditor(coll, item, isNew) {
    const spec = C.SPEC[coll];
    const body = h('div');
    const form = h('div');
    const promptBox = h('div');
    const preview = h('div');
    // 卡片（角色、場景、道具）上方固定是「參考圖＋參考圖提示詞」：先做出參考圖，是 AI 影片一致性的關鍵
    const drawPrompt = () => {
      promptBox.textContent = '';
      promptBox.append(coll === 'characters' ? sheetBlock(item) : plateBlock(coll, item));
    };
    const drawPreview = () => {
      preview.textContent = '';
      if (coll === 'episodes') { const b = inspoBlock(); if (b) preview.append(b); return; }
      if (coll !== 'shots') return;
      const img = C.imagePrompt(project, item), vid = C.videoPrompt(project, item);
      fill(preview,
        h('h3', { text: '組好的提示詞' }),
        h('div', { class: 'row-head', text: '圖片（先生出這一鏡的關鍵畫面）' }), h('div', { class: 'prompt', text: img }),
        h('div', { class: 'row-head', text: '影片（拿上面的圖做圖生影片）' }), h('div', { class: 'prompt', text: vid }),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', text: '複製圖片提示詞', onclick: () => copy(C.imagePrompt(project, item), '已複製圖片提示詞') }),
          h('button', { type: 'button', class: 'btn', text: '複製影片提示詞', onclick: () => copy(C.videoPrompt(project, item), '已複製影片提示詞') })),
        h('div', { class: 'btn-row' }, toolButton(favTool('image'), '開生圖'), toolButton(favTool('video'), '開影片')),
        h('p', { class: 'tip', text: '「開生圖」「開影片」用的是「工具」分頁設定的常用工具，會另開分頁；先複製好再過去貼上。' }),
        refsBlock(item));
    };
    const onChange = () => {
      if (isCard(coll)) drawPrompt();
      if (coll === 'shots') drawPreview();
      if (coll !== 'shots') $('#sheetTitle').textContent = itemTitle(coll, item);
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
    if (isCard(coll)) drawPrompt();
    drawPreview();
    const del = h('button', { type: 'button', class: 'btn danger block', text: '刪除這個' + spec.label, onclick: () => {
      const refs = refCount(coll, item.id);
      const msg = '確定刪除「' + itemTitle(coll, item) + '」？' + (refs ? '\n有 ' + refs + ' 個分鏡用到它，刪掉後那些分鏡會出現錯誤提醒。' : '') + (coll === 'episodes' ? '\n這一集的分鏡也會一起刪掉。' : '') + (isCard(coll) && hasPhoto(coll, item.id) ? '\n卡片上的照片也會一起刪掉。' : '');
      if (!confirm(msg)) return;
      project[coll] = project[coll].filter(x => x !== item);
      if (coll === 'episodes') { project.shots = project.shots.filter(s => s.ep !== item.id); if (ui.ep === item.id) ui.ep = ''; }
      if (isCard(coll)) removePhoto(coll, item.id).catch(() => {});
      saveNow();
      closeSheet();
      toast('已刪除');
    } });
    fill(body, isCard(coll) ? [photoBlock(coll, item), promptBox] : null, form, preview, h('div', { class: 'btn-row' }, del));
    openSheet(itemTitle(coll, item), body, () => {
      if (isNew && project[coll].includes(item) && isBlank(coll, item)) {
        project[coll] = project[coll].filter(x => x !== item);
        if (isCard(coll)) removePhoto(coll, item.id).catch(() => {});
      }
      saveNow();
      render();
    });
  }

  function photoBlock(coll, item) {
    const wrap = h('div', { class: 'photo-block' });
    const label = PHOTO_LABEL[coll];
    const draw = () => {
      wrap.textContent = '';
      wrap.append(h('div', { class: 'row-head', text: label }));
      if (!photoOK) {
        wrap.append(h('p', { class: 'small muted', text: '這個瀏覽器不能存照片（可能是無痕模式）。改用一般模式打開，或把 App 加到主畫面再試。' }));
        return;
      }
      const u = photoURL(coll, item.id);
      const id = 'photo-' + (++uid);
      const status = h('p', { class: 'small muted', 'aria-live': 'polite' });
      // 用 <label for> 開相簿：iPhone 上用程式去點隱藏的檔案輸入框不一定打得開
      const input = h('input', { type: 'file', id, accept: 'image/*', class: 'visually-hidden' });
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        input.value = '';
        if (!f) return;
        status.textContent = '照片處理中…';
        savePhoto(coll, item.id, f).then(draw, e => { status.textContent = ''; toast(e.message, true); });
      });
      wrap.append(
        u ? h('img', { class: 'photo', src: u, alt: (item.name || '') + '的' + label })
          : h('p', { class: 'small muted', text: '還沒有' + label + '。照下面的提示詞生一張，存到手機相簿，再按「存入照片」選它。' }),
        status,
        h('div', { class: 'btn-row' }, input,
          h('label', { class: 'btn' + (u ? '' : ' primary'), for: id, text: u ? '換一張' : '存入照片' }),
          u ? h('button', { type: 'button', class: 'btn', text: '存到手機', onclick: () => sharePhoto(coll, item) }) : null,
          u ? h('button', { type: 'button', class: 'btn danger', text: '刪除照片', onclick: () => {
            if (!confirm('確定刪除這張' + label + '？')) return;
            removePhoto(coll, item.id).then(draw, e => toast(e.message, true));
          } }) : null));
    };
    draw();
    return wrap;
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
      h('p', { class: 'tip', text: '照這段生一張定裝照，存到手機相簿後按上面的「存入照片」；之後每一鏡都上傳它當參考圖，臉和衣服就不容易跑掉。' }));
    if (!ch.appearance) { wrap.append(h('p', { class: 'small muted', text: '先填下面的外觀錨點（或用選單產生），才能組定裝照提示詞。' })); return wrap; }
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
    h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', text: '複製定裝照提示詞', onclick: () => copy(C.sheetPrompt(project, ch.id, kind.value, fit.value), '已複製' + C.SHEETS[kind.value].label + '提示詞') }),
      toolButton(favTool('image'), '開生圖')));
    return wrap;
  }

  function plateBlock(coll, item) {
    const label = coll === 'locations' ? '場景參考圖提示詞' : '道具參考圖提示詞';
    const text = C.platePrompt(project, coll, item.id);
    const wrap = h('div', null, h('h3', { text: label }));
    if (!text) {
      wrap.append(h('p', { class: 'small muted', text: '先填下面的「' + (coll === 'locations' ? '空間描述' : '外觀') + '（英文）」，才能組提示詞。' }));
      return wrap;
    }
    wrap.append(h('div', { class: 'prompt', text }), h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', text: '複製' + label, onclick: () => copy(C.platePrompt(project, coll, item.id), '已複製' + label) }),
      toolButton(favTool('image'), '開生圖')));
    return wrap;
  }

  // 生成這一鏡時要一起上傳哪些參考圖：直接列出來，點一下存到手機相簿，到生圖工具就選得到
  function refsBlock(shot) {
    const refs = [];
    for (const r of shot.cast || []) { const ch = C.find(project.characters, r.c); if (ch && !refs.some(x => x[1] === ch)) refs.push(['characters', ch]); }
    const loc = C.find(project.locations, shot.loc);
    if (loc) refs.push(['locations', loc]);
    for (const it of shot.items || []) { const pr = C.find(project.props, it.p); if (pr) refs.push(['props', pr]); }
    if (!refs.length) return null;
    const have = refs.filter(([c, it]) => hasPhoto(c, it.id));
    const missing = refs.filter(([c, it]) => c === 'characters' && !hasPhoto(c, it.id)).map(([, it]) => it.name);
    return h('div', { class: 'refs-block' }, h('div', { class: 'row-head', text: '生成這一鏡要上傳的參考圖' }),
      have.length ? h('div', { class: 'refs' }, have.map(([c, it]) => h('button', { type: 'button', class: 'ref', 'aria-label': '把' + it.name + '的' + PHOTO_LABEL[c] + '存到手機', onclick: () => sharePhoto(c, it) }, thumb(c, it), h('span', { text: it.name })))) : null,
      missing.length ? h('p', { class: 'tip', text: missing.join('、') + ' 還沒有定裝照：到「角色」分頁存一張，臉才不會每鏡不同。' })
        : h('p', { class: 'tip', text: '點縮圖可以存到手機相簿，再到生圖或影片工具上傳。' }));
  }

  function inspoBlock() {
    const s = P.story(project.meta.genre);
    if (!s) return null;
    return h('details', null, h('summary', { text: '鉤子與懸念靈感（' + s.genre + '）' }),
      h('div', { class: 'row-head', text: '前 3 秒鉤子' }), h('ul', { class: 'small' }, s.hooks.map(x => h('li', { text: x }))),
      h('div', { class: 'row-head', text: '結尾懸念' }), h('ul', { class: 'small' }, s.cliffs.map(x => h('li', { text: x }))));
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
        list.append(itemButton(title, sub, () => {
          const seed = coll === 'characters' ? P.characterSeed(it.t) : coll === 'locations' ? P.locationSeed(it.name) : P.propSeed(it.name);
          seed.name = uniqueName(coll, seed.name);
          const added = C.newItem(project, coll, seed);
          saveNow();
          toast('已加入' + label + '：' + added.name);
          openEditor(coll, added);
        }));
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

  /* ---------- 分頁 ---------- */

  function render() {
    $('#projTitle').textContent = project.meta.title || '未命名專案';
    document.title = (project.meta.title ? project.meta.title + '｜' : '') + 'AI 劇本工坊';
    for (const b of document.querySelectorAll('.tabs button')) {
      if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    const v = $('#view');
    v.textContent = '';
    v.append({ flow: renderFlow, cast: renderCast, eps: renderEps, tools: renderTools }[ui.tab]());
  }

  /* ----- 流程 ----- */

  function renderFlow() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-flow' });
    fill(card, h('h2', { id: 'h-flow', text: '製作流程' }), backupNag(), pasteBlock('flow'));
    const steps = C.flowSteps(project, hasPhoto);
    card.append(h('ol', { class: 'flow' }, steps.map((s, i) => h('li', null, stepItem(s, i + 1)))),
      lintDetails(C.lint(project), '全劇健檢'), storageTip());
    return card;
  }

  const STEP_TAG = { done: '完成', next: '下一步' };
  function stepItem(s, n) {
    return h('details', { class: 'flow-step', 'data-state': s.state, open: s.state === 'next' },
      h('summary', null,
        h('span', { class: 'fs-n', 'aria-hidden': 'true', text: s.state === 'done' ? '✓' : String(n) }),
        h('span', { class: 'fs-text' }, h('strong', { text: n + '. ' + s.title }), h('span', { class: 'fs-detail', text: s.detail })),
        STEP_TAG[s.state] ? h('span', { class: 'fs-tag', text: STEP_TAG[s.state] }) : (s.optional ? h('span', { class: 'fs-tag', text: '建議' }) : null)),
      h('div', { class: 'fs-body' }, stepBody(s)));
  }

  function stepBody(s) {
    const main = s.state === 'next' ? 'btn primary' : 'btn';
    const ep = C.find(project.episodes, s.ep);
    const p = text => h('p', { class: 'small', text });
    const btn = (text, onclick, cls) => h('button', { type: 'button', class: cls || 'btn', text, onclick });
    if (s.k === 'story') {
      return [p('定好故事方向與畫風，建立角色、場景、道具卡。沒有想法就挑一個故事範本整套套用。'),
        h('div', { class: 'btn-row' }, btn('AI 生成設定集', () => openAI('bible'), main), btn('看角色卡', () => { ui.cast = 'characters'; go('cast'); })),
        storyBlock(), metaBlock(), styleBlock()];
    }
    if (s.k === 'episodes') {
      return [p('讓 AI 照設定集寫每一集的鉤子、衝突、反轉、懸念。在別的 AI 寫好的大綱，直接貼到上面的框就好。'),
        h('div', { class: 'btn-row' }, btn('AI 寫分集大綱', () => openAI('episodes'), main),
          project.episodes.length ? btn('AI 審分集大綱', () => openAI('outline')) : null,
          btn('看分集', () => { ui.ep = ''; go('eps'); }))];
    }
    if (s.k === 'photos') {
      return [p('每個角色生一張定裝照、存進角色卡；之後每一鏡上傳它當參考圖，臉和衣服最不容易跑掉。不做也能往下，但一致性會差很多。'),
        h('div', { class: 'btn-row' }, btn('到角色卡做定裝照', () => { ui.cast = 'characters'; go('cast'); }, main))];
    }
    if (s.k === 'shots') {
      return [p('一集一集讓 AI 拆成 2～10 秒的鏡頭：複製指令貼給 AI，再把回覆貼回上面的框。'),
        h('div', { class: 'btn-row' }, ep ? btn('AI 拆第' + ep.no + '集分鏡', () => openAI('shots', ep.id), main) : null, btn('看分集', () => { ui.ep = ''; go('eps'); }))];
    }
    if (s.k === 'make') {
      return [p('照分鏡卡的「圖片提示詞」生出畫面，再用那張圖貼「影片提示詞」做成影片；做完一鏡就把進度改成「完成」。'),
        h('div', { class: 'btn-row' }, ep ? btn('繼續第' + ep.no + '集', () => openEp(ep.id, s.shot), main) : null,
          toolButton(favTool('image'), '開生圖'), toolButton(favTool('video'), '開影片'))];
    }
    return [p('用提示詞包裡的配音段落配音（每個角色固定同一個音色），匯入字幕檔，照分鏡表的時間碼剪起來。'),
      ep ? h('div', { class: 'btn-row' }, btn('下載第' + ep.no + '集字幕', () => exportEp('srt', ep), main), btn('第' + ep.no + '集提示詞包', () => exportEp('pack', ep)),
        btn('複製第' + ep.no + '集劇本', () => copy(C.exportScript(project, ep.id), '已複製第' + ep.no + '集劇本'))) : null,
      h('div', { class: 'btn-row' }, toolButton(T.group('voice').items[0], '開'), toolButton(T.group('edit').items[0], '開'))];
  }

  function metaBlock() {
    const d = h('details', null, h('summary', { text: '故事設定（劇名、類型、集數、一句話故事…）' }));
    for (const f of C.SPEC.meta.fields) d.append(field(f, project.meta, k => { if (k === 'title') $('#projTitle').textContent = project.meta.title || '未命名專案'; }));
    return d;
  }
  function styleBlock() {
    const d = h('details', { open: ui.styleOpen }, h('summary', { text: '風格與提示詞設定' }), stylePresetField());
    d.addEventListener('toggle', () => { ui.styleOpen = d.open; });
    for (const f of C.SPEC.style.fields) d.append(field(f, project.style));
    return d;
  }

  // 剛建立的專案不催；做了一陣子沒備份、或上次備份後又改過一週以上才提醒
  function backupNag() {
    if (!project.episodes.length && !project.characters.length) return null;
    const last = lsGet(KEY.backup(project.id));
    const me = readIndex().find(x => x.id === project.id);
    const DAY = 86400000;
    const created = me && me.createdAt ? Date.parse(me.createdAt) : Date.now();
    const stale = last ? Date.now() - Date.parse(last) > 7 * DAY && Date.parse(project.updatedAt) > Date.parse(last) : Date.now() - created > DAY;
    if (!stale) return null;
    return h('div', { class: 'hint warn' },
      h('strong', { text: last ? '上次備份是 ' + ago(last) + '，之後又改過' : '這個專案還沒備份過' }),
      h('p', { class: 'small', text: 'Safari 有時會清掉網站資料。備份檔存到「檔案」或傳給自己最保險，照片也會一起備份。' }),
      h('button', { type: 'button', class: 'btn primary', text: '去備份', onclick: openProjects }));
  }

  function storageTip() {
    const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return h('details', null, h('summary', { text: '資料存在哪裡？' }),
      h('p', { class: 'small', text: '專案和照片只存在這支手機的瀏覽器裡，不會上傳。清除 Safari 網站資料或換手機就會不見，所以記得在「專案」選單備份（照片會一起備份）。' }),
      standalone ? null : h('p', { class: 'small', text: '建議用 Safari 的「分享 → 加入主畫面」，以後從主畫面打開：可以離線用，資料也比較不會被系統自動清掉。' }));
  }

  /* ----- 角色、場景、道具卡 ----- */

  const CAST_H = { characters: '角色卡', locations: '場景卡', props: '道具卡' };
  function renderCast() {
    const coll = ui.cast;
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-cast' });
    const sel = h('select', { id: 'castColl', 'aria-label': '要看的卡片種類' },
      ['characters', 'locations', 'props'].map(k => h('option', { value: k, text: C.SPEC[k].label + '（' + project[k].length + '）' })));
    sel.value = coll;
    sel.addEventListener('change', () => { ui.cast = sel.value; render(); });
    card.append(h('h2', { id: 'h-cast', text: CAST_H[coll] }), h('div', { class: 'field' }, sel));
    const speaking = new Set();
    for (const s of project.shots) for (const l of s.lines || []) if (l.text) speaking.add(l.c);
    const list = h('div', { class: 'list' });
    for (const it of project[coll]) {
      const badges = [];
      if (coll === 'characters') {
        if (!it.appearance) badges.push('缺外觀錨點');
        if (photoOK && it.role !== '路人' && !hasPhoto(coll, it.id)) badges.push('沒定裝照');
        if (speaking.has(it.id) && !it.voiceId) badges.push('沒指定音色');
      }
      if (coll === 'locations' && !it.prompt) badges.push('缺英文描述');
      if (coll === 'props' && !it.prompt) badges.push('缺英文外觀');
      const sub = coll === 'characters' ? [it.role, it.age, it.job].filter(Boolean).join('，') : coll === 'locations' ? [it.type, it.desc].filter(Boolean).join('，') : it.desc || '';
      list.append(h('button', { type: 'button', class: 'item with-thumb', onclick: () => openEditor(coll, it) },
        thumb(coll, it),
        h('span', { class: 'item-text' },
          h('span', { class: 'item-title' }, it.name || '（未命名）', badges.map(b => h('span', { class: 'badge', text: b }))),
          sub ? h('span', { class: 'item-sub', text: sub }) : null)));
    }
    if (!project[coll].length) list.append(h('p', { class: 'empty', text: '還沒有' + C.SPEC[coll].label + '。可以自己新增、從範本加入，或用 AI 一次生成整套設定。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', text: '新增' + C.SPEC[coll].label, onclick: () => openEditor(coll, C.newItem(project, coll), true) }),
      h('button', { type: 'button', class: 'btn', text: '從範本加入', onclick: () => openPresetPicker(coll) }),
      h('button', { type: 'button', class: 'btn', text: 'AI 生成設定集', onclick: () => openAI('bible') })));
    if (coll === 'characters') card.append(h('details', null, h('summary', { text: '角色卡怎麼用？' }),
      h('p', { class: 'small', text: 'AI 生成、從範本加入、自己新增的角色都存在這裡，跟著專案走，備份時連照片一起備份。' }),
      h('ol', { class: 'small' },
        h('li', { text: '外觀錨點（英文）：年齡、髮型、體型加一個辨識特徵，寫好就不要每集改。' }),
        h('li', { text: '服裝：每套一段英文描述，分鏡選哪套就帶哪段。' }),
        h('li', { text: '定裝照：複製卡片裡的提示詞去生圖，存回卡片；之後每一鏡上傳它當參考圖。' }),
        h('li', { text: '配音音色：固定一個（例如 ElevenLabs 的某個音色），每集都用同一個。' }))));
    return card;
  }

  /* ----- 分集與分鏡 ----- */

  function renderEps() {
    const ep = ui.ep && C.find(project.episodes, ui.ep);
    if (!ep) { ui.ep = ''; return renderEpList(); }
    return renderEpDetail(ep);
  }

  function epProgress(e) {
    const shots = C.epShots(project, e.id);
    return {
      shots,
      done: shots.filter(s => s.status === '完成').length,
      sec: shots.reduce((a, s) => a + (Number(s.sec) || 0), 0),
      goal: Number(e.seconds) || Number(project.meta.epSeconds) || 0,
    };
  }

  function renderEpList() {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-eps' });
    const eps = sortedEps();
    const split = eps.filter(e => C.epShots(project, e.id).length).length;
    const done = project.shots.filter(s => s.status === '完成').length;
    fill(card, h('h2', { id: 'h-eps', text: '分集' }),
      eps.length ? h('p', { class: 'small muted', text: '共 ' + eps.length + ' 集・已拆分鏡 ' + split + ' 集・完成 ' + done + '／' + project.shots.length + ' 鏡。點一集看分鏡。' }) : null);
    const list = h('div', { class: 'list' });
    for (const e of eps) {
      const pr = epProgress(e);
      list.append(h('button', { type: 'button', class: 'item', onclick: () => openEp(e.id) },
        h('span', { class: 'item-title', text: epLabel(e) }),
        h('span', { class: 'item-sub', text: e.hook ? '鉤子：' + e.hook : '還沒寫前 3 秒鉤子' }),
        h('span', { class: 'item-sub', text: pr.shots.length ? pr.shots.length + ' 鏡・完成 ' + pr.done + '・' + C.clock(pr.sec) + '／' + C.clock(pr.goal) : '還沒拆分鏡' })));
    }
    if (!eps.length) list.append(h('p', { class: 'empty', text: '還沒有分集。讓 AI 寫分集大綱最快，也可以自己新增。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: eps.length ? 'btn' : 'btn primary', text: 'AI 寫分集大綱', onclick: () => openAI('episodes') }),
      eps.length ? h('button', { type: 'button', class: 'btn', text: 'AI 審分集大綱', onclick: () => openAI('outline') }) : null,
      h('button', { type: 'button', class: 'btn', text: '新增一集', onclick: () => openEditor('episodes', C.newItem(project, 'episodes'), true) })));
    return card;
  }

  function renderEpDetail(ep) {
    const card = h('section', { class: 'card', 'aria-labelledby': 'h-ep' });
    const sel = h('select', { id: 'epSel', 'aria-label': '切換集數' }, refOptions('episodes'));
    sel.value = ep.id;
    sel.addEventListener('change', () => { ui.ep = sel.value; render(); });
    card.append(h('div', { class: 'ep-nav' },
      h('button', { type: 'button', class: 'btn back', text: '‹ 全部分集', onclick: () => { ui.ep = ''; render(); window.scrollTo(0, 0); } }), sel),
      h('h2', { id: 'h-ep', text: epLabel(ep) }),
      h('div', { class: 'ep-brief' },
        ep.hook ? h('p', { class: 'small' }, h('b', { text: '鉤子：' }), ep.hook) : null,
        ep.cliffhanger ? h('p', { class: 'small' }, h('b', { text: '懸念：' }), ep.cliffhanger) : null,
        h('button', { type: 'button', class: 'btn', text: '編輯這集大綱', onclick: () => openEditor('episodes', ep) })));
    const pr = epProgress(ep);
    if (pr.shots.length) {
      // 時間軸只負責「看」：短鏡頭的寬度必然小於 44pt，做成按鈕會點不準；要操作就用下面的分鏡卡
      const bar = h('div', { class: 'timeline', role: 'img', 'aria-label': '時間軸：' + pr.shots.length + ' 鏡，已完成 ' + pr.done + ' 鏡，每段寬度是秒數' });
      for (const s of pr.shots) {
        const seg = h('span', { class: 'seg', 'data-st': s.status || '待生成' });
        seg.style.flexGrow = String(Number(s.sec) || 1);
        bar.append(seg);
      }
      const over = pr.goal && Math.abs(pr.sec - pr.goal) > pr.goal * 0.25;
      card.append(h('div', { class: 'timeline-wrap' }, bar,
        h('div', { class: 'timeline-meta' },
          h('span', { class: over ? 'over' : null, text: C.clock(pr.sec) + '／目標 ' + C.clock(pr.goal) }),
          h('span', { text: '完成 ' + pr.done + '／' + pr.shots.length + ' 鏡' }))));
    }
    card.append(lintDetails(C.lint(project, ep.id), '這集的提醒'));
    const list = h('div', { class: 'shots' });
    let t = 0;
    for (const s of pr.shots) { list.append(shotCard(ep, s, t)); t += Number(s.sec) || 0; }
    if (!pr.shots.length) list.append(h('p', { class: 'empty', text: '這集還沒有分鏡。按「AI 拆分鏡」最快：複製指令貼給 AI，再把回覆貼回來。' }));
    card.append(list, h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: pr.shots.length ? 'btn' : 'btn primary', text: 'AI 拆分鏡', onclick: () => openAI('shots', ep.id) }),
      h('button', { type: 'button', class: 'btn', text: '新增分鏡', onclick: () => openEditor('shots', C.newItem(project, 'shots', { ep: ep.id }), true) })),
      h('details', null, h('summary', { text: '匯出這集（提示詞包、字幕、分鏡表、劇本）' }), h('div', { class: 'list' },
        itemButton('提示詞包', '每一鏡的圖片、影片、配音提示詞，最前面是要先做的定裝照。', () => exportEp('pack', ep)),
        itemButton('字幕 .srt', '剪映、CapCut 可直接匯入。', () => exportEp('srt', ep)),
        itemButton('分鏡表 .csv', 'Numbers 或 Excel 打開，剪輯時對照時間碼。', () => exportEp('csv', ep)),
        itemButton('複製劇本', '場次、畫面、對白、音效的純文字，貼給 AI 或傳給別人看。', () => copy(C.exportScript(project, ep.id), '已複製第' + ep.no + '集劇本')),
        itemButton('下載劇本', '同上，存成 .txt。', () => exportEp('script', ep)))),
      h('details', null, h('summary', { text: '更多 AI 工作（審稿、對白去 AI 味、小說版）' }), h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', text: 'AI 審這集分鏡', onclick: () => openAI('review', ep.id) }),
        h('button', { type: 'button', class: 'btn', text: '對白去 AI 味', onclick: () => openAI('polish', ep.id) }),
        h('button', { type: 'button', class: 'btn', text: '寫小說版', onclick: () => openAI('novel', ep.id) }))));
    return card;
  }

  function exportEp(kind, ep) {
    const base = safeName(project.meta.title) + '_第' + ep.no + '集';
    if (kind === 'pack') deliver(base + '_提示詞.txt', C.exportPromptPack(project, ep.id));
    else if (kind === 'csv') deliver(base + '_分鏡表.csv', C.exportCSV(project, ep.id), 'text/csv;charset=utf-8');
    else if (kind === 'srt') deliver(base + '.srt', C.exportSRT(project, ep.id), 'application/x-subrip');
    else deliver(base + '_劇本.txt', C.exportScript(project, ep.id));
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

  /* ----- 工具 ----- */

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
    fill(card, h('div', { class: 'field' }, sel), g.tip ? h('p', { class: 'tip', text: g.tip }) : null,
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

  /* ---------- 貼上 AI 回覆與匯入 ---------- */

  // 「流程」頁和 AI 助手共用同一個貼上框：一貼上就先預覽這段是什麼、會改什麼，按匯入才真的改
  function pasteBlock(where) {
    const id = where + 'Paste';
    const ta = h('textarea', { id, rows: where === 'flow' ? 3 : 6, class: 'mono', placeholder: '長按 → 貼上' });
    const hint = h('div', { 'aria-live': 'polite' });
    const report = h('div', { 'aria-live': 'polite' });
    let timer = null;
    const detect = () => {
      hint.textContent = '';
      const text = ta.value.trim();
      if (!text) return;
      const pv = C.preview(project, text);
      if (!pv.ok) { hint.append(h('div', { class: 'report err', text: pv.error })); return; }
      hint.append(h('div', { class: 'report' },
        h('strong', { text: pv.parts.length ? '偵測到：' + pv.parts.join('，') : '這段讀得到資料，但沒有可以匯入的內容：請確認是不是貼錯回覆' }),
        pv.warns.map(w => h('p', { class: 'small', text: '注意：' + w })),
        pv.newErrors.length ? h('p', { class: 'small', text: '匯入後會有 ' + pv.newErrors.length + ' 個錯誤，例如「' + pv.newErrors[0].where + '：' + pv.newErrors[0].msg + '」' }) : null,
        pv.parts.length ? h('p', { class: 'small muted', text: '沒問題就按「匯入」，匯入後也能復原。' }) : null));
    };
    ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(detect, 250); });
    const btn = h('button', { type: 'button', class: 'btn key block', text: '匯入', onclick: () => { clearTimeout(timer); doImport(ta, hint, report, where); } });
    if (where === 'flow' && ui.flash) report.append(importReport(ui.flash));
    return h('div', { class: 'paste' },
      h('label', { for: id, class: 'row-head', text: '把 AI 的回覆整段貼到這裡' }),
      where === 'flow' ? h('p', { class: 'tip', text: '不管是哪一步、從哪個 AI 拿到的回覆都貼這裡：會先告訴你這段是什麼、會改什麼。' }) : null,
      ta, hint, btn, report,
      where === 'flow' ? null : h('p', { class: 'tip', text: '說明文字、```json 標記都沒關係，會自動抓出資料。回覆被截斷時，叫 AI「繼續」，把兩段接起來再貼。' }));
  }

  function doImport(ta, hint, report, where) {
    report.textContent = '';
    const text = ta.value.trim();
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
    const issues = C.lint(project);
    const flash = { parts: C.reportParts(project, r), notes: r.notes, issues: issues.length, errs: issues.filter(x => x.level === 'error').length, dest: C.destOf(data) };
    ta.value = '';
    hint.textContent = '';
    toast('已匯入');
    // 流程頁要重畫（步驟狀態變了），報告先記在 ui 裡，重畫後照樣顯示
    if (where === 'flow') { ui.flash = flash; render(); return; }
    report.append(importReport(flash));
  }

  function importReport(f) {
    return h('div', { class: 'report' },
      h('strong', { text: f.parts.length ? '已匯入：' + f.parts.join('，') : '沒有可匯入的內容，請確認是不是貼錯回覆。' }),
      f.notes.length ? h('p', { class: 'small', text: f.notes.join('；') }) : null,
      f.issues ? h('p', { class: 'small', text: '檢查到 ' + f.issues + ' 項提醒' + (f.errs ? '（' + f.errs + ' 項要修）' : '') + '，在「流程」的全劇健檢和各集裡看得到。' }) : null,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', text: '復原這次匯入', onclick: undoImport }),
        h('button', { type: 'button', class: 'btn primary', text: '去看結果', onclick: () => goDest(f.dest) })));
  }

  function goDest(d) {
    ui.flash = null;
    closeSheet();
    if (d.tab === 'eps') ui.ep = d.ep && C.find(project.episodes, d.ep) ? d.ep : '';
    go(d.tab);
  }

  function undoImport() {
    const snap = ssGet(KEY.undo(project.id));
    if (!snap) { toast('沒有可以復原的匯入', true); return; }
    try {
      project = C.normalize(JSON.parse(snap));
      sessionStorage.removeItem(KEY.undo(project.id));
      ui.flash = null;
      saveNow();
      closeSheet();
      render();
      toast('已復原上一次匯入');
    } catch (e) { toast('復原失敗：' + e.message, true); }
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
    pasteBox.append(h('div', { class: 'step' }, h('span', { class: 'step-n', text: '2' }), h('span', { text: '把 AI 的回覆貼回來，按匯入' })), pasteBlock('ai'));

    const current = () => {
      try { return C.aiPrompt(ui.aiTask, project, ui.aiEp); } catch (e) { return { error: e.message }; }
    };
    const refresh = () => {
      const t = C.TASKS[ui.aiTask];
      epField.style.display = t.needEp ? '' : 'none';
      const p = current();
      if (typeof p === 'string') {
        info.textContent = '指令約 ' + p.length + ' 字。' + (!t.json ? '這項 AI 會用條列回覆，直接在聊天裡看就好，不用貼回來。' : t.partial ? 'AI 會先條列問題，最後附上要改的集；要採用就整段貼回來，沒附 JSON 就不用貼。' : '');
        peek.textContent = p;
      } else {
        info.textContent = p.error + '（先到「分集」新增一集，或讓 AI 寫分集大綱）';
        peek.textContent = '';
      }
      pasteBox.style.display = t.json ? '' : 'none';
    };
    taskSel.addEventListener('change', () => { ui.aiTask = taskSel.value; refresh(); });
    epSel.addEventListener('change', () => { ui.aiEp = epSel.value; refresh(); });

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
    refresh();
    openSheet('AI 助手', body, () => render());
  }

  /* ---------- 專案選單 ---------- */

  // 備份要在點擊當下就交給分享面板（iOS 規定），所以打開選單時先把照片轉好放著
  async function backupPayload() {
    const obj = JSON.parse(JSON.stringify(project));
    let n = 0, fail = 0;
    if (photos.size) obj._photos = {};
    for (const [k, x] of photos) {
      try { obj._photos[k] = await Ph.toDataURL(x.blob); n++; } catch (e) { fail++; }
    }
    return { text: JSON.stringify(obj), n, fail };
  }

  function restoreFrom(input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { toast('檔案超過 60MB，不像這個 App 的備份', true); return; }
    const r = new FileReader();
    r.onload = async () => {
      let raw, p;
      try { raw = JSON.parse(r.result); p = C.normalize(raw); } catch (e) { toast('這個檔案不是有效的備份：' + e.message, true); return; }
      if (readIndex().some(x => x.id === p.id)) p.id = C.newProject().id;
      let ok = 0, bad = 0;
      const ph = raw && raw._photos && typeof raw._photos === 'object' ? raw._photos : {};
      for (const [k, v] of Object.entries(ph)) {
        const parts = k.split('|');
        const coll = parts[0], id = parts.slice(1).join('|');
        const blob = Ph && isCard(coll) && C.find(p[coll], id) ? Ph.fromDataURL(v) : null;
        if (!blob) { bad++; continue; }
        try { await Ph.put(p.id, coll, id, blob); ok++; } catch (e) { bad++; }
      }
      closeSheet();
      switchTo(p);
      toast('已還原成新專案：' + (p.meta.title || '未命名') + (ok ? '（含 ' + ok + ' 張照片）' : '') + (bad ? '；有 ' + bad + ' 張照片沒還原成功' : ''), bad > 0);
    };
    r.onerror = () => toast('讀檔失敗，請再選一次', true);
    r.readAsText(f);
  }

  function openProjects() {
    saveNow();
    let payload = null;
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
    const last = lsGet(KEY.backup(project.id));
    const base = safeName(project.meta.title);
    const bkSub = '換手機、清 Safari 資料前一定要做。' + (last ? '上次備份：' + ago(last) : '還沒備份過');
    const bk = itemButton('備份專案（含照片）', '整理照片中…', () => {
      deliver(base + '_備份_' + new Date().toISOString().slice(0, 10) + '.json', payload.text, 'application/json');
      lsSet(KEY.backup(project.id), new Date().toISOString());
      if (payload.fail) toast('有 ' + payload.fail + ' 張照片讀不到，這次只備份了文字與其他照片', true);
    });
    // 照片轉成文字要一點時間，轉好之前不給按：iOS 規定分享面板要在點擊當下打開，不能點了再等
    bk.disabled = true;
    const ready = x => { payload = x; bk.disabled = false; bk.querySelector('.item-sub').textContent = bkSub; };
    backupPayload().then(ready, () => ready({ text: JSON.stringify(project), n: 0, fail: photos.size }));
    const file = h('input', { type: 'file', id: 'importFile', accept: '.json,application/json', class: 'visually-hidden' });
    file.addEventListener('change', () => restoreFrom(file));
    const hasUndo = !!ssGet(KEY.undo(project.id));
    fill(body, list,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn primary', text: '新專案', onclick: () => { closeSheet(); switchTo(C.newProject('新的短劇')); go('flow'); } }),
        h('button', { type: 'button', class: 'btn', text: '載入示範專案', onclick: () => { closeSheet(); switchTo(C.demoProject()); } })),
      h('h3', { text: '這個專案' }),
      h('div', { class: 'list' },
        bk,
        file,
        h('label', { class: 'item', for: 'importFile' }, h('span', { class: 'item-title', text: '從備份還原' }), h('span', { class: 'item-sub', text: '會另開一個專案，不會蓋掉現在這個。' }))),
      h('details', null, h('summary', { text: '匯出整部（劇本、提示詞包、分鏡表、設定集）' }), h('div', { class: 'list' },
        itemButton('複製整部劇本', '全部集數的劇本純文字。', () => copy(C.exportScript(project, ''), '已複製整部劇本')),
        itemButton('整部提示詞包', '全部集數的圖片、影片、配音提示詞。', () => deliver(base + '_提示詞.txt', C.exportPromptPack(project, ''))),
        itemButton('整部分鏡表 .csv', '全部集數一張表。', () => deliver(base + '_分鏡表.csv', C.exportCSV(project, ''), 'text/csv;charset=utf-8')),
        itemButton('複製設定集', 'Markdown，貼給任何 AI 當背景資料。', () => copy(C.exportMarkdown(project), '已複製設定集')))),
      hasUndo ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn block', text: '復原上一次 AI 匯入', onclick: undoImport })) : null,
      storageTip(),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn danger block', text: '刪除這個專案', onclick: () => {
        if (!confirm('確定刪除「' + (project.meta.title || '未命名') + '」？刪了就救不回來，建議先備份。')) return;
        lsDel(KEY.p(project.id));
        lsDel(KEY.backup(project.id));
        if (Ph) Ph.delProject(project.id).catch(() => {});
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
    ui.tab = TABS.includes(tab) ? tab : 'flow';
    if (ui.tab !== 'flow') ui.flash = null;
    lsSet(KEY.tab, ui.tab);
    render();
    window.scrollTo(0, 0);
  }

  function openEp(id, shotId) {
    ui.ep = id;
    go('eps');
    const el = shotId && document.getElementById('shot-' + shotId);
    if (el) el.scrollIntoView({ block: 'center' });
  }

  // 右上角「AI 助手」依目前所在的位置預選工作：使用者不用自己判斷該選哪一項
  function aiForHere() {
    if (ui.tab === 'eps') return ui.ep ? openAI('shots', ui.ep) : openAI('episodes');
    if (ui.tab === 'cast') return openAI('bible');
    if (ui.tab === 'flow') {
      const n = C.flowSteps(project, hasPhoto).find(s => s.state === 'next');
      const task = n && { story: 'bible', episodes: 'episodes', shots: 'shots' }[n.k];
      if (task) return openAI(task, n.ep);
    }
    return openAI();
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
    const saved = lsGet(KEY.tab);
    const tab = TAB_ALIAS[saved] || saved;
    ui.tab = TABS.includes(tab) ? tab : 'flow';

    for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => go(b.dataset.tab));
    $('#btnAI').addEventListener('click', aiForHere);
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
    refreshPhotos();
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
