// 範本庫與新提示詞（定裝照、影片對白、參考圖）的離線測試：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const P = require('../presets.js');

const ASCII = /^[\x20-\x7E]+$/;
const dup = list => list.filter((x, i) => list.indexOf(x) !== i);

test('角色範本：欄位齊全、外觀錨點是英文且彼此不同、服裝都找得到', () => {
  const all = P.flat(P.CHARACTERS);
  assert.ok(all.length >= 30, '角色範本至少 30 個');
  assert.deepEqual(dup(all.map(c => c.t)), [], '範本標題不重複');
  assert.deepEqual(dup(all.map(c => c.name)), [], '預設名字不重複');
  assert.deepEqual(dup(all.map(c => c.appearance)), [], '外觀錨點不重複');
  for (const c of all) {
    for (const k of ['name', 'role', 'age', 'gender', 'job', 'personality', 'desire', 'fear', 'secret', 'arc', 'speech', 'appearance', 'voice']) assert.ok(c[k], c.t + ' 缺 ' + k);
    assert.ok(C.OPT.role.includes(c.role), c.t + ' 的定位不在選項裡');
    assert.match(c.appearance, ASCII, c.t + ' 外觀錨點要全英文');
    // 至少年齡＋臉或髮＋體型＋辨識特徵四段，太短的描述每張圖都會長不一樣
    assert.ok(c.appearance.split(',').length >= 4, c.t + ' 外觀錨點太籠統');
    assert.doesNotMatch(c.appearance, /beautiful|handsome|perfect|gorgeous|pretty|elegant|striking|attractive/i, c.t + ' 不要寫抽象形容詞');
    assert.ok(c.outfits.length >= 1, c.t + ' 至少一套服裝');
    for (const n of c.outfits) assert.ok(P.outfit(n), c.t + ' 的服裝「' + n + '」不存在');
  }
});

test('服裝、場景、道具：名稱不重複、英文是 ASCII；場景不放人', () => {
  const outfits = P.flat(P.OUTFITS), locs = P.flat(P.LOCATIONS), props = P.flat(P.PROPS);
  assert.ok(outfits.length >= 50 && locs.length >= 30 && props.length >= 20);
  for (const [name, list, key] of [['服裝', outfits, 'prompt'], ['場景', locs, 'prompt'], ['道具', props, 'prompt']]) {
    assert.deepEqual(dup(list.map(x => x.name)), [], name + '名稱重複');
    for (const x of list) assert.match(x[key], ASCII, name + '「' + x.name + '」的英文有全形字');
  }
  for (const l of locs) {
    assert.ok(C.OPT.locType.includes(l.type), l.name);
    assert.doesNotMatch(l.prompt, /\b(woman|man|men|women|girl|boy|person|people|crowd|crowded|patrons|customers|guests)\b/i, '場景「' + l.name + '」的英文不能放人');
    assert.ok(l.lighting && l.ambience, l.name);
  }
});

test('畫風範本只改風格欄位，故事範本的類型、畫風、班底都對得上', () => {
  const styleKeys = C.SPEC.style.fields.map(f => f.k);
  for (const s of P.STYLES) {
    for (const k of Object.keys(s.set)) assert.ok(styleKeys.includes(k), s.n + ' 有不認得的欄位 ' + k);
    for (const k of ['look', 'prefix', 'suffix', 'negative']) assert.ok(s.set[k], s.n + ' 缺 ' + k);
  }
  assert.deepEqual(dup(P.STORIES.map(s => s.genre)), []);
  const metaKeys = C.SPEC.meta.fields.map(f => f.k);
  for (const s of P.STORIES) {
    assert.ok(C.OPT.genre.includes(s.genre), s.genre);
    assert.ok(P.style(s.style), s.genre + ' 的畫風「' + s.style + '」不存在');
    for (const k of Object.keys(s.meta)) assert.ok(metaKeys.includes(k), s.genre + ' meta.' + k);
    for (const t of s.cast) assert.ok(P.character(t), s.genre + ' 的角色「' + t + '」不存在');
    for (const n of s.locations) assert.ok(P.location(n), s.genre + ' 的場景「' + n + '」不存在');
    assert.ok(s.hooks.length >= 4 && s.cliffs.length >= 4, s.genre + ' 鉤子／懸念靈感太少');
  }
  // 除了「隨機」，每個類型都有故事範本
  for (const g of C.OPT.genre.filter(x => x !== '隨機')) assert.ok(P.story(g), '類型「' + g + '」沒有故事範本');
});

test('整套套用故事範本後的專案沒有錯誤，角色與場景的英文描述齊全', () => {
  for (const s of P.STORIES) {
    const p = C.newProject(s.n);
    Object.assign(p.meta, s.meta, { genre: s.genre });
    Object.assign(p.style, P.style(s.style).set);
    for (const t of s.cast) C.newItem(p, 'characters', P.characterSeed(t));
    for (const n of s.locations) C.newItem(p, 'locations', P.locationSeed(n));
    const round = C.normalize(JSON.parse(JSON.stringify(p)));
    assert.deepEqual(C.lint(round), [], s.genre);
    assert.equal(round.characters[0].outfits[0].id, 'o1');
    assert.equal(round.characters[0].id, 'c1');
  }
});

test('外觀錨點產生器：空白、小孩、母音開頭、光頭、重複特徵', () => {
  assert.equal(P.composeAppearance({}), '');
  assert.equal(P.composeAppearance(null), '');
  assert.equal(P.composeAppearance({ gender: '女', age: '6 歲' }), 'a 6-year-old girl');
  assert.equal(P.composeAppearance({ gender: '男', age: '18 歲', ethnicity: '東亞' }), 'an 18-year-old East Asian man');
  assert.equal(P.composeAppearance({ gender: '女', ethnicity: '歐洲' }), 'a European woman');
  assert.equal(P.composeAppearance({ ethnicity: '東亞' }), 'an East Asian person');
  assert.equal(P.composeAppearance({ gender: '男', age: '80 歲', hairLen: '光頭', hairColor: '黑' }), 'an 80-year-old man, a shaved head');
  assert.equal(P.composeAppearance({ gender: '女', age: '25 歲', hairLen: '及肩', hairColor: '黑', hairStyle: '高馬尾', mark1: '酒窩', mark2: '酒窩' }),
    'a 25-year-old woman, shoulder-length black hair in a high ponytail, deep dimples');
  assert.equal(P.composeAppearance({ gender: '不存在的選項' }), '');
  assert.equal(P.composeAppearance({ face: '圓臉', mark1: '雀斑' }), 'a round face, light freckles across the nose');
});

test('定裝照提示詞：帶外觀與指定服裝、素色背景、不要字，拿掉劇照用語', () => {
  const p = C.demoProject();
  for (const kind of Object.keys(C.SHEETS)) {
    const t = C.sheetPrompt(p, 'c2', kind, 'o1');
    assert.match(t, /thin scar across the left eyebrow/, kind);
    assert.match(t, /long black wool coat/, kind);
    assert.match(t, /plain light grey background/, kind);
    assert.match(t, /no (view )?(labels|text)/, kind);
    assert.doesNotMatch(t, /film still|35mm lens/, kind);
  }
  assert.match(C.sheetPrompt(p, 'c1', 'turnaround'), /front view, side profile, back view/);
  assert.match(C.sheetPrompt(p, 'c1', 'costume'), /vertical 9:16/);
  assert.equal(C.sheetPrompt(p, 'nobody', 'face'), '');
  assert.equal(C.sheetPrompt(p, 'c1', 'nokind'), '');
  // 沒有服裝的角色也組得出來
  C.merge(p, { characters: [{ id: 'c9', name: '新角色', appearance: 'a 30-year-old man, round face, short black hair, a mole on the chin' }] });
  assert.match(C.sheetPrompt(p, 'c9', 'face'), /^photorealistic, head-and-shoulders/);
  assert.doesNotMatch(C.sheetPrompt(p, 'c9', 'face'), /wearing/);
});

test('影片提示詞：對白掛上說話的人、旁白與沒說話的人嘴唇閉合、不要字幕；可改成另外配音', () => {
  const p = C.demoProject();
  const s2 = C.find(p.shots, 'e1-02');
  let v = C.videoPrompt(p, s2);
  assert.match(v, /the tall East Asian man in his 40s says in Taiwanese Mandarin \(voice: 低沉、每句停頓很久; 溫和\): "妳還是習慣簽在右下角。"/);
  assert.match(v, /not speaking keep their lips closed/);
  assert.match(v, /no subtitles/);
  assert.match(v, /about 5 seconds$/);
  const s6 = C.find(p.shots, 'e1-06');
  assert.match(C.videoPrompt(p, s6), /voice-over narrator.*no one on screen speaks/);
  const s5 = C.find(p.shots, 'e1-05');
  assert.doesNotMatch(C.videoPrompt(p, s5), /lips|says/);
  p.style.videoLines = '不帶（另外配音）';
  v = C.videoPrompt(p, s2);
  assert.doesNotMatch(v, /右下角/);
  assert.match(v, /natural lip movement, audio dubbed later/);
  p.style.videoLang = '中文';
  p.style.videoLines = '帶對白';
  assert.match(C.videoPrompt(p, s2), /對白：黑衣客（聲線：低沉、每句停頓很久；溫和）說「妳還是習慣簽在右下角。」。沒說話的人嘴唇閉合。畫面不要字幕或文字。環境音：冰箱壓縮機低鳴、自動門提示音。不要配樂。長度約 5 秒$/);
});

test('參考圖模式：只有出場角色的鏡頭才在最前面加「照參考圖」', () => {
  const p = C.demoProject();
  assert.doesNotMatch(C.imagePrompt(p, C.find(p.shots, 'e1-02')), /reference images/);
  p.style.ref = '定裝照';
  assert.match(C.imagePrompt(p, C.find(p.shots, 'e1-02')), /^Use the attached character reference images/);
  const empty = C.find(p.shots, 'e1-06');
  empty.cast = [];
  assert.doesNotMatch(C.imagePrompt(p, empty), /reference images/);
});

test('提示詞包先列這次用到的角色定裝照，再列分鏡', () => {
  const pack = C.exportPromptPack(C.demoProject(), 'e1');
  const sheets = pack.indexOf('══ 定裝照'), ep = pack.indexOf('══ 第1集');
  assert.ok(sheets > 0 && ep > sheets);
  assert.match(pack, /▌林夏｜聲線：偏低、語速平穩/);
  assert.match(pack, /［三視圖・長大衣］/);
  // 沒有分鏡的專案不出現定裝照段落
  assert.ok(!C.exportPromptPack(C.newProject()).includes('定裝照'));
});

test('AI 拆分鏡指令帶入首幀、單一動作、可生成性規則；橫式不出現直式規則', () => {
  const p = C.demoProject();
  const t = C.aiPrompt('shots', p, 'e1');
  assert.match(t, /第一個畫面（定格/);
  assert.match(t, /一鏡只有一個主要變化/);
  assert.match(t, /容易崩的動作/);
  assert.match(t, /9:16 直式畫面窄/);
  assert.ok(!t.includes('\n\n- '), '規則之間不能有空行');
  p.meta.format = '16:9 橫式';
  assert.doesNotMatch(C.aiPrompt('shots', p, 'e1'), /9:16 直式畫面窄/);
  assert.match(C.aiPrompt('bible', p), /perfect features/);
});

test('範本庫 Markdown 涵蓋所有類別', () => {
  const md = P.libraryMarkdown();
  for (const h of ['## 故事範本', '## 角色原型', '## 服裝', '## 場景', '## 道具', '## 畫風']) assert.ok(md.includes(h), h);
  assert.ok(md.includes('霸道總裁') && md.includes('皇宮大殿') && md.includes('玉珮') && md.includes('港片霓虹'));
});
