// 離線單元測試：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../core.js');

const errors = (p, ep) => C.lint(p, ep).filter(x => x.level === 'error');

test('示範專案沒有錯誤與警告', () => {
  const p = C.demoProject();
  assert.equal(p.shots.length, 6);
  assert.deepEqual(C.lint(p), []);
});

test('extractJSON：說明文字＋圍欄＋尾逗號＋字串內換行都能解析', () => {
  const t = '好的，以下是結果：\n```json\n{"episodes":[{"id":"e1","source":"第一行\n第二行",},],}\n```\n希望有幫助！';
  const v = C.extractJSON(t);
  assert.equal(v.episodes[0].source, '第一行\n第二行');
});

test('extractJSON：字串裡的大括號不影響配對', () => {
  const v = C.extractJSON('{"meta":{"idea":"他說 {不要} 再來"}} 後面還有 {雜訊}');
  assert.equal(v.meta.idea, '他說 {不要} 再來');
});

test('extractJSON：截斷、沒有 JSON、看不出種類的陣列都給可行動的錯誤訊息', () => {
  assert.throws(() => C.extractJSON('{"shots":[{"id":"e1-01"'), /不完整/);
  assert.throws(() => C.extractJSON('抱歉我做不到'), /找不到 JSON/);
  assert.throws(() => C.extractJSON('[{"foo":1}]'), /陣列/);
  assert.ok(C.extractJSON('[{"id":"e1-01","sec":3}]').shots);
});

test('每個 AI 指令的範例 JSON 都能被匯入器解析並合併，且不產生錯誤', () => {
  for (const [task, ex] of Object.entries(C.EXAMPLES)) {
    const p = C.demoProject();
    const prompt = C.aiPrompt(task, p, 'e1');
    assert.ok(prompt.includes(JSON.stringify(ex)), task + ' 指令裡要有範例');
    const data = C.extractJSON('AI 回覆：' + JSON.stringify(ex));
    C.merge(p, data);
    assert.deepEqual(errors(p), [], task);
  }
});

test('審稿指令不要求 JSON，需要集數的工作沒選集要報錯', () => {
  const p = C.demoProject();
  assert.ok(!C.aiPrompt('review', p, 'e1').includes('只輸出一個 JSON'));
  assert.throws(() => C.aiPrompt('shots', p, ''), /請先選一集/);
});

test('merge：replace 模式只取代同一集的分鏡', () => {
  const p = C.demoProject();
  C.merge(p, { episodes: [{ id: 'e2', no: 2, title: '第二集' }] });
  C.merge(p, { _mode: 'replace', shots: [{ id: 'e2-01', ep: 'e2', sec: 4, action: 'A' }] });
  const r = C.merge(p, { _mode: 'replace', shots: [{ id: 'e2-01', ep: 'e2', sec: 5, action: 'B' }, { ep: 'e2', sec: 3, action: 'C' }] });
  assert.equal(r.replaced.e2, 1);
  assert.equal(C.epShots(p, 'e2').length, 2);
  assert.equal(C.epShots(p, 'e1').length, 6);
});

test('merge：分鏡 id 撞到別集時不覆蓋別集', () => {
  const p = C.demoProject();
  C.merge(p, { episodes: [{ id: 'e2', no: 2 }] });
  C.merge(p, { shots: [{ id: 'e1-01', ep: 'e2', sec: 3, action: '新的' }] });
  assert.equal(C.find(p.shots, 'e1-01').ep, 'e1');
  assert.equal(C.epShots(p, 'e2').length, 1);
});

test('merge：patch 只改有給的欄位', () => {
  const p = C.demoProject();
  C.merge(p, { _mode: 'patch', shots: [{ id: 'e1-01', lines: [{ c: 'c1', text: '……我的字？' }] }] });
  const s = C.find(p.shots, 'e1-01');
  assert.equal(s.lines[0].text, '……我的字？');
  assert.equal(s.size, '大特寫');
  assert.equal(s.loc, 'l1');
});

test('merge：用名字指稱角色、場景會自動換成 id；同名角色更新不重複新增', () => {
  const p = C.demoProject();
  // 同一包回覆裡，AI 給了新 id c9 但其實是既有的林夏：分鏡裡的 c9 要跟著對應到 c1
  C.merge(p, {
    characters: [{ id: 'c9', name: '林夏', job: '店長' }],
    shots: [{ ep: 'e1', sec: 3, loc: '店外騎樓', action: 'x', cast: [{ c: '林夏', outfit: '店員制服' }], lines: [{ c: 'c9', text: '嗯' }] }],
  });
  assert.equal(p.characters.length, 2);
  assert.equal(C.find(p.characters, 'c1').job, '店長');
  const s = p.shots[p.shots.length - 1];
  assert.equal(s.loc, 'l2');
  assert.deepEqual(s.cast[0], { c: 'c1', outfit: 'o1', expr: '' });
  assert.equal(s.lines[0].c, 'c1');
});

test('merge：英文或不完整的選項值會對應回中文選項', () => {
  const p = C.demoProject();
  C.merge(p, { shots: [{ id: 'e1-01', ep: 'e1', size: 'extreme close-up', move: 'slow push-in', angle: '平視角度' }] });
  const s = C.find(p.shots, 'e1-01');
  assert.equal(s.size, '大特寫');
  assert.equal(s.move, '推');
  assert.equal(s.angle, '平視');
});

test('merge：不合法 id、超長字串、垃圾型別都會被清掉', () => {
  const p = C.newProject();
  C.merge(p, { characters: [{ id: '<img onerror=x>', name: 'A'.repeat(900), age: { x: 1 } }, null, 'x'] });
  assert.equal(p.characters.length, 1);
  assert.equal(p.characters[0].id, 'c1');
  assert.equal(p.characters[0].name.length, 500);
  assert.equal(p.characters[0].age, '');
  assert.throws(() => C.merge(p, [1, 2]), /不是 JSON 物件/);
});

test('lint：對白太長、超過單鏡上限、同框太多、參照不存在都會被抓到', () => {
  const p = C.demoProject();
  C.merge(p, { shots: [{ id: 'e1-07', ep: 'e1', sec: 12, loc: 'l9', action: 'x',
    cast: [{ c: 'c1' }, { c: 'c2' }, { c: 'c1' }, { c: 'c2' }, { c: 'c7' }],
    lines: [{ c: 'c1', text: '這是一句非常非常非常非常非常非常非常非常非常非常非常長的台詞喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔喔' }] }] });
  const msgs = C.lint(p, 'e1').map(x => x.msg).join('\n');
  assert.match(msgs, /超過單鏡上限/);
  assert.match(msgs, /同框 5 人/);
  assert.match(msgs, /場景「l9」不存在/);
  assert.match(msgs, /角色「c7」不存在/);
  assert.match(msgs, /對白 \d+ 字約要 \d+ 秒/);
});

test('lint：沒有鉤子、懸念、外觀錨點會提醒', () => {
  const p = C.newProject();
  C.merge(p, { characters: [{ name: 'A' }], episodes: [{ no: 1 }] });
  const msgs = C.lint(p).map(x => x.msg).join('\n');
  assert.match(msgs, /外觀錨點/);
  assert.match(msgs, /鉤子/);
  assert.match(msgs, /懸念/);
});

test('提示詞：圖片含外觀錨點、服裝、景別英文與比例；影片可切中文', () => {
  const p = C.demoProject();
  const s = C.find(p.shots, 'e1-02');
  const img = C.imagePrompt(p, s);
  assert.match(img, /thin scar across the left eyebrow/);
  assert.match(img, /long black wool coat/);
  assert.match(img, /medium shot/);
  assert.match(img, /vertical 9:16/);
  assert.match(C.videoPrompt(p, s), /static camera/);
  p.style.videoLang = '中文';
  assert.match(C.videoPrompt(p, s), /鏡頭：固定/);
});

test('SRT：時間碼格式正確且不重疊', () => {
  const srt = C.exportSRT(C.demoProject(), 'e1');
  const times = [...srt.matchAll(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/g)];
  assert.equal(times.length, 5);
  const ms = t => { const [h, m, r] = t.split(':'); const [s, x] = r.split(','); return ((+h * 60 + +m) * 60 + +s) * 1000 + +x; };
  let last = -1;
  for (const [, a, b] of times) { assert.ok(ms(a) >= last && ms(b) > ms(a)); last = ms(b); }
});

test('CSV：有 BOM、跳脫逗號與引號、擋 Excel 公式注入', () => {
  const p = C.demoProject();
  C.merge(p, { _mode: 'patch', shots: [{ id: 'e1-01', action: '=HYPERLINK("x"),好' }] });
  const csv = C.exportCSV(p, 'e1');
  assert.ok(csv.startsWith('\uFEFF集,鏡號'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x""),好"'));
  assert.equal(csv.trim().split('\r\n').length, 7);
});

test('normalize：壞掉的備份檔也能讀成可用的專案', () => {
  const p = C.normalize({ meta: { episodes: 'abc', format: '直式' }, shots: [{ id: 'a' }, { id: 'a' }], characters: 'x' });
  assert.equal(p.meta.episodes, 10);
  assert.equal(p.meta.format, '9:16 直式');
  assert.equal(p.shots.length, 2);
  assert.notEqual(p.shots[0].id, p.shots[1].id);
  assert.deepEqual(p.characters, []);
});

test('newItem：新分鏡接在同一集最後並沿用場景', () => {
  const p = C.demoProject();
  const s = C.newItem(p, 'shots', { ep: 'e1' });
  assert.equal(s.id, 'e1-07');
  assert.equal(s.order, 7);
  assert.equal(s.loc, 'l1');
  const c = C.newItem(p, 'characters');
  assert.equal(c.id, 'c3');
});

test('templates/ 與 core.js 同步', () => {
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'gen-templates.cjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('版本號三處一致（app.js、sw.js、version.json）', () => {
  const root = path.join(__dirname, '..');
  const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).v;
  assert.match(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), new RegExp("APP_VER = '" + v.replace(/\./g, '\\.') + "'"));
  assert.match(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), new RegExp("VER = '" + v.replace(/\./g, '\\.') + "'"));
});
