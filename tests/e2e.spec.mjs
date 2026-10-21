// 手機尺寸端對端測試：npx playwright test
import { test, expect } from '@playwright/test';

// 每個測試都從乾淨的瀏覽器開始（Playwright 預設每個 test 一個新 context），並收集頁面錯誤
test.beforeEach(async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
});
test.afterEach(async ({ page }) => {
  expect(page.__errors, '頁面不應有 JavaScript 錯誤').toEqual([]);
});

const tab = (page, name) => page.getByRole('navigation', { name: '主要分頁' }).getByRole('button', { name });

test('第一次開啟載入示範專案，五個分頁都正常且沒有橫向捲動', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#projTitle')).toHaveText('午夜收據（示範）');
  for (const name of ['企劃', '設定', '分集', '分鏡', '匯出']) {
    await tab(page, name).click();
    await expect(tab(page, name)).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, name + ' 不該有橫向捲動').toBeLessThanOrEqual(0);
  }
});

test('分鏡：複製提示詞、改進度後時間軸更新，重新整理後保留', async ({ page, browserName }) => {
  await page.goto('/');
  await tab(page, '分鏡').click();
  await expect(page.locator('article.shot')).toHaveCount(6);
  await page.getByRole('button', { name: '複製鏡 e1-02 圖片提示詞' }).click();
  await expect(page.locator('#toast')).toContainText('已複製鏡 e1-02 圖片提示詞');
  if (browserName === 'chromium') {
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('thin scar across the left eyebrow');
    expect(clip).toContain('vertical 9:16 composition');
  }
  await page.getByLabel('鏡 e1-01 進度').selectOption('完成');
  await expect(page.locator('.seg').first()).toHaveAttribute('data-st', '完成');
  await expect(page.getByText('完成 1／6 鏡')).toBeVisible();
  await page.reload();
  await tab(page, '分鏡').click();
  await expect(page.getByLabel('鏡 e1-01 進度')).toHaveValue('完成');
});

test('AI 助手：複製指令、貼回有說明文字與圍欄的回覆、匯入、復原', async ({ page, browserName }) => {
  await page.goto('/');
  await tab(page, '分鏡').click();
  await page.getByRole('button', { name: 'AI 拆分鏡' }).click();
  const dlg = page.getByRole('dialog', { name: 'AI 助手' });
  await expect(dlg.getByLabel('要 AI 做什麼')).toHaveValue('shots');
  await dlg.getByRole('button', { name: '複製指令' }).click();
  await expect(page.locator('#toast')).toContainText('已複製指令');
  if (browserName === 'chromium') {
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('"_mode":"replace"');
    expect(clip).toContain('只輸出一個 JSON 物件');
  }
  const reply = '好的！以下是分鏡：\n```json\n' + JSON.stringify({ _mode: 'replace', shots: [
    { id: 'e1-01', ep: 'e1', sec: 3, loc: 'l1', size: '特寫', action: '新的第一鏡', lines: [{ c: 'c1', text: '誰？' }] },
    { id: 'e1-02', ep: 'e1', sec: 4, loc: '店外騎樓', size: 'wide shot', action: '新的第二鏡', cast: [{ c: '林夏' }] },
  ] }) + '\n```\n需要調整再跟我說。';
  await dlg.getByLabel('把 AI 的回覆整段貼到這裡').fill(reply);
  await dlg.getByRole('button', { name: '匯入', exact: true }).click();
  await expect(dlg.locator('.report')).toContainText('取代第1集原有 6 鏡');
  await dlg.getByRole('button', { name: '去看結果' }).click();
  await expect(page.locator('article.shot')).toHaveCount(2);
  await expect(page.locator('#shot-e1-02')).toContainText('店外騎樓');
  await expect(page.locator('#shot-e1-02')).toContainText('遠景');

  await page.getByRole('button', { name: /^專案/ }).click();
  await page.getByRole('button', { name: '復原上一次 AI 匯入' }).click();
  await expect(page.locator('article.shot')).toHaveCount(6);
});

test('AI 助手：貼錯內容會給可行動的錯誤訊息，不會改到資料', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dlg = page.getByRole('dialog', { name: 'AI 助手' });
  await dlg.getByLabel('把 AI 的回覆整段貼到這裡').fill('{"shots":[{"id":"e1-01"');
  await dlg.getByRole('button', { name: '匯入', exact: true }).click();
  await expect(dlg.locator('.report.err')).toContainText('不完整');
  await dlg.getByRole('button', { name: '完成' }).click();
  await tab(page, '分鏡').click();
  await expect(page.locator('article.shot')).toHaveCount(6);
});

test('新專案：從空白到 AI 生成設定集', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^專案/ }).click();
  await page.getByRole('button', { name: '新專案' }).click();
  await expect(page.locator('#projTitle')).toHaveText('新的短劇');
  await expect(page.getByText('還沒有故事也沒關係')).toBeVisible();
  await page.getByLabel('類型').selectOption('甜寵');
  await page.getByRole('button', { name: '打開 AI 助手' }).click();
  const dlg = page.getByRole('dialog', { name: 'AI 助手' });
  await expect(dlg.getByLabel('要 AI 做什麼')).toHaveValue('bible');
  await dlg.getByText('看指令內容').click();
  await expect(dlg.locator('.prompt')).toContainText('"genre":"甜寵"');
  const bible = {
    meta: { title: '契約室友', logline: '…' },
    characters: [{ id: 'c1', name: '周以安', role: '主角', appearance: 'a 28-year-old East Asian man, short wavy hair, round glasses', outfits: [{ id: 'o1', name: '西裝', prompt: 'navy suit' }] }],
    locations: [{ id: 'l1', name: '頂樓加蓋', prompt: 'rooftop apartment' }],
  };
  await dlg.getByLabel('把 AI 的回覆整段貼到這裡').fill(JSON.stringify(bible));
  await dlg.getByRole('button', { name: '匯入', exact: true }).click();
  await expect(dlg.locator('.report')).toContainText('新增角色 1');
  await dlg.getByRole('button', { name: '去看結果' }).click();
  await expect(page.locator('#projTitle')).toHaveText('契約室友');
  await expect(page.getByRole('button', { name: /周以安/ })).toBeVisible();
});

test('編輯器：新增角色與服裝，刪除時有確認', async ({ page }) => {
  await page.goto('/');
  await tab(page, '設定').click();
  await page.getByRole('button', { name: '新增角色' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('名字').fill('阿德');
  await dlg.getByRole('button', { name: '新增服裝' }).click();
  await dlg.getByLabel('名稱').fill('雨衣');
  await expect(page.locator('#sheetTitle')).toHaveText('阿德');
  await dlg.getByRole('button', { name: '完成' }).click();
  const item = page.getByRole('button', { name: /阿德/ });
  await expect(item).toContainText('缺英文描述');
  await item.click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: '刪除這個角色' }).click();
  await expect(page.getByRole('button', { name: /阿德/ })).toHaveCount(0);
});

test('按新增又沒填就關掉，不留空白資料；打開編輯器時鍵盤不會自己跳出來', async ({ page }) => {
  await page.goto('/');
  await tab(page, '設定').click();
  await page.getByRole('button', { name: '新增角色' }).click();
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  expect(focused).toBe('H2');
  await page.getByRole('dialog').getByRole('button', { name: '完成' }).click();
  await expect(page.getByRole('button', { name: '（未命名）' })).toHaveCount(0);
  await expect(page.locator('#setupColl')).toContainText('角色（2）');
});

test('匯出備份再還原成新專案', async ({ page }) => {
  // 讓 Chromium 走下載路徑（真 iPhone 會走分享面板）
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await page.goto('/');
  await tab(page, '匯出').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /備份專案/ }).click()]);
  const file = await dl.path();
  await page.locator('#importFile').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('已還原成新專案');
  await page.getByRole('button', { name: /^專案/ }).click();
  await expect(page.getByRole('dialog').locator('.item')).toHaveCount(2);
});

test('貼上的內容不會被當成程式執行', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'AI 助手' }).click();
  const dlg = page.getByRole('dialog', { name: 'AI 助手' });
  const evil = '<img src=x onerror="window.__xss=1">';
  await dlg.getByLabel('把 AI 的回覆整段貼到這裡').fill(JSON.stringify({ characters: [{ name: evil, appearance: 'x' }] }));
  await dlg.getByRole('button', { name: '匯入', exact: true }).click();
  await dlg.getByRole('button', { name: '去看結果' }).click();
  await expect(page.getByRole('button', { name: evil })).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(await page.locator('#view img').count()).toBe(0);
});
