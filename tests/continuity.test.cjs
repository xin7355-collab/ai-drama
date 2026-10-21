// AI 常見穿幫的檢查與提示詞（字的方向、人群裡冒出主角、道具／服裝／聲音連戲）與劇本匯出：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

const msgs = (p, ep) => C.lint(p, ep).map(x => x.where + '：' + x.msg).join('\n');
const shot = (p, id) => C.find(p.shots, id);

test('字的方向：有寫字／文件／螢幕卻沒選文字朝向要提醒；字朝鏡頭只能配過肩、主觀或俯拍', () => {
  const p = C.demoProject();
  const s = shot(p, 'e1-03');
  s.action = '林夏低頭在日記上寫字';
  assert.match(msgs(p, 'e1'), /鏡 e1-03：這鏡有寫字、文件或螢幕/);
  s.textDir = '字朝鏡頭';
  assert.match(msgs(p, 'e1'), /鏡 e1-03：字要朝鏡頭時，角度要用過肩、主觀或俯拍/);
  s.angle = '過肩';
  assert.doesNotMatch(msgs(p, 'e1'), /e1-03/);
  s.textDir = '字朝角色';
  s.angle = '平視';
  assert.doesNotMatch(msgs(p, 'e1'), /e1-03/);
  assert.match(C.imagePrompt(p, s), /faces the character using it, away from the camera/);
  assert.match(C.videoPrompt(p, s), /faces the character using it/);
  p.style.videoLang = '中文';
  assert.match(C.videoPrompt(p, s), /紙上的字和手機螢幕朝向角色、背對鏡頭/);
  // 英文描述裡的 phone 也算，但監視器畫面（monitor）不算
  const t = shot(p, 'e1-02');
  t.visualEn = 'the man checks his phone';
  assert.match(msgs(p, 'e1'), /鏡 e1-02：這鏡有寫字/);
  assert.doesNotMatch(msgs(C.demoProject(), 'e1'), /e1-06/);
  // 口語的「報告長官」不是寫字
  const q = C.demoProject();
  shot(q, 'e1-03').action = '林夏立正：報告店長，沒有異狀';
  assert.doesNotMatch(msgs(q, 'e1'), /e1-03/);
});

test('人群裡冒出主角：有敵人或人群卻沒寫其他人要提醒；寫了就在提示詞裡區隔外型', () => {
  const p = C.demoProject();
  const s = shot(p, 'e1-05');
  s.action = '林夏衝出自動門，被一群黑衣打手圍住';
  assert.match(msgs(p, 'e1'), /鏡 e1-05：畫面有敵人或人群/);
  s.extrasEn = 'five thugs in black tracksuits and surgical masks, shaved heads';
  assert.doesNotMatch(msgs(p, 'e1'), /e1-05/);
  const img = C.imagePrompt(p, s);
  assert.match(img, /other people: five thugs in black tracksuits and surgical masks, shaved heads, with faces, hairstyles, builds and clothing clearly different from the 26-year-old East Asian woman/);
  assert.match(img, /the main character appears only once in the frame/);
  assert.match(C.videoPrompt(p, s), /other people: five thugs/);
  // 英文的 crowd 也抓得到
  const t = shot(p, 'e1-03');
  t.visualEn = 'a crowd gathers behind her';
  assert.match(msgs(p, 'e1'), /鏡 e1-03：畫面有敵人或人群/);
  // 兩個角色同框用複數說法
  assert.match(C.imagePrompt(p, shot(p, 'e1-02')), /each named character appears only once in the frame, no duplicate people/);
  // 沒有角色的鏡頭不加
  const u = shot(p, 'e1-04');
  u.cast = [];
  assert.doesNotMatch(C.imagePrompt(p, u), /appears only once/);
});

test('服裝、場景、時段：同一場戲中間改變要提醒，分場就不提醒', () => {
  const p = C.demoProject();
  C.merge(p, { characters: [{ id: 'c1', outfits: [{ id: 'o2', name: '長大衣', prompt: 'long camel coat' }] }] });
  shot(p, 'e1-03').cast[0].outfit = 'o2';
  assert.match(msgs(p, 'e1'), /第1集第1場 鏡 e1-03：林夏的服裝從「店員制服」變成「長大衣」/);
  shot(p, 'e1-03').time = '白天';
  assert.match(msgs(p, 'e1'), /同一場的時段從「深夜」變成「白天」/);
  shot(p, 'e1-04').loc = 'l2';
  assert.match(msgs(p, 'e1'), /同一場換了場景（便利商店→店外騎樓）/);
  // 第 2 場本來就在騎樓，第 3 場回到便利商店：跨場不算
  assert.deepEqual(C.lint(C.demoProject()), []);
  // 沒指定服裝＝第一套，跟明寫 o1 是同一套
  const q = C.demoProject();
  shot(q, 'e1-02').cast[0].outfit = '';
  assert.doesNotMatch(msgs(q, 'e1'), /服裝從/);
});

test('道具與武器：換手、上一鏡還拿著這鏡消失要提醒；畫面寫到卻沒掛上也提醒', () => {
  const p = C.demoProject();
  C.merge(p, { props: [{ id: 'p2', name: '短刀', prompt: 'a short steel dagger with a black leather grip', owner: 'c2' }] });
  shot(p, 'e1-02').items = [{ p: 'p2', state: 'in his right hand' }];
  shot(p, 'e1-03').items = [{ p: 'p2', state: '左手反握' }];
  assert.match(msgs(p, 'e1'), /鏡 e1-03：「短刀」從右手換到左手/);
  shot(p, 'e1-03').items = [];
  assert.match(msgs(p, 'e1'), /鏡 e1-03：「短刀」上一鏡還拿在手上，這鏡沒掛上/);
  // 只提醒一次，不會每鏡都重複
  assert.equal((msgs(p, 'e1').match(/上一鏡還拿在手上/g) || []).length, 1);
  // 放在桌上（不是拿在手上）就不追
  shot(p, 'e1-02').items = [{ p: 'p2', state: 'on the counter' }];
  assert.doesNotMatch(msgs(p, 'e1'), /短刀/);
  shot(p, 'e1-04').action = '黑衣客把短刀插在櫃檯上';
  assert.match(msgs(p, 'e1'), /鏡 e1-04：畫面寫到「短刀」，但沒掛上道具/);
  // 道具外觀與拿法進提示詞，影片也鎖住
  shot(p, 'e1-04').items = [{ p: 'p2', state: 'stabbed upright into the counter' }];
  assert.match(C.imagePrompt(p, shot(p, 'e1-04')), /a short steel dagger with a black leather grip, stabbed upright into the counter/);
  assert.match(C.videoPrompt(p, shot(p, 'e1-04')), /dagger with a black leather grip stays the same, stabbed upright into the counter, no change of hands/);
  // 用名字指稱的道具會換成 id；不存在的道具是錯誤
  C.merge(p, { _mode: 'patch', shots: [{ id: 'e1-05', items: [{ p: '短刀', state: 'x' }] }] });
  assert.equal(shot(p, 'e1-05').items[0].p, 'p2');
  shot(p, 'e1-05').items = [{ p: 'p99', state: '' }];
  assert.ok(C.lint(p, 'e1').some(x => x.level === 'error' && /道具「p99」不存在/.test(x.msg)));
});

test('角色寫進畫面卻沒列出場要提醒；說台詞的人也算有出場', () => {
  const p = C.demoProject();
  shot(p, 'e1-05').action = '林夏衝出自動門，黑衣客早已不見';
  assert.match(msgs(p, 'e1'), /鏡 e1-05：畫面寫到「黑衣客」，但出場角色沒有黑衣客/);
  shot(p, 'e1-05').lines = [{ c: 'c2', text: '在找我嗎？' }];
  assert.doesNotMatch(msgs(p, 'e1'), /e1-05：畫面寫到/);
});

test('聲音連貫：有台詞的角色要有聲線與固定音色；影片提示詞每句帶聲線、只留環境音不要配樂', () => {
  const p = C.demoProject();
  delete C.find(p.characters, 'c1').voiceId;
  delete C.find(p.characters, 'c2').voice;
  const m = msgs(p);
  assert.match(m, /角色「林夏」：有台詞但沒指定配音音色/);
  assert.match(m, /角色「黑衣客」：有台詞但沒寫聲線/);
  assert.doesNotMatch(m, /林夏」：有台詞但沒寫聲線/);
  // 沒台詞的角色不提醒
  C.merge(p, { characters: [{ id: 'c3', name: '路人甲', appearance: 'x, y, z, w', outfits: [{ id: 'o1', name: 'a', prompt: 'b' }] }] });
  assert.doesNotMatch(msgs(p), /路人甲/);
  const v = C.videoPrompt(C.demoProject(), shot(C.demoProject(), 'e1-01'));
  assert.match(v, /says in Taiwanese Mandarin \(voice: 偏低、語速平穩; 低聲\)/);
  assert.match(v, /ambient sound: 冰箱壓縮機低鳴、自動門提示音, sound effect: 冰箱壓縮機低鳴, no background music, about 3 seconds$/);
  const pack = C.exportPromptPack(C.demoProject(), 'e1');
  assert.match(pack, /［配音］林夏（低聲）：這是我的字。｜聲線：偏低、語速平穩｜音色：ElevenLabs 自建音色「林夏-01」/);
});

test('服裝與狀態：圖片與影片提示詞用同一段英文鎖住，受傷淋濕的狀態跟著角色走', () => {
  const p = C.demoProject();
  const s = shot(p, 'e1-05');
  s.cast[0].state = 'rain-soaked hair stuck to her forehead';
  assert.match(C.imagePrompt(p, s), /wearing green and white convenience store vest over a charcoal hoodie, rain-soaked hair stuck to her forehead/);
  assert.match(C.videoPrompt(p, s), /the 26-year-old East Asian woman keeps the same outfit the whole time: green and white convenience store vest over a charcoal hoodie, rain-soaked hair/);
  p.style.videoLang = '中文';
  assert.match(C.videoPrompt(p, s), /林夏全程穿同一套衣服：green and white convenience store vest over a charcoal hoodie，狀態：rain-soaked hair/);
});

test('AI 拆分鏡指令帶入連戲規則，欄位規則有道具、其他人、文字朝向', () => {
  const t = C.aiPrompt('shots', C.demoProject(), 'e1');
  for (const k of ['items 的 p 只能用道具 id', '不換場景、不換時段、不換裝', '不換手、不消失', 'extrasEn', 'textDir', '- textDir：文字朝向，只能填：字朝角色／字朝鏡頭／不露字', '- items：道具，陣列']) assert.ok(t.includes(k), k);
  assert.match(C.aiPrompt('review', C.demoProject(), 'e1'), /7\. AI 常見穿幫/);
});

test('劇本匯出：場次標題只在換場時出現、時間碼連續、沒拆分鏡的集輸出大綱', () => {
  const p = C.demoProject();
  const one = C.exportScript(p, 'e1');
  assert.ok(one.startsWith('《午夜收據（示範）》第1集　凌晨三點的客人\n（6 鏡，約 0:28）\n鉤子：'));
  assert.equal((one.match(/—— 第 \d 場/g) || []).length, 3);
  assert.match(one, /【e1-06｜0:22–0:28｜特寫・主觀・推】/);
  assert.match(one, /林夏（低聲）：這是我的字。/);
  assert.match(one, /道具：舊收據/);
  assert.match(one, /結尾懸念：回放監視器/);
  C.merge(p, { episodes: [{ id: 'e2', no: 2, title: '第二晚', synopsis: '她決定報警', source: '第一段\n第二段' }] });
  const all = C.exportScript(p);
  assert.ok(all.startsWith('《午夜收據（示範）》劇本\n一句話故事：'));
  assert.ok(all.indexOf('第1集') < all.indexOf('第2集'));
  assert.match(all, /第2集　第二晚\n劇情：她決定報警\n\n第一段\n第二段/);
  assert.doesNotMatch(all, /\n{3,}/);
  assert.equal(C.exportScript(C.newProject()), '《未命名》劇本\n\n（還沒有分集）\n');
});

test('分鏡表 CSV 有道具欄', () => {
  const csv = C.exportCSV(C.demoProject(), 'e1');
  const [head, first] = csv.replace('﻿', '').split('\r\n');
  const cols = head.split(',');
  assert.equal(cols[12], '道具');
  assert.ok(first.includes(',舊收據,'));
});
