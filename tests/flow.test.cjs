// 流程進度、貼上預覽、大綱審稿、參考圖提示詞：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../core.js');

const deepseek = fs.readFileSync(path.join(__dirname, 'fixtures', 'deepseek-episodes.json'), 'utf8');
const state = steps => Object.fromEntries(steps.map(s => [s.k, s.state]));

test('實際資料：DeepSeek 寫的 12 集大綱貼進示範專案，預覽說清楚會改什麼、而且不改到原專案', () => {
  const p = C.demoProject();
  const before = JSON.stringify(p);
  const pv = C.preview(p, '這是 DeepSeek 的回覆：\n```json\n' + deepseek + '\n```');
  assert.equal(pv.ok, true);
  assert.deepEqual(pv.parts, ['新增分集 11', '更新分集 1']);
  assert.deepEqual(pv.warns, []);
  assert.deepEqual(pv.newErrors, []);
  assert.deepEqual(pv.dest, { tab: 'eps', ep: '' });
  assert.equal(JSON.stringify(p), before, '預覽不能改到真正的專案');
  // 真的匯入後，下一步是拆第 2 集分鏡；第 1 集舊分鏡太短會被健檢抓到
  C.merge(p, C.extractJSON(deepseek));
  const steps = C.flowSteps(p);
  assert.equal(state(steps).shots, 'next');
  assert.equal(steps.find(s => s.k === 'shots').ep, 'e2');
  assert.match(steps.find(s => s.k === 'shots').detail, /已拆 1／12 集，下一集：第2集/);
  assert.ok(C.lint(p).some(x => /分鏡總長 28 秒，目標 60 秒/.test(x.msg)));
});

test('實際資料：同一份大綱貼進還沒有角色的新專案，會提醒先補角色', () => {
  const p = C.newProject('新的短劇');
  const pv = C.preview(p, deepseek);
  assert.deepEqual(pv.parts, ['新增分集 12']);
  assert.match(pv.warns.join(), /專案裡還沒有角色/);
  C.merge(p, C.extractJSON(deepseek));
  assert.equal(state(C.flowSteps(p)).story, 'next');
  // 這時生成設定集的指令會要求 AI 照大綱補齊人物
  assert.match(C.aiPrompt('bible', p), /專案裡已經有 12 集分集大綱/);
  assert.doesNotMatch(C.aiPrompt('bible', C.newProject()), /專案裡已經有/);
});

test('預覽：貼錯內容給可行動的錯誤；貼到別集的分鏡會提醒；會產生錯誤的匯入先講', () => {
  const p = C.demoProject();
  assert.match(C.preview(p, '抱歉，我無法協助').error, /找不到 JSON/);
  assert.match(C.preview(p, '{"shots":[{"id":"e1-01"').error, /不完整/);
  const cross = C.preview(p, JSON.stringify({ shots: [{ id: 'e1-01', ep: 'e1', action: 'a' }, { id: 'e9-01', ep: 'e9', action: 'b' }] }));
  assert.match(cross.warns.join(), /分屬 2 集/);
  assert.ok(cross.newErrors.some(x => /不存在的集「e9」/.test(x.msg)));
  const shots = C.preview(p, JSON.stringify({ _mode: 'replace', shots: [{ id: 'e1-01', ep: 'e1', sec: 3, action: 'x' }] }));
  assert.deepEqual(shots.parts, ['取代第1集原有 6 鏡', '新增分鏡 1']);
  assert.deepEqual(shots.dest, { tab: 'eps', ep: 'e1' });
  assert.deepEqual(C.preview(p, JSON.stringify({ characters: [{ name: '新角色' }] })).dest, { tab: 'cast' });
  assert.deepEqual(C.preview(p, JSON.stringify({ episodes: [{ id: 'e1', source: '小說' }] })).dest, { tab: 'eps', ep: 'e1' });
  assert.deepEqual(C.preview(p, '{"foo":1}').parts, []);
});

test('流程：空專案的下一步是第 1 步；依序完成後下一步往後移；做完全部停在配音剪輯', () => {
  const p = C.newProject('x');
  let s = C.flowSteps(p);
  assert.deepEqual(s.map(x => x.k), ['story', 'episodes', 'photos', 'shots', 'make', 'finish']);
  assert.equal(state(s).story, 'next');
  C.merge(p, { characters: [{ id: 'c1', name: '甲', role: '主角' }, { id: 'c2', name: '路人', role: '路人' }], locations: [{ id: 'l1', name: '店' }] });
  p.meta.episodes = 2;
  assert.equal(state(C.flowSteps(p)).episodes, 'next');
  C.merge(p, { episodes: [{ id: 'e1', no: 1 }] });
  assert.equal(state(C.flowSteps(p)).episodes, 'next', '企劃要 2 集只有 1 集');
  C.merge(p, { episodes: [{ id: 'e2', no: 2 }] });
  s = C.flowSteps(p);
  assert.equal(state(s).photos, 'next', '還沒開始拆分鏡時，建議先做定裝照');
  assert.equal(s.find(x => x.k === 'photos').detail, '0／1 位角色有定裝照', '路人不算');
  // 有定裝照就往下
  s = C.flowSteps(p, (coll, id) => coll === 'characters' && id === 'c1');
  assert.equal(state(s).shots, 'next');
  // 沒做定裝照但已經開始拆分鏡：不再卡在定裝照
  C.merge(p, { shots: [{ id: 'e1-01', ep: 'e1', action: 'a' }] });
  s = C.flowSteps(p);
  assert.equal(state(s).photos, 'todo');
  assert.equal(state(s).shots, 'next');
  assert.equal(s.find(x => x.k === 'shots').ep, 'e2');
  C.merge(p, { shots: [{ id: 'e2-01', ep: 'e2', action: 'b' }] });
  s = C.flowSteps(p);
  assert.equal(state(s).make, 'next');
  assert.equal(s.find(x => x.k === 'make').shot, 'e1-01');
  for (const sh of p.shots) sh.status = '完成';
  s = C.flowSteps(p);
  assert.equal(state(s).finish, 'next');
  assert.equal(s.find(x => x.k === 'finish').ep, 'e1');
});

test('大綱審稿：不用選集、要求條列在前 JSON 在後、只放要改的集', () => {
  const p = C.demoProject();
  C.merge(p, C.extractJSON(deepseek));
  const t = C.aiPrompt('outline', p, '');
  assert.match(t, /審這部劇全部 12 集的分集大綱/);
  assert.match(t, /前後矛盾/);
  assert.match(t, /只放要改的集/);
  assert.ok(t.includes('"title":"那一晚"'), '要帶入全部大綱');
  assert.equal(C.TASKS.outline.needEp, false);
  // 審稿回覆的條列裡夾 JSON，匯入器抓得到最後那段
  const reply = '1. 第12集說黑衣客沒有實體，和第10集跌進雨裡矛盾。\n\n```json\n{"episodes":[{"id":"e12","no":12,"twist":"黑衣客是店長僱來的人"}]}\n```';
  const pv = C.preview(p, reply);
  assert.deepEqual(pv.parts, ['更新分集 1']);
});

test('場景板與道具板：不放人，場景用專案比例、道具用方形；沒有英文描述就不組', () => {
  const p = C.demoProject();
  const loc = C.platePrompt(p, 'locations', 'l1');
  assert.match(loc, /^photorealistic, empty establishing shot of small 24-hour convenience store/);
  assert.match(loc, /no people, no characters/);
  assert.match(loc, /vertical 9:16 composition$/);
  const prop = C.platePrompt(p, 'props', 'p1');
  assert.match(prop, /prop reference of a crumpled faded thermal paper receipt/);
  assert.match(prop, /no hands/);
  assert.match(prop, /square 1:1 composition$/);
  C.merge(p, { locations: [{ id: 'l9', name: '空的' }] });
  assert.equal(C.platePrompt(p, 'locations', 'l9'), '');
  assert.equal(C.platePrompt(p, 'locations', 'nope'), '');
});
