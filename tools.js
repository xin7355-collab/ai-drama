/* AI 工具網址：「工具」分頁與各處「開」按鈕的資料。只有資料與產生文件的函式，不碰 DOM。
   AI 影音工具的山寨網域很多（假的可靈、海螺會騙錢），所以每個網址都要先查證是官方網域才放進來；
   查不到官方來源的寧可不放。cn: true 是母公司在中國（受中國法規管轄），App 會標「中國廠牌」。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DramaTools = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const CHECKED = '2026-10-21';

  // n：顯示名稱；short：按鈕上的短名；u：官方網址；uCN：中國大陸版網址；cn：中國廠牌；d：一句話用途與免費額度
  // status：營運中／已關閉…；只有「營運中」以外才在畫面上加標記
  const GROUPS = [
    { k: 'chat', l: '寫劇本（貼 AI 助手的指令）', tip: '把 AI 助手複製的指令貼過去，再把回覆整段貼回 App。', items: [
      { n: 'Claude', short: 'Claude', u: 'https://claude.ai', cn: false, d: '寫劇本、拆分鏡最穩；免費版有用量上限' },
      { n: 'ChatGPT', short: 'ChatGPT', u: 'https://chatgpt.com', cn: false, d: '有免費版；同一個 App 也能生圖' },
      { n: 'Gemini', short: 'Gemini', u: 'https://gemini.google.com', cn: false, d: '有免費版；同一個 App 也能生圖' },
      { n: 'DeepSeek 深度求索', short: 'DeepSeek', u: 'https://chat.deepseek.com', cn: true, d: '免費；台灣可用，公務機關禁用' },
      { n: 'Grok', short: 'Grok', u: 'https://grok.com', cn: false, d: '免費，訂 SuperGrok 可加量' },
      { n: '微軟 Copilot', short: 'Copilot', u: 'https://copilot.microsoft.com', cn: false, d: '微軟帳號免費，部分功能限量' },
      { n: 'Perplexity', short: 'Perplexity', u: 'https://www.perplexity.ai', cn: false, d: '附來源的搜尋，查資料、查典故用；基本免費' },
      { n: 'Meta AI', short: 'Meta AI', u: 'https://www.meta.ai', cn: false, d: '核心功能免費' },
      { n: 'Mistral Vibe（原 Le Chat）', short: 'Mistral', u: 'https://chat.mistral.ai', cn: false, d: '2026-05 改名 Mistral Vibe；有免費方案' },
      { n: 'Poe', short: 'Poe', u: 'https://poe.com', cn: false, d: '一個帳號用多家模型；免費額度未查證' },
      { n: '千問 Qwen', short: '千問', u: 'https://chat.qwen.ai', uCN: 'https://www.qianwen.com', cn: true, d: '阿里（國內版原名通義）；免費' },
      { n: 'Kimi', short: 'Kimi', u: 'https://www.kimi.com', cn: true, d: '長文閱讀強；免費額度未查證' },
      { n: '智譜清言／Z.ai', short: '智譜', u: 'https://chat.z.ai', uCN: 'https://chatglm.cn', cn: true, d: '國際版叫 Z.ai' },
      { n: '豆包', short: '豆包', u: 'https://www.doubao.com', cn: true, d: '字節；中國大陸版，可能要中國手機號' },
      { n: '文心一言', short: '文心一言', u: 'https://yiyan.baidu.com', cn: true, d: '百度；中國大陸版' },
      { n: '騰訊元寶', short: '元寶', u: 'https://yuanbao.tencent.com', cn: true, d: '騰訊；中國大陸版' },
    ] },
    { k: 'image', l: '生圖（定裝照、關鍵畫面）', tip: '先做定裝照，再用分鏡的圖片提示詞生每一鏡的第一個畫面。英文提示詞在 Midjourney、FLUX 最準；中國廠牌中文也行。', items: [
      { n: 'Gemini（Nano Banana）', short: 'Gemini', u: 'https://gemini.google.com', cn: false, d: '免費每天可生少量圖；做定裝照方便，圖上的中文字比較不會壞' },
      { n: 'Google AI Studio', short: 'AI Studio', u: 'https://aistudio.google.com', cn: false, d: '免費（有速率限制），直接用 Google 的生圖模型' },
      { n: 'ChatGPT 生圖', short: 'ChatGPT', u: 'https://chatgpt.com', cn: false, d: '對話式改圖方便；免費版次數少' },
      { n: 'Midjourney', short: 'Midjourney', u: 'https://www.midjourney.com', cn: false, d: '畫質與風格強；沒有免費方案，每月 US$10 起' },
      { n: 'FLUX Playground', short: 'FLUX', u: 'https://playground.bfl.ai', cn: false, d: 'Black Forest Labs 官方；部分模型免註冊可試' },
      { n: 'Ideogram', short: 'Ideogram', u: 'https://ideogram.ai', cn: false, d: '圖上要放字時最穩；每週少量免費點數，免費作品會公開' },
      { n: 'Leonardo', short: 'Leonardo', u: 'https://leonardo.ai', cn: false, d: '每日 150 點免費' },
      { n: 'Adobe Firefly', short: 'Firefly', u: 'https://firefly.adobe.com', cn: false, d: '用有授權的素材訓練，商用較安心；每日少量免費' },
      { n: 'Bing Image Creator', short: 'Bing 生圖', u: 'https://www.bing.com/images/create', cn: false, d: '免費；每日 10～15 次快速生成，之後是標準速度' },
      { n: 'Krea', short: 'Krea', u: 'https://www.krea.ai', cn: false, d: '即時生圖、改圖、放大；免費額度未查證' },
      { n: 'Recraft', short: 'Recraft', u: 'https://www.recraft.ai', cn: false, d: '設計與向量風；每日約 30 次免費' },
      { n: 'Canva', short: 'Canva', u: 'https://www.canva.com', cn: false, d: '封面、海報、排字' },
      { n: 'Civitai', short: 'Civitai', u: 'https://civitai.com', cn: false, d: '模型與 LoRA 社群；內容良莠不齊，注意分級' },
      { n: '即夢 Dreamina', short: '即夢', u: 'https://dreamina.capcut.com', uCN: 'https://jimeng.jianying.com', cn: true, d: '字節；生圖、生影片同一站，免費點數依帳號與地區' },
      { n: '可靈 Kling', short: '可靈', u: 'https://kling.ai', uCN: 'https://klingai.com', cn: true, d: '可靈網站也能生圖（原「可圖」已整合進來）' },
      { n: 'SeaArt 海藝', short: 'SeaArt', u: 'https://www.seaart.ai', cn: true, d: '線上跑社群模型；官方稱每日 150 點' },
      { n: 'Tensor.Art', short: 'Tensor.Art', u: 'https://tensor.art', cn: true, d: '線上跑社群模型；標榜免費' },
      { n: 'LiblibAI 哩布哩布', short: 'Liblib', u: 'https://www.liblib.art', cn: true, d: '模型社群＋線上生圖；中國大陸版' },
    ] },
    { k: 'video', l: '生影片（圖生影片）', tip: '上傳這一鏡的關鍵畫面，貼影片提示詞。「單鏡上限秒數」記得照工具設定。', items: [
      { n: 'Google Flow（Veo）', short: 'Flow', u: 'https://labs.google/fx/tools/flow', cn: false, d: '免費帳號能不能生影片說法不一，Google AI Plus 以上確定可以；台灣可用' },
      { n: '可靈 Kling', short: '可靈', u: 'https://kling.ai', uCN: 'https://klingai.com', cn: true, d: '短劇圈最常用之一；有每日免費額度但有浮水印。認明 kling.ai，klingx.ai、klingxai.com 是假站' },
      { n: '即夢 Seedance', short: '即夢', u: 'https://dreamina.capcut.com', uCN: 'https://jimeng.jianying.com', cn: true, d: '字節的 Seedance；新模型分地區開放' },
      { n: '海螺 Hailuo', short: '海螺', u: 'https://hailuoai.video', uCN: 'https://hailuoai.com', cn: true, d: 'MiniMax；有免費試用點數' },
      { n: 'Vidu', short: 'Vidu', u: 'https://www.vidu.com', uCN: 'https://www.vidu.cn', cn: true, d: '可放多張參考圖；註冊送體驗點數' },
      { n: 'PixVerse 拍我', short: 'PixVerse', u: 'https://app.pixverse.ai', uCN: 'https://pai.video', cn: true, d: '首次 60 點、之後每日 30 點' },
      { n: '萬相 Wan', short: '萬相', u: 'https://wan.video', uCN: 'https://tongyi.aliyun.com/wan/', cn: true, d: '阿里；開源版 Wan 2.2 可在自己的電腦跑' },
      { n: 'Gemini（Omni 影片）', short: 'Gemini', u: 'https://gemini.google.com', cn: false, d: '要 Google AI Plus 以上才能生影片' },
      { n: 'Runway', short: 'Runway', u: 'https://runwayml.com', cn: false, d: '一次性 125 點免費，用完不補' },
      { n: 'Luma', short: 'Luma', u: 'https://lumalabs.ai', cn: false, d: '試用有浮水印、不可商用' },
      { n: 'Pika', short: 'Pika', u: 'https://pika.art', cn: false, d: '免費版 0 點，要買點數' },
      { n: 'Adobe Firefly 影片', short: 'Firefly', u: 'https://firefly.adobe.com', cn: false, d: '用有授權的素材訓練，商用較安心' },
      { n: 'Midjourney 影片', short: 'Midjourney', u: 'https://www.midjourney.com', cn: false, d: '要訂閱；沒有聲音' },
      { n: 'Grok Imagine', short: 'Grok', u: 'https://grok.com/imagine', cn: false, d: '方案常變，以官網為準' },
      { n: 'Higgsfield', short: 'Higgsfield', u: 'https://higgsfield.ai', cn: false, d: '電影運鏡模板多；有免費入門額度' },
      { n: 'LTX Studio', short: 'LTX', u: 'https://ltx.studio', cn: false, d: '從劇本、分鏡到影片的一站式工具' },
      { n: 'Viggle', short: 'Viggle', u: 'https://viggle.ai', cn: false, d: '把一段動作套到角色上；每日少量免費、有浮水印' },
      { n: 'Picsart 微短劇', short: 'Picsart', u: 'https://picsart.com/ai-microdrama-generator/', cn: false, d: 'Picsart 的 AI 微短劇產生器' },
      { n: 'OiiOii', short: 'OiiOii', u: 'https://www.oiioii.ai', cn: true, d: 'AI 動畫、漫劇；每日免費點數' },
      { n: '小雲雀（字節）', short: '小雲雀', u: 'https://xyq.jianying.com', cn: true, d: 'AI 短劇 Agent（2026-03 上線）；中國大陸版' },
      { n: 'Seko（商湯）', short: 'Seko', u: 'https://seko.sensetime.com', cn: true, d: '可以連續做到上百集的短劇工具；中國大陸版' },
      { n: 'LibTV（哩布）', short: 'LibTV', u: 'https://www.liblib.tv', cn: true, d: 'AI 影片創作平台；中國大陸版' },
    ] },
    { k: 'voice', l: '配音與對嘴', tip: '每個角色固定用同一個音色，名稱填進角色的「配音音色」；對白文字從提示詞包或劇本複製。', items: [
      { n: 'ElevenLabs', short: 'ElevenLabs', u: 'https://elevenlabs.io', cn: false, d: '配音首選；每月 1 萬點免費（約 10 分鐘，不可商用）' },
      { n: 'MiniMax 語音', short: 'MiniMax', u: 'https://www.minimax.io/audio', cn: true, d: '海螺同一家的語音；免費額度未查證' },
      { n: 'Fish Audio', short: 'Fish Audio', u: 'https://fish.audio', cn: false, d: '免費版限個人、不可商用' },
      { n: 'Murf', short: 'Murf', u: 'https://murf.ai', cn: false, d: '約 10 分鐘免費，免費版不能下載' },
      { n: 'Hedra', short: 'Hedra', u: 'https://www.hedra.com', cn: false, d: '讓角色照片開口說話；免費有浮水印、不可商用' },
      { n: 'HeyGen', short: 'HeyGen', u: 'https://www.heygen.com', cn: false, d: '數位人與對嘴；免費每月 1～3 支、每支 1 分鐘內' },
      { n: 'sync.（對嘴）', short: 'sync.', u: 'https://sync.so', cn: false, d: '把配音對到影片嘴型；免費每月 3 次、每次 20 秒內' },
      { n: 'Azure Speech Studio', short: 'Azure 語音', u: 'https://speech.microsoft.com', cn: false, d: '微軟語音；自訂語音 2026-06 移到 Microsoft Foundry' },
      { n: '魔音工坊', short: '魔音工坊', u: 'https://www.moyin.com', cn: true, d: '中文配音；中國大陸版' },
    ] },
    { k: 'music', l: '配樂', tip: '影片提示詞一律寫「不要配樂」，配樂在剪輯時統一加，前後才不會跳。', items: [
      { n: 'Suno', short: 'Suno', u: 'https://suno.com', cn: false, d: '每日 50 點（約 10 首），免費版不可商用' },
      { n: 'ElevenLabs Music', short: 'ElevenLabs', u: 'https://elevenlabs.io/music', cn: false, d: '和 ElevenLabs 配音共用點數' },
      { n: 'Stable Audio', short: 'Stable Audio', u: 'https://stableaudio.com', cn: false, d: 'Stability AI 的配樂工具' },
      { n: 'Mureka', short: 'Mureka', u: 'https://www.mureka.ai', cn: true, d: 'AI 作曲；免費額度未查證' },
    ] },
    { k: 'edit', l: '剪輯與字幕', tip: '把 App 匯出的 .srt 字幕匯入，照分鏡表的時間碼排片段。', items: [
      { n: 'CapCut／剪映', short: 'CapCut', u: 'https://www.capcut.com', uCN: 'https://www.capcut.cn', cn: true, d: '剪輯、上字幕、AI 配音；網頁版免費。台灣可用（國際版）' },
      { n: 'Adobe Express', short: 'Express', u: 'https://www.adobe.com/express', cn: false, d: '免費剪輯並匯出 MP4' },
      { n: 'Descript', short: 'Descript', u: 'https://www.descript.com', cn: false, d: '用改逐字稿的方式剪片；免費每月 1 小時轉錄' },
      { n: 'VEED', short: 'VEED', u: 'https://www.veed.io', cn: false, d: '線上剪輯與自動字幕；免費有浮水印' },
      { n: 'OpusClip', short: 'OpusClip', u: 'https://www.opus.pro', cn: false, d: '長片自動剪成短影音；每月 60 點免費' },
    ] },
    { k: 'upscale', l: '畫質提升', tip: '影片做完再放大，比一開始就生高解析度省錢。', items: [
      { n: 'Topaz Labs（網頁版）', short: 'Topaz', u: 'https://app.topazlabs.com', cn: false, d: '影片與圖片放大' },
      { n: 'Krea Enhancer', short: 'Krea 放大', u: 'https://www.krea.ai/apps/enhance', cn: false, d: '圖片放大；官方稱不用登入就能試' },
    ] },
  ];

  const NOTES = [
    '網址查證於 ' + CHECKED + '。看到網址列不是這裡寫的網域就不要登入、不要付款，山寨站很多。',
    '標「中國廠牌」的是母公司在中國的服務：個人使用合法，但只上傳虛構角色，不要放真人的臉和還沒公開的劇本；接公部門的案子不要用。',
    '免費額度和價格常常改，付費前到官網再確認一次，並設好每月預算上限或關掉自動續訂。',
    '同一部劇盡量固定用同一個生圖、影片、配音工具；換工具時臉、畫風、聲音都會跟著變。',
    '沒有列：Sora（2026 年已關閉）、ImageFX 與 Whisk（併入 Flow）、Udio（停止下載）；騰訊混元影片、SkyReels 查不到官方來源，先不放。',
    '可靈的國際版網址是 kling.ai（中國版 klingai.com）；klingxai.com、klingx.ai、klingaistudio.com 這類是假站，曾被資安公司點名夾帶木馬。',
    '費用與安全性的比較在 GitHub 的 docs/AI影片工具與費用.md。',
  ];

  function group(k) { return GROUPS.find(g => g.k === k) || { k, l: k, items: [] }; }
  function all() { return GROUPS.reduce((a, g) => a.concat(g.items.map(t => Object.assign({ group: g.k }, t))), []); }

  // 給 gen-templates 產生 templates/AI工具網址.md，不開 App 也能點
  function markdown() {
    const md = ['# AI 短劇工具網址', '', '查證日期：' + CHECKED + '。〔中〕＝中國廠牌。', ''];
    for (const g of GROUPS) {
      md.push('## ' + g.l, '');
      if (g.tip) md.push(g.tip, '');
      for (const t of g.items) {
        md.push('- [' + t.n + '](' + t.u + ')' + (t.cn ? ' 〔中〕' : '') + (t.status && t.status !== '營運中' ? '（' + t.status + '）' : '') + '：' + t.d + (t.uCN ? '｜中國大陸版：' + t.uCN : ''));
      }
      md.push('');
    }
    md.push('## 使用前注意', '');
    for (const x of NOTES) md.push('- ' + x);
    md.push('');
    return md.join('\n');
  }

  return { CHECKED, GROUPS, NOTES, group, all, markdown };
});
