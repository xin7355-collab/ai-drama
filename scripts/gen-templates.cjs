// 從 core.js 的欄位定義與 presets.js 的範本庫產生 templates/ 下的模板與範例，讓模板永遠和 App 一致。
// 用法：node scripts/gen-templates.cjs          → 寫檔
//       node scripts/gen-templates.cjs --check  → 只比對，不一致就 exit 1（給測試與 CI 用）
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../core.js');
const P = require('../presets.js');

const dir = path.join(__dirname, '..', 'templates');
const demo = C.demoProject();
const files = {
  '設定集模板.md': C.exportMarkdown(C.newProject(), { tips: true, heading: 'AI 短劇設定集模板' }),
  '範例-午夜收據-設定集.md': C.exportMarkdown(demo),
  '範例-午夜收據-分鏡提示詞包.txt': C.exportPromptPack(demo),
  '範例-午夜收據-第1集.srt': C.exportSRT(demo, 'e1'),
  '範本庫.md': P.libraryMarkdown(),
};

const check = process.argv.includes('--check');
let stale = [];
for (const [name, body] of Object.entries(files)) {
  const f = path.join(dir, name);
  if (check) {
    const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (cur !== body) stale.push(name);
  } else {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, body);
  }
}
if (check && stale.length) {
  console.error('模板過期，請跑 node scripts/gen-templates.cjs：' + stale.join('、'));
  process.exit(1);
}
if (!check) console.log('已產生 ' + Object.keys(files).length + ' 個檔案到 templates/');
