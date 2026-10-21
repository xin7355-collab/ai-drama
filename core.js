/* AI 劇本工坊核心：資料結構、驗證、AI 指令、提示詞組裝、匯出。
   沒有外部相依、不碰 DOM，所以同一份檔案給瀏覽器（window.DramaCore）與 Node 測試（require）共用。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DramaCore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const SCHEMA = 'ai-drama/1';
  // 中文口語約每秒 4～5 字；取 4.5，超過就會唸不完或被配音工具加速到不自然
  const CHARS_PER_SEC = 4.5;
  // 防止貼上超大內容把 localStorage（約 5MB）塞爆
  const LIMIT = { str: 20000, arr: 3000 };
  const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

  const OPT = {
    genre: ['隨機', '懸疑', '甜寵', '逆襲', '重生', '復仇', '職場', '家庭', '奇幻', '科幻', '恐怖', '喜劇', '古裝', '校園', '都市異能'],
    format: ['9:16 直式', '16:9 橫式', '1:1 方形'],
    role: ['主角', '反派', '配角', '路人'],
    size: ['大遠景', '遠景', '全景', '中景', '近景', '特寫', '大特寫'],
    angle: ['平視', '俯拍', '仰拍', '鳥瞰', '過肩', '主觀', '傾斜'],
    move: ['固定', '推', '拉', '搖', '移', '跟', '升降', '環繞', '手持'],
    time: ['清晨', '白天', '黃昏', '夜', '深夜'],
    locType: ['內景', '外景'],
    status: ['待生成', '圖OK', '影片OK', '配音OK', '完成', '重做'],
    trans: ['直切', '淡入', '淡出', '溶接', '閃白', '黑場'],
    videoLang: ['英文', '中文'],
    ref: ['不用', '定裝照'],
    textDir: ['字朝角色', '字朝鏡頭', '不露字'],
    videoLines: ['帶對白', '不帶（另外配音）'],
  };

  const EN = {
    size: { '大遠景': 'extreme wide shot', '遠景': 'wide shot', '全景': 'full body shot', '中景': 'medium shot', '近景': 'medium close-up', '特寫': 'close-up', '大特寫': 'extreme close-up' },
    angle: { '平視': 'eye-level angle', '俯拍': 'high angle', '仰拍': 'low angle', '鳥瞰': "bird's-eye view", '過肩': 'over-the-shoulder shot', '主觀': 'POV shot', '傾斜': 'dutch angle' },
    move: { '固定': 'static camera', '推': 'slow push-in', '拉': 'slow pull-out', '搖': 'slow pan', '移': 'lateral tracking shot', '跟': 'follow shot', '升降': 'crane shot', '環繞': 'orbit around the subject', '手持': 'handheld camera, subtle shake' },
    time: { '清晨': 'early morning light', '白天': 'daytime', '黃昏': 'golden hour dusk', '夜': 'night', '深夜': 'late night, dim' },
    format: { '9:16 直式': 'vertical 9:16 composition', '16:9 橫式': 'widescreen 16:9 composition', '1:1 方形': 'square 1:1 composition' },
  };

  // 欄位定義是唯一真相：表單、匯入清理、AI 欄位規則、Markdown 模板都從這裡產生，避免四處不同步
  const SPEC = {
    meta: { label: '企劃', single: true, fields: [
      { k: 'title', l: '劇名', tip: '4～8 字，帶懸念或反差' },
      { k: 'genre', l: '類型', opts: OPT.genre, def: '隨機' },
      { k: 'format', l: '畫面比例', opts: OPT.format, def: '9:16 直式' },
      { k: 'episodes', l: '集數', type: 'num', def: 10, min: 1, max: 200 },
      { k: 'epSeconds', l: '每集秒數', type: 'num', def: 90, min: 15, max: 1800, tip: '直式短劇常見 60～120 秒' },
      { k: 'idea', l: '一句想法', type: 'area', tip: '可留空，AI 會自己發想' },
      { k: 'logline', l: '一句話故事', type: 'area', tip: '誰＋想要什麼＋被什麼擋住＋失敗的代價' },
      { k: 'hook', l: '核心賣點', type: 'area', tip: '觀眾為什麼要一集接一集看' },
      { k: 'audience', l: '目標觀眾' },
      { k: 'tone', l: '調性', tip: '例：冷調懸疑、輕快甜' },
      { k: 'theme', l: '主題' },
    ] },
    style: { label: '風格', single: true, fields: [
      { k: 'look', l: '畫風', tip: '例：寫實電影感、日系動漫、3D 動畫', def: '寫實電影感' },
      { k: 'era', l: '時代背景' },
      { k: 'palette', l: '色調（英文）', tip: '例：muted teal and amber' },
      { k: 'lighting', l: '預設光線（英文）', tip: '例：soft cinematic lighting' },
      { k: 'prefix', l: '圖片提示詞開頭（英文）', type: 'area', def: 'cinematic film still, photorealistic, 35mm lens' },
      { k: 'suffix', l: '圖片提示詞結尾（英文）', type: 'area', def: 'highly detailed, sharp focus, natural skin texture' },
      { k: 'negative', l: '負面提示詞（英文）', type: 'area', def: 'text, subtitles, watermark, logo, extra fingers, deformed hands, blurry face, duplicate person' },
      { k: 'videoLang', l: '影片提示詞語言', opts: OPT.videoLang, def: '英文', tip: '看你用的影片工具吃哪種' },
      { k: 'maxShotSec', l: '單鏡上限秒數', type: 'num', def: 10, min: 2, max: 30, tip: '依影片工具單段上限填' },
      { k: 'ref', l: '生圖參考圖', opts: OPT.ref, def: '不用', tip: '生圖工具可以上傳定裝照時選「定裝照」，圖片提示詞會加上「照參考圖保留長相與服裝」' },
      { k: 'videoLines', l: '影片提示詞的對白', opts: OPT.videoLines, def: '帶對白', tip: '會自己出聲的影片工具選「帶對白」；配音另外做就選「不帶」，只留嘴型提示' },
      { k: 'music', l: '配樂風格' },
      { k: 'subtitle', l: '字幕樣式', def: '白字細黑邊，畫面下方三分之一' },
    ] },
    characters: { label: '角色', prefix: 'c', fields: [
      { k: 'name', l: '名字', req: true },
      { k: 'role', l: '定位', opts: OPT.role },
      { k: 'age', l: '年齡' },
      { k: 'gender', l: '性別' },
      { k: 'job', l: '身分' },
      { k: 'personality', l: '性格', type: 'area' },
      { k: 'desire', l: '想要什麼', tip: '外在目標，要具體' },
      { k: 'fear', l: '害怕什麼' },
      { k: 'secret', l: '秘密', tip: '反轉多半從這裡來' },
      { k: 'arc', l: '角色弧線', type: 'area', tip: '從什麼樣的人變成什麼樣的人' },
      { k: 'speech', l: '說話方式', tip: '句子長短、口頭禪、用詞習慣' },
      { k: 'appearance', l: '外觀錨點（英文）', type: 'area', req: true, tip: '每張圖都用這一段：年齡、臉型、髮型髮色、體型、一個辨識特徵' },
      { k: 'outfits', l: '服裝', type: 'rows', prefix: 'o', sub: [{ k: 'name', l: '名稱' }, { k: 'prompt', l: '英文描述' }] },
      { k: 'refImage', l: '定裝照備註', tip: '參考圖檔名或 seed，換工具時對照用' },
      { k: 'voice', l: '聲線', tip: '給配音工具：例 低沉、語速慢、尾音上揚' },
      { k: 'voiceId', l: '配音音色', tip: '工具＋音色名稱，例：ElevenLabs 自建音色「林夏-01」。每集都用同一個，聲音才不會像換了人' },
    ] },
    locations: { label: '場景', prefix: 'l', fields: [
      { k: 'name', l: '名稱', req: true },
      { k: 'type', l: '內外景', opts: OPT.locType },
      { k: 'desc', l: '描述', type: 'area' },
      { k: 'prompt', l: '空間描述（英文）', type: 'area', req: true, tip: '只寫空間與陳設，不要放人物' },
      { k: 'lighting', l: '光線（英文）' },
      { k: 'ambience', l: '環境音' },
    ] },
    props: { label: '道具', prefix: 'p', fields: [
      { k: 'name', l: '名稱', req: true },
      { k: 'desc', l: '劇情作用', type: 'area' },
      { k: 'prompt', l: '外觀（英文）', type: 'area' },
      { k: 'owner', l: '持有人', ref: 'characters' },
    ] },
    episodes: { label: '分集', prefix: 'e', fields: [
      { k: 'no', l: '第幾集', type: 'num', req: true, min: 1, max: 999 },
      { k: 'title', l: '標題' },
      { k: 'hook', l: '前 3 秒鉤子', type: 'area', tip: '第一個畫面就要讓人停下來' },
      { k: 'synopsis', l: '劇情', type: 'area' },
      { k: 'conflict', l: '衝突', type: 'area' },
      { k: 'twist', l: '反轉', type: 'area' },
      { k: 'cliffhanger', l: '結尾懸念', type: 'area', tip: '停在讓人想點下一集的地方' },
      { k: 'seconds', l: '目標秒數', type: 'num', min: 10, max: 3600 },
      { k: 'source', l: '小說版／原文', type: 'area', tip: '可選：先寫成小說再轉分鏡' },
    ] },
    shots: { label: '分鏡', prefix: 's', fields: [
      { k: 'ep', l: '集', ref: 'episodes', req: true },
      { k: 'scene', l: '場次', type: 'num', def: 1, min: 1, max: 999 },
      { k: 'order', l: '順序', type: 'num', min: 1, max: 9999 },
      { k: 'sec', l: '秒數', type: 'num', def: 5, min: 1, max: 60 },
      { k: 'loc', l: '場景', ref: 'locations' },
      { k: 'time', l: '時段', opts: OPT.time },
      { k: 'size', l: '景別', opts: OPT.size },
      { k: 'angle', l: '角度', opts: OPT.angle },
      { k: 'move', l: '運鏡', opts: OPT.move },
      { k: 'cast', l: '出場角色', type: 'rows', sub: [{ k: 'c', l: '角色', ref: 'characters' }, { k: 'outfit', l: '服裝', ref: 'outfits' }, { k: 'expr', l: '表情' }, { k: 'state', l: '狀態（英文）' }], tip: '狀態寫當下看得見的變化，例：rain-soaked hair、a fresh cut on the left cheek；同一場戲要延續' },
      { k: 'items', l: '道具', type: 'rows', sub: [{ k: 'p', l: '道具', ref: 'props' }, { k: 'state', l: '拿法或位置（英文）' }], tip: '例：in his right hand、on the counter、torn in half。同一場戲沒有劇情原因不要換手或消失' },
      { k: 'action', l: '畫面動作', type: 'area', req: true },
      { k: 'visualEn', l: '畫面描述（英文）', type: 'area', tip: '不寫人名，用外觀或身分指稱' },
      { k: 'motionEn', l: '動態描述（英文）', type: 'area' },
      { k: 'extrasEn', l: '其他人（英文）', type: 'area', tip: '敵人、手下、路人等沒有角色卡的人。外型寫得跟主角明顯不同（不同髮型、服裝、面罩），AI 才不會把主角的臉複製進人群' },
      { k: 'textDir', l: '文字朝向', opts: OPT.textDir, tip: '寫字、看手機、看文件的鏡頭才要選。字朝鏡頭只能配過肩或主觀鏡頭；可讀的字一律後製再加' },
      { k: 'lines', l: '對白', type: 'rows', sub: [{ k: 'c', l: '誰', ref: 'characters', extra: ['旁白'] }, { k: 'text', l: '台詞' }, { k: 'emo', l: '情緒' }] },
      { k: 'sfx', l: '音效' },
      { k: 'bgm', l: '配樂' },
      { k: 'trans', l: '轉場', opts: OPT.trans },
      { k: 'status', l: '進度', opts: OPT.status, def: '待生成' },
      { k: 'note', l: '備註', type: 'area' },
    ] },
  };
  const COLLECTIONS = ['characters', 'locations', 'props', 'episodes', 'shots'];

  /* ---------- 基本工具 ---------- */

  function str(v, max) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return '';
    const s = String(v).trim();
    return s.length > (max || LIMIT.str) ? s.slice(0, max || LIMIT.str) : s;
  }
  function num(v, f) {
    const n = Number(v);
    if (!Number.isFinite(n)) return f.def !== undefined ? f.def : null;
    let x = Math.round(n * 10) / 10;
    if (f.min !== undefined && x < f.min) x = f.min;
    if (f.max !== undefined && x > f.max) x = f.max;
    return x;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nextId(prefix, list) {
    let max = 0;
    for (const it of list || []) {
      const m = new RegExp('^' + prefix + '(\\d+)$').exec(it && it.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return prefix + (max + 1);
  }
  function byOrder(a, b) {
    return (a.scene || 0) - (b.scene || 0) || (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id));
  }
  function find(list, id) { return (list || []).find(x => x.id === id); }

  /* ---------- 專案 ---------- */

  function defaultsFor(spec) {
    const o = {};
    for (const f of spec.fields) {
      if (f.def !== undefined) o[f.k] = f.def;
      else if (f.type === 'rows') o[f.k] = [];
    }
    return o;
  }

  function newProject(title) {
    const p = {
      schema: SCHEMA,
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      updatedAt: new Date().toISOString(),
      meta: defaultsFor(SPEC.meta),
      style: defaultsFor(SPEC.style),
    };
    for (const c of COLLECTIONS) p[c] = [];
    if (title) p.meta.title = str(title, 60);
    return p;
  }

  function newItem(project, coll, seed) {
    const spec = SPEC[coll];
    const it = Object.assign(defaultsFor(spec), seed || {});
    if (coll === 'shots') {
      const same = project.shots.filter(s => s.ep === it.ep);
      it.id = shotId(project, it.ep);
      it.order = same.length ? Math.max.apply(null, same.map(s => s.order || 0)) + 1 : 1;
      const last = same.sort(byOrder)[same.length - 1];
      if (last) { it.scene = last.scene; it.loc = last.loc; it.time = last.time; }
    } else {
      it.id = nextId(spec.prefix, project[coll]);
      if (coll === 'episodes') it.no = project.episodes.length ? Math.max.apply(null, project.episodes.map(e => e.no || 0)) + 1 : 1;
    }
    project[coll].push(it);
    return it;
  }

  function shotId(project, ep) {
    let n = 1;
    const ids = new Set(project.shots.map(s => s.id));
    while (ids.has(ep + '-' + String(n).padStart(2, '0'))) n++;
    return ep + '-' + String(n).padStart(2, '0');
  }

  // 只清理「有出現的欄位」：AI 回傳的局部修改（例如只改對白）不能把其他欄位洗掉
  function cleanFields(spec, src, partial) {
    const out = {};
    for (const f of spec.fields) {
      if (f.k in src) {
        const v = cleanValue(f, src[f.k]);
        if (v !== null) out[f.k] = v;
      } else if (!partial && f.def !== undefined) out[f.k] = f.def;
    }
    return out;
  }

  function cleanValue(f, v) {
    if (f.type === 'num') return num(v, f);
    if (f.type === 'rows') return cleanRows(f, v);
    if (f.opts) {
      const s = str(v, 40);
      return s === '' || f.opts.includes(s) ? s : closestOpt(f.opts, s);
    }
    return str(v, f.type === 'area' ? LIMIT.str : 500);
  }

  function cleanRows(f, v) {
    const rows = (Array.isArray(v) ? v.slice(0, 50) : []).filter(r => r && typeof r === 'object').map(r => {
      const row = {};
      if (f.prefix) row.id = ID_RE.test(String(r.id || '')) ? String(r.id) : '';
      for (const s of f.sub) row[s.k] = str(r[s.k], 2000);
      return row;
    });
    if (f.prefix) rows.forEach((r, i) => { if (!r.id) r.id = nextId(f.prefix, rows.filter((_, j) => j !== i)); });
    return rows;
  }

  // AI 常把「特寫鏡頭」「close-up」寫進選項欄位；能對應就對應，對不上才留原字串讓 lint 提醒
  function closestOpt(opts, s) {
    for (const o of opts) if (s.includes(o)) return o;
    if (s.length >= 2) for (const o of opts) if (o.includes(s)) return o;
    const low = s.toLowerCase();
    // 長的先比：extreme close-up 不能先被 close-up 吃掉
    const pairs = [];
    for (const group of Object.values(EN)) for (const [zh, en] of Object.entries(group)) if (opts.includes(zh)) pairs.push([zh, en.split(',')[0].toLowerCase()]);
    pairs.sort((a, b) => b[1].length - a[1].length);
    for (const [zh, en] of pairs) if (low.includes(en)) return zh;
    return s;
  }

  function normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const p = newProject();
    if (ID_RE.test(String(src.id || ''))) p.id = src.id;
    if (src.updatedAt) p.updatedAt = str(src.updatedAt, 40);
    p.meta = Object.assign(p.meta, cleanFields(SPEC.meta, src.meta || {}, true));
    p.style = Object.assign(p.style, cleanFields(SPEC.style, src.style || {}, true));
    for (const c of COLLECTIONS) {
      const arr = Array.isArray(src[c]) ? src[c].slice(0, LIMIT.arr) : [];
      const seen = new Set();
      for (const it of arr) {
        if (!it || typeof it !== 'object') continue;
        const o = cleanFields(SPEC[c], it, false);
        let id = ID_RE.test(String(it.id || '')) ? String(it.id) : '';
        if (!id || seen.has(id)) id = c === 'shots' ? shotId(p, o.ep || 'x') : nextId(SPEC[c].prefix, p[c]);
        seen.add(id);
        o.id = id;
        p[c].push(o);
      }
    }
    return p;
  }

  /* ---------- 從 AI 回覆抽出 JSON ---------- */

  // AI 回覆常夾說明文字、```json 圍欄、尾逗號、字串裡直接換行；逐一容錯，仍失敗才報錯
  function extractJSON(text) {
    const t = String(text || '').replace(/^\uFEFF/, '');
    const start = t.search(/[{[]/);
    if (start < 0) throw new Error('找不到 JSON：請確認貼上的是 AI 的完整回覆');
    const buf = sliceBalanced(t, start);
    if (buf === null) throw new Error('JSON 不完整：AI 回覆可能被截斷，請叫它「繼續」或改成分段輸出');
    let v;
    try {
      v = JSON.parse(buf.replace(/,\s*([}\]])/g, '$1'));
    } catch (e) {
      throw new Error('JSON 格式錯誤（' + e.message + '）：請叫 AI「只輸出合法 JSON」後重貼');
    }
    return Array.isArray(v) ? wrapArray(v) : v;
  }

  // 從 start 起切出第一個完整的 {…} 或 […]；字串裡的括號不算，字串裡的真換行改成 \n
  function sliceBalanced(t, start) {
    let depth = 0, inStr = false, esc = false, buf = '';
    for (let i = start; i < t.length; i++) {
      const ch = t[i];
      if (inStr) {
        buf += inStringChar(ch, esc);
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      buf += ch;
      if (ch === '"') inStr = true;
      else if (ch === '{' || ch === '[') depth++;
      else if ((ch === '}' || ch === ']') && --depth === 0) return buf;
    }
    return null;
  }
  function inStringChar(ch, escaped) {
    if (escaped) return ch;
    if (ch === '\n') return '\\n';
    if (ch === '\t') return '\\t';
    return ch === '\r' ? '' : ch;
  }

  // AI 有時只回一個陣列；看內容猜是哪一類，猜不出來就請使用者重問，不要亂塞
  function wrapArray(v) {
    const first = v.find(x => x && typeof x === 'object') || {};
    const has = keys => keys.some(k => k in first);
    if (has(['sec', 'ep', 'visualEn'])) return { shots: v };
    if (has(['appearance', 'outfits'])) return { characters: v };
    if (has(['hook', 'cliffhanger', 'synopsis'])) return { episodes: v };
    throw new Error('AI 只回了一個陣列，看不出是什麼資料：請叫它照範例用 {…} 包起來');
  }

  /* ---------- 匯入合併 ---------- */

  // 依名字也找得到：AI 偶爾會在 cast 裡寫「林夏」而不是 c1
  function resolveRef(project, coll, v, idMap) {
    if (!v) return '';
    if (idMap && idMap[coll] && idMap[coll][v]) return idMap[coll][v];
    if (find(project[coll], v)) return v;
    const byName = (project[coll] || []).find(x => x.name === v);
    return byName ? byName.id : v;
  }

  function merge(project, data, opts) {
    const o = opts || {};
    const report = { added: {}, updated: {}, replaced: {}, notes: [] };
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('匯入內容不是 JSON 物件');
    const known = ['meta', 'style', '_mode', 'schema', 'id', 'updatedAt'].concat(COLLECTIONS);
    const unknown = Object.keys(data).filter(k => !known.includes(k));
    if (unknown.length) report.notes.push('略過不認得的欄位：' + unknown.join('、'));

    for (const k of ['meta', 'style']) {
      if (!data[k] || typeof data[k] !== 'object') continue;
      Object.assign(project[k], cleanFields(SPEC[k], data[k], true));
      report.updated[k] = 1;
    }
    const idMap = {};
    for (const c of COLLECTIONS) {
      if (!Array.isArray(data[c])) continue;
      idMap[c] = {};
      const incoming = data[c].slice(0, LIMIT.arr).filter(x => x && typeof x === 'object');
      if (c === 'shots' && data._mode === 'replace') replaceShots(project, incoming, idMap, report);
      for (const it of incoming) upsert(project, c, it, idMap, report);
    }
    // 參照要等所有集合都進來才能修正（例如同一包裡先有分鏡、後有角色）
    fixRefs(project, idMap);
    if (o.touch !== false) project.updatedAt = new Date().toISOString();
    return report;
  }

  function replaceShots(project, incoming, idMap, report) {
    const eps = new Set(incoming.map(s => resolveRef(project, 'episodes', str(s.ep), idMap)));
    for (const ep of eps) {
      const before = project.shots.length;
      project.shots = project.shots.filter(s => s.ep !== ep);
      report.replaced[ep] = before - project.shots.length;
    }
  }

  // 找既有項目：先比 id，再比名字（角色、場景、道具）或集數；分鏡 id 撞到別集時不能覆蓋別集
  function findTarget(project, c, it, idMap) {
    const rawId = String(it.id || '');
    let t = ID_RE.test(rawId) ? find(project[c], rawId) : null;
    if (t && c === 'shots' && it.ep && resolveRef(project, 'episodes', str(it.ep), idMap) !== t.ep) t = null;
    if (!t && c !== 'shots' && it.name) t = project[c].find(x => x.name === str(it.name));
    if (!t && c === 'episodes' && it.no) t = project.episodes.find(e => e.no === Number(it.no));
    return t || null;
  }

  function freshId(project, c, rawId, cleaned, idMap) {
    const id = ID_RE.test(rawId) ? rawId : '';
    if (c === 'shots') {
      cleaned.ep = resolveRef(project, 'episodes', cleaned.ep, idMap);
      return !id || find(project.shots, id) ? shotId(project, cleaned.ep || 'x') : id;
    }
    return !id || find(project[c], id) ? nextId(SPEC[c].prefix, project[c]) : id;
  }

  function upsert(project, c, it, idMap, report) {
    const rawId = String(it.id || '');
    const target = findTarget(project, c, it, idMap);
    if (target) {
      const cleaned = cleanFields(SPEC[c], it, true);
      if (c === 'characters' && cleaned.outfits) cleaned.outfits = mergeOutfits(target.outfits || [], cleaned.outfits);
      Object.assign(target, cleaned);
      if (rawId && rawId !== target.id) idMap[c][rawId] = target.id;
      report.updated[c] = (report.updated[c] || 0) + 1;
      return;
    }
    const cleaned = cleanFields(SPEC[c], it, false);
    cleaned.id = freshId(project, c, rawId, cleaned, idMap);
    if (rawId && rawId !== cleaned.id) idMap[c][rawId] = cleaned.id;
    if (c === 'episodes' && !cleaned.no) cleaned.no = project.episodes.length + 1;
    project[c].push(cleaned);
    report.added[c] = (report.added[c] || 0) + 1;
  }

  function mergeOutfits(oldList, newList) {
    const out = oldList.map(x => Object.assign({}, x));
    for (const n of newList) {
      const t = out.find(x => x.id === n.id) || out.find(x => x.name && x.name === n.name);
      if (t) Object.assign(t, n, { id: t.id });
      else out.push(Object.assign({}, n, { id: find(out, n.id) ? nextId('o', out) : n.id }));
    }
    return out;
  }

  function fixRefs(project, idMap) {
    for (const p of project.props) p.owner = resolveRef(project, 'characters', p.owner, idMap);
    for (const s of project.shots) {
      s.ep = resolveRef(project, 'episodes', s.ep, idMap);
      s.loc = resolveRef(project, 'locations', s.loc, idMap);
      for (const r of s.cast || []) {
        r.c = resolveRef(project, 'characters', r.c, idMap);
        const ch = find(project.characters, r.c);
        if (ch && r.outfit && !find(ch.outfits, r.outfit)) {
          const byName = (ch.outfits || []).find(x => x.name === r.outfit);
          if (byName) r.outfit = byName.id;
        }
      }
      for (const l of s.lines || []) if (l.c !== '旁白') l.c = resolveRef(project, 'characters', l.c, idMap);
      for (const it of s.items || []) it.p = resolveRef(project, 'props', it.p, idMap);
    }
  }

  /* ---------- 檢查 ---------- */

  function epShots(project, epId) {
    return project.shots.filter(s => s.ep === epId).sort(byOrder);
  }
  function epSeconds(project, epId) {
    return epShots(project, epId).reduce((a, s) => a + (Number(s.sec) || 0), 0);
  }
  function lineChars(text) { return String(text || '').replace(/[\s，。！？、：；「」『』（）…—,.!?:;"'()\-]/g, '').length; }

  function lint(project, epFilter) {
    const out = [];
    const add = (level, where, msg) => out.push({ level, where, msg });
    const max = Number(project.style.maxShotSec) || 10;
    if (!epFilter) {
      for (const c of project.characters) {
        if (!c.appearance) add('warn', '角色「' + (c.name || c.id) + '」', '沒有外觀錨點，生成時每一鏡長相會不一樣');
        if (!(c.outfits || []).length) add('warn', '角色「' + (c.name || c.id) + '」', '沒有服裝設定，連戲容易跑掉');
      }
      for (const l of project.locations) if (!l.prompt) add('warn', '場景「' + (l.name || l.id) + '」', '沒有英文空間描述，背景會每鏡不同');
      const main = project.characters.filter(c => c.role !== '路人').length;
      if (main > 8) add('warn', '角色', '主要角色 ' + main + ' 位：太多會很難維持長相一致，建議 6 位以內');
    }
    const eps = epFilter ? project.episodes.filter(e => e.id === epFilter) : project.episodes;
    for (const e of eps) {
      const tag = '第' + e.no + '集';
      if (!e.hook) add('warn', tag, '缺前 3 秒鉤子：直式短劇前 3 秒沒抓住就會被滑走');
      if (!e.cliffhanger) add('warn', tag, '缺結尾懸念');
      const shots = epShots(project, e.id);
      const total = shots.reduce((a, s) => a + (Number(s.sec) || 0), 0);
      const target = Number(e.seconds) || Number(project.meta.epSeconds) || 0;
      if (shots.length && target && Math.abs(total - target) > target * 0.25) {
        add('warn', tag, '分鏡總長 ' + total + ' 秒，目標 ' + target + ' 秒（差超過 25%）');
      }
    }
    const shots = epFilter ? project.shots.filter(s => s.ep === epFilter) : project.shots;
    const ids = new Set();
    for (const s of shots) {
      const tag = '鏡 ' + s.id;
      if (ids.has(s.id)) add('error', tag, '分鏡 id 重複');
      ids.add(s.id);
      if (!find(project.episodes, s.ep)) add('error', tag, '指向不存在的集「' + s.ep + '」');
      if (s.loc && !find(project.locations, s.loc)) add('error', tag, '場景「' + s.loc + '」不存在');
      if (!s.loc) add('warn', tag, '沒指定場景');
      for (const f of SPEC.shots.fields) {
        if (f.opts && s[f.k] && !f.opts.includes(s[f.k])) add('warn', tag, f.l + '「' + s[f.k] + '」不是可選值，提示詞會少這一段');
      }
      for (const r of s.cast || []) {
        const ch = find(project.characters, r.c);
        if (!ch) { add('error', tag, '角色「' + r.c + '」不存在'); continue; }
        if (r.outfit && !find(ch.outfits, r.outfit)) add('error', tag, ch.name + '的服裝「' + r.outfit + '」不存在');
      }
      if ((s.cast || []).length > 3) add('warn', tag, '同框 ' + s.cast.length + ' 人：AI 影片超過 3 人很容易臉崩，建議拆鏡');
      if (Number(s.sec) > max) add('warn', tag, s.sec + ' 秒超過單鏡上限 ' + max + ' 秒，請拆鏡');
      const chars = (s.lines || []).reduce((a, l) => a + lineChars(l.text), 0);
      const need = Math.ceil(chars / CHARS_PER_SEC);
      if (chars && need > Number(s.sec)) add('warn', tag, '對白 ' + chars + ' 字約要 ' + need + ' 秒，這鏡只有 ' + s.sec + ' 秒');
      for (const l of s.lines || []) {
        if (l.c && l.c !== '旁白' && !find(project.characters, l.c)) add('error', tag, '說話的人「' + l.c + '」不存在');
      }
      for (const it of s.items || []) if (it.p && !find(project.props, it.p)) add('error', tag, '道具「' + it.p + '」不存在');
      lintShotRisks(project, s, add, tag);
    }
    lintContinuity(project, shots, add);
    lintVoices(project, shots, add);
    return out;
  }

  // AI 生圖／生影片的常見錯誤，用文字就抓得到的先抓：字的方向、人群裡冒出主角、寫到卻沒掛上的道具與角色
  const TEXTY_ZH = /寫字|寫下|寫著|簽名|簽字|簽下|筆跡|紙條|字條|便條|信紙|信封|日記|手機|螢幕|電腦|平板|筆電|文件|合約|收據|診斷書|書頁|翻書|看書|黑板|白板|告示|簡訊|訊息/;
  const TEXTY_EN = /\b(writ(e|es|ing|ten)|handwrit\w*|signature|letter|diary|notebook|phone|smartphone|screen|laptop|tablet|document|contract|receipt|page|message)\b/i;
  const CROWD_ZH = /敵人|敵軍|圍攻|圍住|包圍|人群|群眾|眾人|手下|士兵|保鑣|保鏢|打手|殺手|混混|刺客|路人|賓客|圍觀|一群|大家/;
  const CROWD_EN = /\b(crowd|enemies|enemy|guards|soldiers|thugs|henchmen|mob|bystanders|onlookers|guests|assassins|a group of)\b/i;
  const HAND_RE = /\b(left|right) hand\b|([左右])手/i;

  function isTexty(s) { return TEXTY_ZH.test(str(s.action)) || TEXTY_EN.test(str(s.visualEn) + ' ' + str(s.motionEn)); }
  function hasCrowd(s) { return CROWD_ZH.test(str(s.action)) || CROWD_EN.test(str(s.visualEn) + ' ' + str(s.motionEn)); }
  function handOf(state) {
    const m = HAND_RE.exec(str(state));
    if (!m) return '';
    return (m[1] || '').toLowerCase() === 'left' || m[2] === '左' ? '左手' : '右手';
  }

  function lintShotRisks(project, s, add, tag) {
    if (isTexty(s) && !s.textDir) add('warn', tag, '這鏡有寫字、文件或螢幕：AI 常把字轉成朝向觀眾。請選「文字朝向」（字朝角色／字朝鏡頭／不露字）');
    if (s.textDir === '字朝鏡頭' && !['過肩', '主觀', '俯拍'].includes(s.angle)) add('warn', tag, '字要朝鏡頭時，角度要用過肩、主觀或俯拍，否則等於要角色把字倒著寫給觀眾看');
    if (hasCrowd(s) && !str(s.extrasEn)) add('warn', tag, '畫面有敵人或人群，但沒寫「其他人（英文）」：AI 常把主角的臉複製進人群，請寫出他們跟主角不同的外型');
    const text = str(s.action);
    for (const ch of project.characters) {
      if (ch.name && ch.name.length >= 2 && text.includes(ch.name) && !(s.cast || []).some(r => r.c === ch.id) && !(s.lines || []).some(l => l.c === ch.id)) {
        add('warn', tag, '畫面寫到「' + ch.name + '」，但出場角色沒有' + ch.name + '：有入鏡就加進出場角色，外觀和服裝才會帶進提示詞');
      }
    }
    for (const pr of project.props) {
      if (pr.name && pr.name.length >= 2 && text.includes(pr.name) && !(s.items || []).some(it => it.p === pr.id)) {
        add('warn', tag, '畫面寫到「' + pr.name + '」，但沒掛上道具：外觀會每鏡不同，請加進這鏡的道具');
      }
    }
  }

  // 同一集同一場（scene）裡，場景、時段、服裝、拿道具的手都不該無故改變；要變就分場
  function lintContinuity(project, shots, add) {
    const groups = new Map();
    for (const s of shots) {
      const k = s.ep + '#' + (s.scene || 1);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(s);
    }
    for (const list of groups.values()) {
      list.sort(byOrder);
      const ep = find(project.episodes, list[0].ep);
      const where = (ep ? '第' + ep.no + '集' : list[0].ep) + '第' + (list[0].scene || 1) + '場';
      let loc = '', time = '';
      const fits = new Map(), hands = new Map(), held = new Map();
      for (const s of list) {
        const tag = where + ' 鏡 ' + s.id;
        if (s.loc && loc && s.loc !== loc) add('warn', tag, '同一場換了場景（' + refName(project, 'locations', loc) + '→' + refName(project, 'locations', s.loc) + '），請改成下一場');
        if (s.time && time && s.time !== time) add('warn', tag, '同一場的時段從「' + time + '」變成「' + s.time + '」，光線會跳');
        if (s.loc) loc = s.loc;
        if (s.time) time = s.time;
        for (const r of s.cast || []) {
          const ch = find(project.characters, r.c);
          if (!ch) continue;
          const fit = find(ch.outfits, r.outfit) || (ch.outfits || [])[0];
          const fid = fit ? fit.id : '';
          if (fits.has(ch.id) && fits.get(ch.id) !== fid) {
            const before = find(ch.outfits, fits.get(ch.id));
            add('warn', tag, ch.name + '的服裝從「' + (before ? before.name : '未設定') + '」變成「' + (fit ? fit.name : '未設定') + '」：同一場戲中間換裝會穿幫，真的要換就分場');
          }
          fits.set(ch.id, fid);
        }
        const now = new Set();
        for (const it of s.items || []) {
          const pr = find(project.props, it.p);
          if (!pr) continue;
          now.add(pr.id);
          const hand = handOf(it.state);
          if (hand && hands.has(pr.id) && hands.get(pr.id) !== hand) add('warn', tag, '「' + pr.name + '」從' + hands.get(pr.id) + '換到' + hand + '：同一場戲中間換手會穿幫');
          if (hand) hands.set(pr.id, hand);
          held.set(pr.id, !!hand);
        }
        for (const [pid, wasHeld] of held) {
          if (wasHeld && !now.has(pid) && (s.cast || []).length) {
            add('warn', tag, '「' + refName(project, 'props', pid) + '」上一鏡還拿在手上，這鏡沒掛上：還拿著就加進道具，放下了就在動作寫出來，AI 才不會讓它憑空消失');
            held.set(pid, false);
          }
        }
      }
    }
  }

  // 聲音不連貫多半是每集換了音色；有台詞的角色都要寫聲線、指定同一個配音音色
  function lintVoices(project, shots, add) {
    const speaking = new Set();
    for (const s of shots) for (const l of s.lines || []) if (l.c && l.c !== '旁白' && str(l.text)) speaking.add(l.c);
    for (const id of speaking) {
      const ch = find(project.characters, id);
      if (!ch) continue;
      if (!ch.voice) add('warn', '角色「' + ch.name + '」', '有台詞但沒寫聲線，配音容易每集不一樣');
      if (!ch.voiceId) add('warn', '角色「' + ch.name + '」', '有台詞但沒指定配音音色：每集都用同一個音色，觀眾才不會以為換了人');
    }
  }

  function refName(project, coll, id) {
    const it = find(project[coll], id);
    return it ? it.name || id : id;
  }

  /* ---------- 提示詞組裝 ---------- */

  function castFit(project, r) {
    const ch = find(project.characters, r.c);
    return ch ? find(ch.outfits, r.outfit) || (ch.outfits || [])[0] : null;
  }
  function castPhrase(project, r) {
    const ch = find(project.characters, r.c);
    if (!ch) return '';
    const fit = castFit(project, r);
    return [ch.appearance, fit && fit.prompt ? 'wearing ' + fit.prompt : '', r.state].map(x => str(x)).filter(Boolean).join(', ');
  }
  function itemPhrase(project, it) {
    const pr = find(project.props, it.p);
    return pr && pr.prompt ? [pr.prompt, it.state].map(x => str(x)).filter(Boolean).join(', ') : '';
  }

  // 文字朝向：模型預設把字轉向觀眾，所以要明講字是給誰看的；可讀的字交給後製，AI 生的中文字幾乎都會壞
  const TEXT_DIR_EN = {
    '字朝角色': 'any writing, page or phone screen faces the character using it, away from the camera: from the camera side the paper is seen upside down and the phone from its back, no legible words',
    '字朝鏡頭': 'the writing, page or screen is seen from the character\'s own point of view, upright for both the character and the camera, shown as blurred marks with no legible words, text added later in editing',
    '不露字': 'the paper or screen is angled away so that no writing is visible',
  };
  const TEXT_DIR_ZH = {
    '字朝角色': '紙上的字和手機螢幕朝向角色、背對鏡頭（鏡頭這邊看到的是倒過來的紙和手機背面），不出現可讀的字',
    '字朝鏡頭': '從角色自己的視角看字，字對角色和鏡頭都是正的，只呈現模糊筆跡、不出現可讀的字，文字後製再加',
    '不露字': '紙面或螢幕轉開，不露出任何字',
  };

  // 人群裡冒出主角、同一人出現兩次，是多人鏡頭最常見的崩法：每次都寫明每人只出現一次、其他人長得不一樣
  function crowdGuard(project, shot, zh) {
    const cast = (shot.cast || []).filter(r => find(project.characters, r.c));
    const extras = str(shot.extrasEn);
    const out = [];
    if (zh) {
      if (cast.length) out.push('每個角色在畫面中只出現一次，不要重複的人');
      if (extras) out.push('其他人：' + extras + '；他們的臉、髮型、體型、服裝都和' + cast.map(r => speakerName(project, r.c)).join('、') + '明顯不同');
      return out;
    }
    if (cast.length) out.push(cast.length > 1 ? 'each named character appears only once in the frame, no duplicate people' : 'the main character appears only once in the frame, no duplicate of them');
    if (extras) out.push('other people: ' + extras + (cast.length ? ', with faces, hairstyles, builds and clothing clearly different from ' + cast.map(r => whoEn(project, r.c)).filter((x, i, a) => a.indexOf(x) === i).join(' and ') : ''));
    return out;
  }

  // 有上傳定裝照時放最前面：模型先讀到「照參考圖」，才不會依文字描述重畫一張臉（咒語盒「保留長相」模式的作法）
  const REF_LOCK = 'Use the attached character reference images: keep each character\'s face, hairstyle, skin tone and outfit exactly as in the references, change only the pose, framing, setting and lighting described here';

  function imagePrompt(project, shot) {
    const st = project.style;
    const loc = find(project.locations, shot.loc);
    const parts = [
      st.ref === '定裝照' && (shot.cast || []).length ? REF_LOCK : '',
      st.prefix,
      EN.size[shot.size], EN.angle[shot.angle],
      shot.visualEn || shot.action,
      (shot.cast || []).map(r => castPhrase(project, r)).filter(Boolean).join('; '),
      (shot.items || []).map(it => itemPhrase(project, it)).filter(Boolean).join('; '),
    ].concat(crowdGuard(project, shot, false), [
      TEXT_DIR_EN[shot.textDir],
      loc ? 'setting: ' + loc.prompt : '',
      EN.time[shot.time],
      (loc && loc.lighting) || st.lighting,
      st.palette,
      st.suffix,
      EN.format[project.meta.format],
    ]);
    return parts.map(x => str(x)).filter(Boolean).join(', ');
  }

  // 影片模型不認得人名，用外觀錨點的第一段（a 26-year-old East Asian woman → the 26-year-old …）指稱說話的人
  function whoEn(project, c) {
    const ch = find(project.characters, c);
    const first = ch && String(ch.appearance || '').split(',')[0].trim();
    return first ? first.replace(/^(a|an|the)\s+/i, 'the ') : 'the character';
  }

  // 對白逐句掛上說話的人；同框沒說話的人要寫明嘴唇閉合，否則模型常讓每個人一起動嘴。
  // 字幕一律要求不要：影片工具自己燒進畫面的字幕又醜又無法改，字幕交給 .srt。
  function videoLines(project, shot, zh) {
    const lines = (shot.lines || []).filter(l => str(l.text));
    const speakers = new Set(lines.map(l => l.c));
    const silent = (shot.cast || []).some(r => !speakers.has(r.c));
    const withText = project.style.videoLines !== '不帶（另外配音）';
    const out = [];
    // 聲線放進每一句：會自己出聲的影片工具每次生成都重新挑聲音，不寫就每鏡換一種嗓子
    const voiceOf = c => { const ch = find(project.characters, c); return ch && ch.voice ? str(ch.voice) : ''; };
    if (zh) {
      if (lines.length && withText) out.push('對白：' + lines.map(l => (l.c === '旁白' ? '旁白（畫外音）' : speakerName(project, l.c)) + paren([voiceOf(l.c) ? '聲線：' + voiceOf(l.c) : '', l.emo].filter(Boolean).join('；'), '（', '）') + '說「' + str(l.text) + '」').join('；'));
      else if (lines.length) out.push(lines.some(l => l.c !== '旁白') ? '說話的人嘴巴自然開合，之後另外配音' : '');
      if (lines.length && lines.every(l => l.c === '旁白')) out.push('旁白是畫外音，畫面裡的人不說話、嘴唇閉合');
      else if (lines.length && silent) out.push('沒說話的人嘴唇閉合');
      out.push('畫面不要字幕或文字');
      return out.filter(Boolean);
    }
    if (lines.length && withText) {
      out.push(lines.map(l => (l.c === '旁白' ? 'a voice-over narrator (off screen)' : whoEn(project, l.c)) + ' says in Taiwanese Mandarin' + paren([voiceOf(l.c) ? 'voice: ' + voiceOf(l.c) : '', l.emo].filter(Boolean).join('; '), ' (', ')') + ': "' + str(l.text) + '"').join('; then '));
    } else if (lines.some(l => l.c !== '旁白')) {
      out.push(lines.filter(l => l.c !== '旁白').map(l => whoEn(project, l.c)).filter((x, i, a) => a.indexOf(x) === i).join(' and ') + ' speaks with natural lip movement, audio dubbed later');
    }
    if (lines.length && lines.every(l => l.c === '旁白')) out.push('no one on screen speaks, lips stay closed');
    else if (lines.length && silent) out.push('characters who are not speaking keep their lips closed');
    out.push('no subtitles or on-screen text');
    return out;
  }

  function paren(x, open, close) { return x ? open + x + close : ''; }

  // 圖生影片也要重複服裝與道具的固定描述（short-drama-video-prompts 的鎖定字規則）：
  // 影片模型只看首幀，幾秒後衣服、武器就開始變形或換手，文字裡有寫才拉得回來
  function videoLocks(project, shot, zh) {
    const out = [];
    for (const r of shot.cast || []) {
      const ch = find(project.characters, r.c);
      const fit = castFit(project, r);
      if (!ch || !(fit && fit.prompt) && !r.state) continue;
      if (zh) out.push(ch.name + '全程穿同一套衣服' + paren(fit && str(fit.prompt), '：', '') + paren(str(r.state), '，狀態：', ''));
      else out.push(whoEn(project, r.c) + ' keeps the same outfit the whole time' + paren(fit && str(fit.prompt), ': ', '') + paren(str(r.state), ', ', ''));
    }
    for (const it of shot.items || []) {
      const pr = find(project.props, it.p);
      if (!pr) continue;
      if (zh) out.push('「' + pr.name + '」' + paren(str(pr.prompt), '（', '）') + '保持同一個樣子' + paren(str(it.state), '：', '') + '，不變形、不換手、不消失');
      else if (pr.prompt) out.push(str(pr.prompt) + ' stays the same' + paren(str(it.state), ', ', '') + ', no change of hands, no morphing, it does not disappear');
    }
    return out;
  }

  // 每鏡各自生出不同配樂，剪起來會一直跳；配樂統一後製加，單鏡只留環境音與音效
  function videoSound(project, shot, zh) {
    const loc = find(project.locations, shot.loc);
    const amb = loc && str(loc.ambience);
    if (zh) return [amb ? '環境音：' + amb : '', shot.sfx ? '音效：' + str(shot.sfx) : '', '不要配樂'];
    return [amb ? 'ambient sound: ' + amb : '', shot.sfx ? 'sound effect: ' + str(shot.sfx) : '', 'no background music'];
  }

  function videoPrompt(project, shot) {
    const zh = project.style.videoLang === '中文';
    if (zh) {
      const loc = find(project.locations, shot.loc);
      return [
        shot.action,
        loc ? '場景：' + loc.name : '',
        [shot.size, shot.angle].filter(Boolean).join('，'),
        shot.move ? '鏡頭：' + shot.move : '',
      ].concat(videoLocks(project, shot, true), crowdGuard(project, shot, true), [TEXT_DIR_ZH[shot.textDir]],
        videoLines(project, shot, true), videoSound(project, shot, true), ['長度約 ' + (shot.sec || 5) + ' 秒']).filter(Boolean).join('。');
    }
    return [
      shot.motionEn || shot.visualEn || shot.action,
      EN.move[shot.move],
      EN.size[shot.size],
    ].concat(videoLocks(project, shot, false), crowdGuard(project, shot, false), [TEXT_DIR_EN[shot.textDir]],
      videoLines(project, shot, false), videoSound(project, shot, false), ['about ' + (shot.sec || 5) + ' seconds']).map(x => str(x)).filter(Boolean).join(', ');
  }

  /* ---------- 定裝照提示詞 ---------- */

  // 先做定裝照、之後每鏡拿它當參考圖，是 AI 短劇維持同一張臉最有效的方法。
  // 配方取自 short-drama-image-prompts：一張只放一個人、一套服裝；均勻正面光；素色背景；
  // 不要視圖標籤和箭頭（模型會把字畫進圖裡）；只寫看得見的錨點，不寫「完美五官」這種會被重新詮釋的形容詞。
  const SHEETS = {
    face: { label: '臉部定裝照', fmt: 'square 1:1 composition' },
    costume: { label: '全身定裝照', fmt: '' },
    turnaround: { label: '三視圖', fmt: 'wide 16:9 sheet layout' },
    expression: { label: '表情九宮格', fmt: 'square 1:1 sheet layout' },
  };

  // 定裝照不是劇照：拿掉 film still、鏡頭焦段這類詞，只保留媒材（寫實、動畫、厚塗…）
  function sheetMedium(prefix) {
    return String(prefix || '').split(',').map(x => x.trim()).filter(x => x && !/\bstill\b|\blens\b|anamorphic|film grain|shallow depth/i.test(x)).join(', ');
  }

  function sheetPrompt(project, charId, kind, outfitId) {
    const ch = find(project.characters, charId);
    const sh = SHEETS[kind];
    if (!ch || !sh) return '';
    const st = project.style;
    const fit = find(ch.outfits, outfitId) || (ch.outfits || [])[0];
    const who = str(ch.appearance) || 'one character';
    const wear = fit && fit.prompt ? 'wearing ' + fit.prompt : '';
    const plain = 'even soft frontal studio light, plain light grey background';
    const body = {
      face: ['head-and-shoulders face reference of one person: ' + who, wear, 'facing the camera straight on, neutral expression, full hairline and jawline visible', plain, 'no text'],
      costume: ['full-body costume reference of one person: ' + who, wear ? wear + ', from head to toe including shoes' : '', 'standing straight facing the camera, arms relaxed at the sides, neutral expression', plain, 'no props, no text'],
      turnaround: ['character turnaround sheet of one person: ' + who, wear, 'three full-body views side by side at equal height: front view, side profile, back view', 'neutral standing pose, neutral expression', plain, 'same face, hairstyle, proportions and outfit in every view', 'no view labels, no arrows, no annotations, no text'],
      expression: ['expression sheet of one person: ' + who, wear, 'a 3x3 grid of head-and-shoulders portraits with identical framing: neutral, slight smile, laughing, angry, shocked, sad with tears, scared, cold glare, smirking', plain, 'only the expression changes, face, hairstyle and outfit stay identical', 'no labels, no text'],
    }[kind];
    return [sheetMedium(st.prefix)].concat(body, [st.suffix, sh.fmt || EN.format[project.meta.format]]).map(x => str(x)).filter(Boolean).join(', ');
  }

  function speakerName(project, c) {
    if (c === '旁白') return '旁白';
    const ch = find(project.characters, c);
    return ch ? ch.name : (c || '？');
  }

  /* ---------- 匯出 ---------- */

  function tc(sec) {
    const ms = Math.round(sec * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), r = ms % 1000;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ',' + String(r).padStart(3, '0');
  }
  function clock(sec) {
    const s = Math.round(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // 字幕依每句字數分配這一鏡的時間：長句拿比較多時間，比平均切更貼近配音
  function exportSRT(project, epId) {
    let t = 0, n = 0;
    const cues = [];
    for (const s of epShots(project, epId)) {
      const sec = Number(s.sec) || 0;
      const lines = (s.lines || []).filter(l => str(l.text));
      const total = lines.reduce((a, l) => a + Math.max(1, lineChars(l.text)), 0);
      let cur = t;
      for (const l of lines) {
        const d = sec * Math.max(1, lineChars(l.text)) / total;
        cues.push(++n + '\n' + tc(cur) + ' --> ' + tc(cur + d - 0.05) + '\n' + str(l.text) + '\n');
        cur += d;
      }
      t += sec;
    }
    return cues.join('\n');
  }

  function csvCell(v) {
    const s = String(v === undefined || v === null ? '' : v);
    // 避免 Excel 把 = + - @ 開頭當公式執行
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
    return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  function exportCSV(project, epId) {
    const head = ['集', '鏡號', '場次', '開始', '結束', '秒數', '場景', '時段', '景別', '角度', '運鏡', '出場', '道具', '畫面動作', '對白', '音效', '配樂', '轉場', '進度', '圖片提示詞', '影片提示詞'];
    const rows = [head];
    const eps = project.episodes.filter(e => !epId || e.id === epId).sort((a, b) => a.no - b.no);
    for (const e of eps) {
      let t = 0;
      for (const s of epShots(project, e.id)) {
        const loc = find(project.locations, s.loc);
        rows.push([
          e.no, s.id, s.scene, clock(t), clock(t + (Number(s.sec) || 0)), s.sec, loc ? loc.name : '', s.time, s.size, s.angle, s.move,
          (s.cast || []).map(r => speakerName(project, r.c)).join('、'), (s.items || []).map(it => refName(project, 'props', it.p)).join('、'), s.action,
          (s.lines || []).map(l => speakerName(project, l.c) + '：' + l.text).join(' / '),
          s.sfx, s.bgm, s.trans, s.status, imagePrompt(project, s), videoPrompt(project, s),
        ]);
        t += Number(s.sec) || 0;
      }
    }
    return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  function exportPromptPack(project, epId) {
    const out = [];
    const eps = project.episodes.filter(e => !epId || e.id === epId).sort((a, b) => a.no - b.no);
    out.push('《' + (project.meta.title || '未命名') + '》分鏡提示詞包');
    out.push('負面提示詞（每鏡共用）：' + (project.style.negative || '（未設定）'));
    out.push('');
    // 先做定裝照：只列這次匯出範圍用到的角色與服裝，生成後存起來當每一鏡的參考圖
    const used = new Map();
    for (const e of eps) for (const s of epShots(project, e.id)) for (const r of s.cast || []) {
      const ch = find(project.characters, r.c);
      if (!ch) continue;
      const fit = find(ch.outfits, r.outfit) || (ch.outfits || [])[0];
      if (!used.has(ch.id)) used.set(ch.id, new Set());
      if (fit) used.get(ch.id).add(fit.id);
    }
    if (used.size) {
      out.push('══ 定裝照（先做，之後每一鏡都上傳當參考圖）');
      for (const [cid, fits] of used) {
        const ch = find(project.characters, cid);
        out.push('');
        out.push('▌' + (ch.name || cid) + (ch.voice ? '｜聲線：' + ch.voice : '') + (ch.voiceId ? '｜音色：' + ch.voiceId : ''));
        out.push('［臉部］' + sheetPrompt(project, cid, 'face'));
        for (const oid of fits) {
          const fit = find(ch.outfits, oid);
          out.push('［三視圖・' + (fit.name || oid) + '］' + sheetPrompt(project, cid, 'turnaround', oid));
        }
      }
      out.push('');
    }
    for (const e of eps) {
      out.push('══ 第' + e.no + '集 ' + (e.title || ''));
      let t = 0;
      for (const s of epShots(project, e.id)) {
        const sec = Number(s.sec) || 0;
        out.push('');
        out.push('▌' + s.id + '　' + clock(t) + '–' + clock(t + sec) + '（' + sec + ' 秒）');
        out.push('畫面：' + (s.action || ''));
        out.push('［圖片］' + imagePrompt(project, s));
        out.push('［影片］' + videoPrompt(project, s));
        for (const l of s.lines || []) {
          const ch = find(project.characters, l.c);
          const voice = (ch && ch.voice ? '｜聲線：' + ch.voice : '') + (ch && ch.voiceId ? '｜音色：' + ch.voiceId : '');
          out.push('［配音］' + speakerName(project, l.c) + (l.emo ? '（' + l.emo + '）' : '') + '：' + l.text + voice);
        }
        if (s.sfx) out.push('［音效］' + s.sfx);
        t += sec;
      }
      out.push('');
    }
    return out.join('\n');
  }

  // 劇本：給人讀、給 AI 讀都可以的純文字（場次標題、畫面、對白、音效），沒拆分鏡的集就輸出大綱與小說版
  function exportScript(project, epId) {
    const m = project.meta;
    const eps = project.episodes.filter(e => !epId || e.id === epId).sort((a, b) => a.no - b.no);
    const out = [];
    if (!epId) {
      out.push('《' + (m.title || '未命名') + '》劇本');
      if (m.logline) out.push('一句話故事：' + m.logline);
      out.push('');
    }
    for (const e of eps) {
      const shots = epShots(project, e.id);
      const total = shots.reduce((a, s) => a + (Number(s.sec) || 0), 0);
      out.push('《' + (m.title || '未命名') + '》第' + e.no + '集' + (e.title ? '　' + e.title : ''));
      if (shots.length) out.push('（' + shots.length + ' 鏡，約 ' + clock(total) + '）');
      if (e.hook) out.push('鉤子：' + e.hook);
      if (!shots.length) {
        for (const [k, l] of [['synopsis', '劇情'], ['conflict', '衝突'], ['twist', '反轉']]) if (e[k]) out.push(l + '：' + e[k]);
        if (e.source) out.push('', e.source);
      }
      let t = 0, last = '';
      for (const s of shots) {
        const loc = find(project.locations, s.loc);
        const head = '第 ' + (s.scene || 1) + ' 場　' + (loc ? loc.name : '（未指定場景）') + '（' + [loc && loc.type, s.time].filter(Boolean).join('・') + '）';
        if (head !== last) { out.push('', '—— ' + head + ' ——'); last = head; }
        const sec = Number(s.sec) || 0;
        const cam = [s.size, s.angle, s.move].filter(Boolean).join('・');
        out.push('', '【' + s.id + '｜' + clock(t) + '–' + clock(t + sec) + (cam ? '｜' + cam : '') + '】');
        if (s.action) out.push(s.action);
        const who = (s.cast || []).map(r => speakerName(project, r.c) + paren(str(r.expr), '（', '）')).join('、');
        if (who) out.push('出場：' + who);
        if ((s.items || []).length) out.push('道具：' + s.items.map(it => refName(project, 'props', it.p)).join('、'));
        for (const l of s.lines || []) if (str(l.text)) out.push(speakerName(project, l.c) + paren(str(l.emo), '（', '）') + '：' + str(l.text));
        if (s.sfx) out.push('音效：' + s.sfx);
        t += sec;
      }
      if (e.cliffhanger) out.push('', '結尾懸念：' + e.cliffhanger);
      out.push('', '');
    }
    if (!eps.length) out.push('（還沒有分集）');
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function fieldValue(f, v, project) {
    if (f.type === 'rows') {
      return (v || []).map(r => f.sub.map(s => s.ref ? refLabel(project, s.ref, r[s.k]) : r[s.k]).filter(Boolean).join('｜')).join('；');
    }
    if (f.ref) return refLabel(project, f.ref, v);
    return v === undefined || v === null ? '' : String(v);
  }
  function refLabel(project, coll, v) {
    if (!v) return '';
    const it = find(project[coll], v);
    return it ? (it.name || it.title || ('第' + it.no + '集')) : v;
  }

  // 同一個函式產生「填好的設定集」與「空白模板」，模板永遠和 App 的欄位一致
  function exportMarkdown(project, opt) {
    const o = opt || {};
    const tips = !!o.tips;
    const md = [];
    const row = (f, v) => {
      const val = fieldValue(f, v, project).replace(/\n/g, ' ');
      const tip = tips && f.tip ? '（' + f.tip + '）' : '';
      const opts = tips && f.opts ? '（可選：' + f.opts.join('／') + '）' : '';
      return '- **' + f.l + '**' + tip + opts + '：' + val;
    };
    md.push('# ' + (o.heading || ('《' + (project.meta.title || '未命名') + '》設定集')));
    md.push('');
    for (const key of ['meta', 'style']) {
      md.push('## ' + SPEC[key].label);
      for (const f of SPEC[key].fields) md.push(row(f, project[key][f.k]));
      md.push('');
    }
    for (const c of ['characters', 'locations', 'props', 'episodes']) {
      md.push('## ' + SPEC[c].label);
      const list = project[c].length ? project[c] : (tips ? [{}] : []);
      for (const it of list) {
        const name = c === 'episodes' ? '第' + (it.no || '＿') + '集 ' + (it.title || '') : (it.name || '（名稱）');
        md.push('### ' + name.trim());
        for (const f of SPEC[c].fields) {
          if (c === 'episodes' && (f.k === 'no' || f.k === 'title')) continue;
          if (f.k === 'name') continue;
          if (f.k === 'source' && !tips) continue;
          md.push(row(f, it[f.k]));
        }
        md.push('');
      }
    }
    if (tips) {
      md.push('## 分鏡表（每一鏡一列）');
      md.push('');
      md.push('| 鏡號 | 秒數 | 場景 | 景別 | 角度 | 運鏡 | 出場（角色／服裝） | 畫面動作 | 對白 | 音效 |');
      md.push('|---|---|---|---|---|---|---|---|---|---|');
      md.push('| e1-01 | 3 |  |  |  |  |  |  |  |  |');
      md.push('');
      md.push('- 景別：' + OPT.size.join('／'));
      md.push('- 角度：' + OPT.angle.join('／'));
      md.push('- 運鏡：' + OPT.move.join('／'));
      md.push('- 單鏡 2～10 秒、只拍一個動作；對白每秒最多約 4 字；同框最多 3 人。');
      md.push('');
    }
    return md.join('\n');
  }

  /* ---------- 給 AI 的指令 ---------- */

  function compact(v) {
    if (Array.isArray(v)) { const a = v.map(compact).filter(x => x !== undefined); return a.length ? a : undefined; }
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) { const c = compact(x); if (c !== undefined) o[k] = c; }
      return Object.keys(o).length ? o : undefined;
    }
    if (v === '' || v === null || v === undefined) return undefined;
    return v;
  }

  function context(project, task, epId) {
    const pick = (o, keys) => { const r = {}; for (const k of keys) r[k] = o[k]; return r; };
    const ep = find(project.episodes, epId);
    const c = { meta: project.meta, style: project.style };
    if (task === 'bible') {
      c.characters = project.characters; c.locations = project.locations; c.props = project.props;
      c.episodes = project.episodes.map(e => pick(e, ['id', 'no', 'title', 'synopsis']));
    } else if (task === 'episodes') {
      c.style = pick(project.style, ['look', 'era']);
      c.characters = project.characters.map(x => pick(x, ['id', 'name', 'role', 'job', 'personality', 'desire', 'fear', 'secret', 'arc']));
      c.locations = project.locations.map(x => pick(x, ['id', 'name', 'desc']));
      c.props = project.props.map(x => pick(x, ['id', 'name', 'desc']));
      c.episodes = project.episodes.map(e => { const o = Object.assign({}, e); delete o.source; return o; });
    } else {
      c.style = pick(project.style, ['look', 'era', 'maxShotSec', 'videoLang']);
      c.characters = project.characters.map(x => pick(x, ['id', 'name', 'role', 'personality', 'speech', 'appearance', 'outfits']));
      c.locations = project.locations.map(x => pick(x, ['id', 'name', 'type', 'desc']));
      c.props = project.props.map(x => pick(x, ['id', 'name', 'desc', 'prompt']));
      if (ep) {
        const prev = project.episodes.find(e => e.no === ep.no - 1);
        const next = project.episodes.find(e => e.no === ep.no + 1);
        c.episode = ep;
        if (prev) c.previousEpisodeEnding = prev.cliffhanger;
        if (next) c.nextEpisodeHook = next.hook;
        if (task === 'review' || task === 'polish') c.shots = epShots(project, ep.id);
      }
    }
    return JSON.stringify(compact(c) || {});
  }

  function fieldRules(coll) {
    const spec = SPEC[coll];
    return spec.fields.map(f => {
      let s = '- ' + f.k + '：' + f.l;
      if (f.req) s += '（必填）';
      if (f.type === 'num') s += '，數字';
      if (f.opts) s += '，只能填：' + f.opts.join('／');
      if (f.ref === 'characters') s += '，填角色 id';
      if (f.ref === 'locations') s += '，填場景 id';
      if (f.ref === 'episodes') s += '，填分集 id';
      if (f.type === 'rows') s += '，陣列，每個元素有 ' + (f.prefix ? 'id、' : '') + f.sub.map(x => x.k + '（' + x.l + '）').join('、');
      if (f.tip) s += '。' + f.tip;
      return s;
    }).join('\n');
  }

  const WRITING = [
    '【寫作要求】',
    '- 一律台灣繁體中文與台灣用語（影片不是視頻、品質不是質量、計程車不是出租車）。',
    '- 對白要像真人講話：短句、口語、會打斷、會答非所問；一句不超過 20 字。',
    '- 不要「不是…而是…」對仗、不要三連排比、不要說教金句、不要堆破折號。',
    '- 情緒用動作和潛台詞表現，不要讓角色直接說出「我好難過」。',
  ].join('\n');

  const OUTPUT = [
    '【輸出規則】',
    '1. 只輸出一個 JSON 物件，前後不要任何說明。',
    '2. 欄位名稱照下面的規則與範例，不要自創欄位；沒有內容的欄位直接省略。',
    '3. 標「英文」的欄位寫英文，要給生圖、生影片工具用。',
    '4. 太長寫不完時，先輸出前半並在最後一個欄位後結束 JSON，我會叫你接著寫。',
  ].join('\n');

  const EXAMPLES = {
    bible: {
      meta: { title: '午夜收據', genre: '懸疑', logline: '夜班店員收到一張十年前、署名是她自己的收據，必須在天亮前查出誰在模仿她的人生。', hook: '每集一個「不可能存在的證據」' },
      style: { look: '寫實電影感', palette: 'cold teal with sodium orange', lighting: 'harsh fluorescent light', prefix: 'cinematic film still, photorealistic', negative: 'text, watermark, extra fingers' },
      characters: [{ id: 'c1', name: '林夏', role: '主角', age: '26', job: '便利商店夜班店員', desire: '查出收據的來源', secret: '十年前失去一段記憶', speech: '話少，常用反問句', appearance: 'a 26-year-old East Asian woman, shoulder-length straight black hair, small silver hair clip on the left side, slim build, mole under the right eye', outfits: [{ id: 'o1', name: '店員制服', prompt: 'green and white convenience store vest over a charcoal hoodie' }], voice: '偏低、語速平穩' }],
      locations: [{ id: 'l1', name: '便利商店', type: '內景', prompt: 'small 24-hour convenience store interior, snack shelves, glass sliding door, counter with cash register', lighting: 'cold fluorescent light' }],
      props: [{ id: 'p1', name: '舊收據', desc: '日期是十年前，簽名是林夏的筆跡', prompt: 'a crumpled faded thermal paper receipt', owner: 'c1' }],
    },
    episodes: { episodes: [{ id: 'e1', no: 1, title: '凌晨三點的客人', hook: '收據上的簽名是她自己的字', synopsis: '……', conflict: '……', twist: '……', cliffhanger: '監視器裡，店裡只有她一個人', seconds: 90 }] },
    novel: { episodes: [{ id: 'e1', source: '凌晨三點，自動門響了。\n林夏抬頭……' }] },
    shots: { _mode: 'replace', shots: [{ id: 'e1-01', ep: 'e1', scene: 1, order: 1, sec: 3, loc: 'l1', time: '深夜', size: '大特寫', angle: '俯拍', move: '推', cast: [{ c: 'c1', outfit: 'o1', expr: '僵住' }], items: [{ p: 'p1', state: 'lying flat on the counter under her finger' }], textDir: '字朝鏡頭', action: '收據上的簽名特寫，林夏的手指停在名字上', visualEn: 'extreme close-up of a faded receipt on a counter, a young woman\'s finger frozen on a handwritten signature', motionEn: 'the finger trembles slightly as the camera slowly pushes in on the signature', lines: [{ c: 'c1', text: '這是我的字。', emo: '低聲' }], sfx: '冰箱壓縮機低鳴', status: '待生成' }] },
    polish: { _mode: 'patch', shots: [{ id: 'e1-01', lines: [{ c: 'c1', text: '……我的字？', emo: '低聲' }] }] },
  };

  const TASKS = {
    bible: { label: '生成設定集（企劃、風格、角色、場景、道具）', needEp: false, json: true },
    episodes: { label: '寫分集大綱', needEp: false, json: true },
    novel: { label: '寫單集小說版', needEp: true, json: true },
    shots: { label: '拆單集分鏡', needEp: true, json: true },
    polish: { label: '對白去 AI 味', needEp: true, json: true },
    review: { label: '審稿（連戲、節奏、生成風險）', needEp: true, json: false },
  };

  function aiPrompt(task, project, epId) {
    const ep = find(project.episodes, epId);
    if (TASKS[task] && TASKS[task].needEp && !ep) throw new Error('請先選一集');
    const m = project.meta;
    const head = '你是資深直式短劇編劇，也是 AI 影像分鏡師。下面是我這部 AI 短劇的專案資料（JSON）：\n<專案>\n' + context(project, task, epId) + '\n</專案>\n';
    const ex = (k) => '【範例（只示範格式，內容要換成這部劇的）】\n' + JSON.stringify(EXAMPLES[k]);
    const maxSec = Number(project.style.maxShotSec) || 10;
    let body;
    if (task === 'bible') {
      body = [
        '【任務】建立這部 AI 短劇的設定集。',
        '- 企劃欄位空白就依「類型」與「一句想法」自己原創；類型是「隨機」就挑一個在短影音平台受歡迎的類型。題材要原創，不要改編現有作品。',
        '- 共 ' + (m.episodes || 10) + ' 集、每集約 ' + (m.epSeconds || 90) + ' 秒，' + (m.format || '9:16 直式') + '。',
        '- 角色 3～5 位、場景 3～6 個、關鍵道具 1～3 個。越少越容易讓 AI 生成保持一致，成本也越低。',
        '- appearance（英文）要具體且固定：年齡、臉型、髮型髮色、體型，再加一個一眼認得的特徵（疤、痣、胎記、眼鏡）。不同角色要一眼分得出來。',
        '- appearance 只寫看得見、換衣服也不會變的特徵；不要寫 beautiful、perfect features、handsome 這類抽象形容，模型每次都會重新詮釋，臉就跑掉了。服裝、妝、傷勢寫在 outfits，不寫進 appearance。',
        '- outfits 每人 1～2 套，英文寫顏色、材質、款式。',
        '- 場景 prompt（英文）只寫空間、陳設、材質、氛圍，不要放人物。',
        '- style 依題材設定畫風、色調、光線、提示詞開頭與結尾、負面提示詞。',
        '- 已有的角色、場景、道具保留原 id 修改；新增的用新 id（角色 c1、c2…，場景 l1…，道具 p1…，服裝 o1、o2…）。',
        '',
        '【欄位規則】',
        'meta：\n' + fieldRules('meta'),
        'style：\n' + fieldRules('style'),
        'characters（陣列）：\n' + fieldRules('characters'),
        'locations（陣列）：\n' + fieldRules('locations'),
        'props（陣列）：\n' + fieldRules('props'),
        '',
        ex('bible'),
      ].join('\n');
    } else if (task === 'episodes') {
      body = [
        '【任務】寫出全部 ' + (m.episodes || 10) + ' 集的分集大綱，每集約 ' + (m.epSeconds || 90) + ' 秒。',
        '- 每集只講一件事，至少一個衝突、一個反轉。',
        '- hook：第 0～3 秒就出現的衝突或異常，要能用一個畫面拍出來。',
        '- cliffhanger：停在揭曉或打臉的前一刻。',
        '- 前 3 集交代主角困境與核心衝突；之後每 3～5 集一個大反轉；最後一集收主線。',
        '- 只用設定集裡的角色與場景；真的需要新的就寫進 synopsis 並標「（新）」。',
        '- id 用 e1、e2…，no 是集數；已有的集保留 id 修改。',
        '',
        '【欄位規則】episodes（陣列）：\n' + fieldRules('episodes').split('\n').filter(l => !l.startsWith('- source')).join('\n'),
        '',
        ex('episodes'),
      ].join('\n');
    } else if (task === 'novel') {
      const chars = Math.min(3000, Math.max(300, Math.round((ep.seconds || m.epSeconds || 90) * 7)));
      body = [
        '【任務】把第 ' + ep.no + ' 集寫成小說版，約 ' + chars + ' 字，之後要轉成分鏡。',
        '- 用畫面和對白推進，少寫心理描寫；每一段對應一個拍得出來的畫面。',
        '- 第一段就是 hook，最後一段停在 cliffhanger。',
        '- 輸出 {"episodes":[{"id":"' + ep.id + '","source":"正文"}]}，正文換行寫成 \\n。',
        '',
        ex('novel'),
      ].join('\n');
    } else if (task === 'shots') {
      const target = ep.seconds || m.epSeconds || 90;
      body = [
        '【任務】把第 ' + ep.no + ' 集' + (ep.title ? '《' + ep.title + '》' : '') + '拆成分鏡，總長約 ' + target + ' 秒。依據：' + (ep.source ? '專案裡的小說版（episode.source）' : '分集大綱') + '。',
        '- 每鏡 2～' + maxSec + ' 秒，只拍一個動作；所有鏡頭秒數加總接近 ' + target + '。',
        '- 第 1 鏡就是 hook，0～3 秒內出現衝突或異常；最後一鏡停在 cliffhanger。',
        ...((m.format || '9:16 直式') === '9:16 直式' ? ['- 9:16 直式畫面窄，以中景、近景、特寫為主；交代空間用前景、後景的縱深（門框、桌沿、背影），少用遠景。'] : []),
        '- 對白每秒最多 4 個字：5 秒的鏡頭台詞不超過 20 字，講不完就拆鏡。',
        '- 同一鏡最多 3 個角色入鏡，最好 1～2 個。',
        '- cast 與 lines 的 c 只能用角色 id，旁白寫 "旁白"；loc 只能用場景 id；outfit 用該角色的服裝 id；items 的 p 只能用道具 id。',
        '- 同一場戲（同一個 scene）不換場景、不換時段、不換裝；要換就開新的 scene。',
        '- 畫面裡出現設定集的道具（含武器）就放進 items，state 用英文寫拿法或位置（in his right hand、on the counter）；同一場戲沒有劇情原因不換手、不消失，放下了要在 action 寫出來。',
        '- cast.state 用英文寫當下看得見的狀態（rain-soaked hair、a fresh cut on the left cheek），受傷、淋濕、弄髒之後的鏡頭要延續。',
        '- 敵人、手下、路人等沒有角色卡的人寫在 extrasEn（英文），外型要跟主角明顯不同（不同髮型、服裝、面罩），不要寫成跟主角相像的人，免得 AI 把主角的臉複製進人群。',
        '- 有寫字、文件、手機或螢幕的鏡頭要填 textDir：字朝角色（鏡頭在對面，看到倒過來的紙或手機背面）／字朝鏡頭（只能配過肩、主觀或俯拍）／不露字。要讓觀眾讀到的字一律後製加，不靠 AI 生成。',
        '- visualEn：英文，這一鏡的第一個畫面（定格，攝影師一次拍得下來）。寫每個人在畫面左／右、前景／後景的位置、身體朝向、看著誰、手上拿什麼、一個表情；不要寫人名，用外觀或身分指稱，例如 the young woman in the store vest。不要寫 then、表情從 A 變 B、鏡頭移動。',
        '- motionEn：英文一句，依序寫起始狀態 → 一個主要動作（停在碰到某物或某個位置，不寫公分）→ 結束狀態。一鏡只有一個主要變化，5 秒最多兩個動作。',
        '- 避開 AI 影片容易崩的動作：兩人搶東西或精準接住、三步以上的雙手操作、只靠微表情撐的戲、「沒有接話」這種否定動作、心理狀態（像是、忽然明白）。改成拆到相鄰兩鏡、改由物件或聲音交代。',
        '- 相鄰兩鏡至少改變景別、角度或人物關係其中一項；兩人對話用正反打，維持在軸線同一側。',
        '- id 用 ' + ep.id + '-01、' + ep.id + '-02…；scene 從 1 起算，同一場景連續的鏡頭用同一個 scene；order 從 1 起算。',
        '- 最外層要有 "_mode": "replace"，代表取代這集原本的分鏡。',
        '',
        '【欄位規則】shots（陣列）：\n' + fieldRules('shots').split('\n').filter(l => !/^- (status|note)/.test(l)).join('\n'),
        '',
        ex('shots'),
      ].join('\n');
    } else if (task === 'polish') {
      body = [
        '【任務】改寫第 ' + ep.no + ' 集分鏡裡的對白，去掉 AI 味、更像真人講話。',
        '- 只改 lines，不改 id，不輸出其他欄位；沒有對白的鏡頭不用輸出。',
        '- 改完的台詞字數不能超過「秒數 × 4」。',
        '- 依每個角色的 speech（說話方式）調整用詞。',
        '- 最外層要有 "_mode": "patch"。',
        '',
        ex('polish'),
      ].join('\n');
    } else if (task === 'review') {
      return head + [
        '【任務】審第 ' + ep.no + ' 集的分鏡，用條列回覆，不要 JSON。每點都標鏡號，並給具體改法：',
        '1. 連戲：服裝、道具、時段、位置前後矛盾',
        '2. 邏輯漏洞與角色動機',
        '3. 節奏：hook 夠不夠快、哪幾鏡拖戲、結尾懸念強不強',
        '4. 對白：哪幾句有 AI 味或太長，直接給改寫',
        '5. AI 生成風險：哪幾鏡人太多、動作太複雜、手部或文字特寫容易崩，建議怎麼拆或改',
        '6. 首幀與動態：visualEn 是不是只有一個瞬間、站位與視線清不清楚；motionEn 是不是一鏡只有一個主要變化、有沒有寫結束狀態',
        '7. AI 常見穿幫：同一場戲換裝、武器或道具換手或消失、受傷淋濕的狀態沒延續、人群或敵人裡可能冒出主角的臉、寫字或看手機時字的方向、有台詞的角色聲線不一致',
      ].join('\n');
    } else {
      throw new Error('不認得的工作：' + task);
    }
    return head + '\n' + body + '\n\n' + WRITING + '\n\n' + OUTPUT;
  }

  /* ---------- 示範專案 ---------- */

  function demoProject() {
    const p = newProject('午夜收據（示範）');
    merge(p, {
      meta: { genre: '懸疑', episodes: 12, epSeconds: 60, logline: '夜班店員收到一張十年前、署名是她自己的收據，必須在天亮前查出誰在模仿她的人生。', hook: '每集出現一個「不可能存在的證據」', audience: '18～35 歲、愛看反轉的短影音觀眾', tone: '冷調懸疑', theme: '被偷走的記憶' },
      style: { look: '寫實電影感', era: '現代台灣都市', palette: 'cold teal with sodium orange accents', lighting: 'harsh fluorescent light with deep shadows', music: '低頻電子脈衝、鋼琴單音' },
      characters: [
        { id: 'c1', name: '林夏', role: '主角', age: '26', gender: '女', job: '便利商店夜班店員', personality: '冷靜、觀察力強、不信任人', desire: '查出收據的來源', fear: '自己其實瘋了', secret: '十年前失去一段記憶', arc: '從逃避過去到主動挖開真相', speech: '話少，常用反問句', appearance: 'a 26-year-old East Asian woman, shoulder-length straight black hair, small silver hair clip on the left side, slim build, mole under the right eye', outfits: [{ id: 'o1', name: '店員制服', prompt: 'green and white convenience store vest over a charcoal hoodie' }], voice: '偏低、語速平穩', voiceId: 'ElevenLabs 自建音色「林夏-01」' },
        { id: 'c2', name: '黑衣客', role: '反派', age: '40 多歲', gender: '男', job: '不明', personality: '禮貌得令人發毛', desire: '讓林夏想起那一晚', secret: '十年前事件的目擊者', speech: '慢條斯理、用敬語', appearance: 'a tall East Asian man in his 40s, neatly combed hair with gray streaks, thin scar across the left eyebrow, pale face', outfits: [{ id: 'o1', name: '長大衣', prompt: 'long black wool coat, black leather gloves' }], voice: '低沉、每句停頓很久', voiceId: 'ElevenLabs 自建音色「黑衣客-01」' },
      ],
      locations: [
        { id: 'l1', name: '便利商店', type: '內景', desc: '凌晨三點、幾乎沒有客人的街角便利商店', prompt: 'small 24-hour convenience store interior, snack shelves, glass sliding door, counter with cash register, security camera in the corner', lighting: 'cold fluorescent light', ambience: '冰箱壓縮機低鳴、自動門提示音' },
        { id: 'l2', name: '店外騎樓', type: '外景', desc: '下雨的騎樓', prompt: 'rainy arcade sidewalk outside a convenience store at night, wet tiles reflecting neon signs, parked scooters', lighting: 'neon reflections, wet surfaces', ambience: '雨聲、遠處機車' },
      ],
      props: [{ id: 'p1', name: '舊收據', desc: '日期是十年前，簽名是林夏的筆跡', prompt: 'a crumpled faded thermal paper receipt with handwriting', owner: 'c1' }],
      episodes: [{ id: 'e1', no: 1, title: '凌晨三點的客人', hook: '收據上的簽名是林夏自己的字', synopsis: '黑衣客結帳時留下一張十年前的收據，林夏發現簽名是自己的筆跡。（示範只拆前 30 秒）', conflict: '林夏想追出去問清楚，但店不能沒人顧。', twist: '黑衣客叫得出她小時候的小名。', cliffhanger: '回放監視器，畫面裡整晚只有林夏一個人。', seconds: 30 }],
    }, { touch: false });
    merge(p, {
      _mode: 'replace',
      shots: [
        { id: 'e1-01', ep: 'e1', scene: 1, order: 1, sec: 3, loc: 'l1', time: '深夜', size: '大特寫', angle: '俯拍', move: '推', cast: [{ c: 'c1', outfit: 'o1', expr: '僵住' }], items: [{ p: 'p1', state: 'lying flat on the counter under her finger' }], textDir: '字朝鏡頭', action: '收據特寫，林夏的手指停在簽名上', visualEn: 'extreme close-up of a faded receipt on a store counter, a young woman\'s finger frozen on a handwritten signature', motionEn: 'the finger trembles as the camera slowly pushes in on the signature', lines: [{ c: 'c1', text: '這是我的字。', emo: '低聲' }], sfx: '冰箱壓縮機低鳴' },
        { id: 'e1-02', ep: 'e1', scene: 1, order: 2, sec: 5, loc: 'l1', time: '深夜', size: '中景', angle: '平視', move: '固定', cast: [{ c: 'c1', outfit: 'o1', expr: '警戒' }, { c: 'c2', outfit: 'o1', expr: '微笑' }], action: '黑衣客隔著櫃檯微笑，把零錢一枚枚疊好', visualEn: 'medium shot across a convenience store counter, a pale man in a black coat smiles and stacks coins neatly while the young cashier stares at him', motionEn: 'the man slowly stacks the last coin, the cashier does not move', lines: [{ c: 'c2', text: '妳還是習慣簽在右下角。', emo: '溫和' }] },
        { id: 'e1-03', ep: 'e1', scene: 1, order: 3, sec: 4, loc: 'l1', time: '深夜', size: '近景', angle: '平視', move: '推', cast: [{ c: 'c1', outfit: 'o1', expr: '壓住驚慌' }], action: '林夏抬眼，聲音壓得很低', visualEn: 'medium close-up of the young cashier lifting her eyes, jaw tight, fluorescent light flickering above', motionEn: 'she raises her eyes slowly, the light flickers once', lines: [{ c: 'c1', text: '你是誰？', emo: '壓低' }] },
        { id: 'e1-04', ep: 'e1', scene: 1, order: 4, sec: 5, loc: 'l1', time: '深夜', size: '中景', angle: '過肩', move: '固定', cast: [{ c: 'c2', outfit: 'o1', expr: '笑意更深' }], action: '黑衣客湊近，叫出她的小名', visualEn: 'over-the-shoulder shot from behind the cashier, the man in the black coat leans closer across the counter', motionEn: 'he leans in slowly and whispers', lines: [{ c: 'c2', text: '小夏，妳又忘記了。', emo: '耳語' }] },
        { id: 'e1-05', ep: 'e1', scene: 2, order: 5, sec: 5, loc: 'l2', time: '深夜', size: '遠景', angle: '平視', move: '跟', cast: [{ c: 'c1', outfit: 'o1', expr: '喘氣' }], action: '林夏衝出自動門，騎樓空無一人，只有雨', visualEn: 'wide shot of the young woman bursting out of a glass door onto an empty rainy arcade sidewalk, neon reflections on wet tiles', motionEn: 'the camera follows her as she runs out and stops, looking left and right', sfx: '自動門提示音、雨聲' },
        { id: 'e1-06', ep: 'e1', scene: 3, order: 6, sec: 6, loc: 'l1', time: '深夜', size: '特寫', angle: '主觀', move: '推', cast: [{ c: 'c1', outfit: 'o1', state: 'seen small and grainy inside the CCTV footage' }], action: '監視器畫面：整晚店裡只有林夏一個人', visualEn: 'close-up of a small CCTV monitor showing grainy footage of the store, only one cashier visible, the counter empty in front of her', motionEn: 'the footage fast-forwards, the store stays empty except for her', lines: [{ c: '旁白', text: '那天晚上，沒有人來過。', emo: '平淡' }], sfx: '監視器雜訊' },
      ],
    }, { touch: false });
    return p;
  }

  return {
    SCHEMA, SPEC, OPT, EN, TASKS, COLLECTIONS, CHARS_PER_SEC,
    newProject, newItem, normalize, merge, extractJSON, lint,
    imagePrompt, videoPrompt, sheetPrompt, SHEETS, aiPrompt, exportSRT, exportCSV, exportPromptPack, exportMarkdown, exportScript,
    epShots, epSeconds, speakerName, demoProject, clone, find, clock, EXAMPLES,
  };
});
