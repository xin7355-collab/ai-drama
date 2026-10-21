// AI 工具網址資料的離線檢查：node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tools.js');

test('每一類都有工具；網址都是 https 的官方首頁、不帶追蹤參數', () => {
  for (const k of ['chat', 'image', 'video', 'voice', 'music', 'edit']) assert.ok(T.group(k).items.length >= 3, k + ' 太少');
  for (const t of T.all()) {
    for (const u of [t.u, t.uCN].filter(Boolean)) {
      const url = new URL(u);
      assert.equal(url.protocol, 'https:', t.n);
      assert.equal(url.search, '', t.n + ' 網址不要帶參數（追蹤碼、推薦碼）');
      assert.equal(url.username + url.password, '', t.n);
    }
    assert.equal(typeof t.cn, 'boolean', t.n + ' 要標明是不是中國廠牌');
    assert.ok(t.n && t.short && t.d, t.n + ' 欄位不齊');
    assert.ok(t.short.length <= 12, t.n + ' 的按鈕短名太長：' + t.short);
  }
});

test('名稱與網址不重複，同一個網站只列一次', () => {
  const all = T.all();
  const dup = list => list.filter((x, i) => list.indexOf(x) !== i);
  // 同一個網站可以出現在不同類別（例如 Gemini 能寫劇本也能生圖），但同一類別裡不能重複
  for (const g of T.GROUPS) {
    assert.deepEqual(dup(g.items.map(t => t.n)), [], g.l + ' 名稱重複');
    assert.deepEqual(dup(g.items.map(t => t.u)), [], g.l + ' 網址重複');
  }
  assert.ok(all.length >= 40, '工具總數 ' + all.length);
});

test('中國廠牌有標記，已關閉的服務不能當常用工具', () => {
  const cn = T.all().filter(t => t.cn).map(t => t.n);
  assert.ok(cn.length >= 5, '中國廠牌只有 ' + cn.length + ' 個');
  for (const k of ['image', 'video']) assert.ok(T.group(k).items.some(t => t.status !== '已關閉'));
});

test('工具網址 Markdown 每個工具都有連結，含注意事項', () => {
  const md = T.markdown();
  for (const t of T.all()) assert.ok(md.includes('](' + t.u + ')'), t.n);
  assert.match(md, /## 使用前注意/);
  assert.match(md, /〔中〕/);
});
