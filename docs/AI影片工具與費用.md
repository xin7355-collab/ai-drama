# AI 影片工具：免費額度、安全性與費用（2026-10-21 調查）

> **先講可信度**：這次是在雲端沙盒裡查的，官網價格頁被網路擋住，**沒有一筆是直接打開官方頁面核對的**。
> 數字都來自 2026-10-21 的網路搜尋結果，很多是第三方整理，彼此常對不上。標「未查證」的就是查不到可靠來源。
> 價格與免費額度變動很快，**付款前一定要自己到官網再看一次**。匯率假設 1 USD ≈ 32 TWD，美元月繳牌價、未稅。

## 這半年的大變動

- **Sora App 已在 2026-04 關閉**，API 在 09 月停止。綁死單一平台的風險是真的。
- **Gemini App 的影片模型從 Veo 換成 Gemini Omni**，免費版不能做影片；免費做影片改走 **Google Flow**。
- 開源模型 **Wan 2.5 之後不再開源**，能自架的停在 Wan 2.2。

## 一、免費能用的

| 工具 | 免費額度 | 浮水印／規格 | 能商用？ | 台灣／iPhone |
|---|---|---|---|---|
| **Google Flow**（Veo 3.1） | 非訂閱者每天 50 點：Lite 每支 10 點（≤8 秒）約 5 支，Fast 每支 20 點約 2 支；尖峰時段可能排不到 | 可見浮水印可關，SynthID＋C2PA 一定留 | 未查證 | 網頁版，iPhone 用 Safari 開（台灣免費帳號有沒有 50 點**未實測**） |
| 可靈 Kling | 每天有免費點數，官方沒寫多少（第三方說約 1～2 支 5 秒） | 720p、有浮水印 | 免費版不可 | 台灣 App Store 有官方 App |
| PixVerse | 註冊 90 點＋每天 60 點，約 1～2 支 | 360～540p、有浮水印 | 不可 | App Store 有很多山寨同名 App，看清開發商 |
| 即夢 Dreamina（Seedance） | 每天有免費點數（說法不一） | 有浮水印 | 未查證 | 有繁中官網；台灣能否註冊未查證 |
| 海螺 Hailuo、Vidu、Runway、Luma | 只有一次性或少量試用點 | 有浮水印 | 不可 | — |
| Pika | 2026-09 起免費版 0 點 | — | — | — |
| YouTube Shorts 內建、Meta Vibes | 免費 | — | — | **台灣沒開放** |
| Grok Imagine、Midjourney | 免費版不能做影片 | — | — | — |

**開源自架**（Wan 2.2 5B，Apache 2.0 可商用）：RTX 4090 約 9 分鐘出一支 5 秒 720p。只有 iPhone 的話做不到，
要租雲端 GPU（RunPod 4090 約每小時 US$0.34），還要會架環境。

## 二、安全評級

評比四個面向：上傳的素材會不會被拿去訓練／存在哪、版權與商用授權、有沒有出處標記（C2PA／SynthID）、公司穩不穩。

| 等級 | 品牌 | 理由 |
|---|---|---|
| **推薦** | Google（Flow／Gemini） | 美國公司；SynthID＋C2PA 一律內嵌。注意：對話可能被人工審查，審過的保留 3 年，關掉「保留活動」也一樣 |
| **推薦** | Adobe Firefly | 用有授權的素材訓練；但**版權賠償只給企業方案**，個人方案沒有 |
| 可用但注意 | Runway | 第三方分析：預設拿輸入與產出訓練，只有企業版能排除 |
| 可用但注意 | Luma | 付費版上傳的內容會授權拿去訓練，沒看到退出機制 |
| 可用但注意 | Midjourney | Pro 以下作品是公開的；正被迪士尼、環球告 |
| **可用，註記中國廠牌** | 可靈（快手）、海螺（MiniMax）、即夢／Seedance（字節）、Vidu（生數）、PixVerse（愛詩）、通義萬相雲端（阿里） | 畫質與對嘴在短劇圈很常用，照樣列進 App 的工具按鈕，只加「中國廠牌」標記。注意：母公司在中國、受中國法規管轄（國際版掛新加坡公司）；第三方指出可靈預設拿輸入訓練；MiniMax 被好萊塢片商告、Seedance 2.0 收到迪士尼存證信函；沒查到有 C2PA。**只上傳虛構角色，不放真人的臉和還沒公開的劇本** |
| **不建議放敏感素材** | Grok Imagine | 2026-01 深偽色情醜聞，多國調查中 |

**台灣使用者要知道的**

- 行政院原則上**公務機關不得使用大陸廠牌的資通訊產品**（含軟體與服務）；接公部門的案子就別用中國廠牌。
- 國安局 2025-11 抽測 5 款中國 AI（DeepSeek、豆包、文心、通義千問、元寶），建議民眾別下載，但沒有強制下架；
  **沒查到有點名可靈、即夢這類影片工具**。個人使用是合法的。
- 實務做法：**只上傳 AI 生成的虛構角色**（例如 App 產生的定裝照），不要放自己或真人的臉。

## 三、做一部短劇要多少錢

估算基準：10 集 × 每集 60 秒 × 約 12 鏡，每鏡平均 5 秒、抽 3 次才滿意 → 生成 1,800 秒（約 360 支）。
鏡頭平均 8 秒的話費用乘 1.6。

| 工具／方案 | 月費 | 每秒約多少 | 1,800 秒估計 |
|---|---|---|---|
| Google AI Pro＋Flow | NT$650（1000 點） | Lite 每支約 NT$6.5、Fast 約 NT$13 | Lite 約 3.6 個月，約 NT$2,340 |
| Google AI Plus | NT$260（200 點） | Lite 每支約 NT$13 | 每月只夠 20 支，不划算 |
| 可靈 Standard／Pro | US$10／US$37 | Pro 約每秒 NT$2.4 | 720p 約 NT$4,100；1080p 有聲約 NT$5,760 |
| 海螺 | US$10.5 起 | 約每秒 US$0.04～0.08 | 約 NT$2,900～5,700（低信心） |
| Runway | US$15 起 | Gen-4 Turbo 較便宜 | Turbo 約 NT$3,000；Gen-4.5 約 NT$6,900 |
| Luma Plus | US$30 | 約每秒 US$0.06～0.09 | 約 NT$3,500～5,200（低信心） |
| Midjourney | US$10 起 | 約每秒 US$0.05～0.07，沒有聲音 | 約 NT$3,500～3,800 |
| Adobe Firefly Premium | US$199.99 | 影片模型不限量 | 訂一個月約 NT$6,400 |
| 自架 Wan 2.2（RunPod） | 每小時 US$0.34 | — | 約 54 小時，約 NT$590（不含學習與重跑） |

**配音與生圖**

- ElevenLabs：免費版約 10 分鐘、不可商用；**Starter 約 US$5～6／月，約 30 分鐘、可商用**，10 集對白抽 3 次剛好夠。
- 生圖（定裝照、關鍵畫面）：Gemini App 免費每天約 20 張（第三方數字）；API 每張約 US$0.067～0.134，360 張約 US$24～48。

## 四、建議組合（以「iPhone、一個人、直式短劇」為前提）

| 預算 | 組合 | 說明 |
|---|---|---|
| **NT$0** | Gemini App 生圖＋Flow 每天 5 支 Lite | 一部 360 支要約 72 天；有浮水印、多半不能商用，適合練習與作品集 |
| **NT$0（加中國廠牌）** | 上面再加可靈、即夢、PixVerse 的每日免費點數 〔中國廠牌〕 | 每天多 3～5 支，一部可縮短到約 40 天；同樣有浮水印、不能商用，只上傳虛構角色 |
| **≤ NT$300／月** | Flow 免費＋ElevenLabs Starter | 配音先能商用；不建議只為影片訂 AI Plus（每月才 20 支） |
| **≤ NT$300／月（中國廠牌）** | 可靈 Standard（首月約 US$6.99、續訂約 NT$282）〔中國廠牌〕 | 單月點數只夠約 110 秒，適合拿來做難鏡頭（雙人、對嘴），不適合整部 |
| **≤ NT$1,000／月** | Google AI Pro（NT$650）＋ElevenLabs Starter | 約 NT$842／月，一部 3～4 個月做完、總共約 NT$2,500～2,800 |

想試雙人互動或對嘴的難鏡頭，可以把 ElevenLabs 換成可靈 Standard（續訂約 NT$282），**但只上傳虛構角色圖**。
可靈 3.0 Omni、Vidu Q3 宣稱支援多張參考圖與原生對嘴，這些比較多半來自廠商或業配文，沒有實測。

**花錢前的建議**：每家都先在官網設好**每月預算上限或關閉自動續訂**；用點數制的先買最小方案試一週。

## 和這個 App 的關係

App 不接任何 AI API，所以換哪一家影片工具都不用改程式，只要：

1. 「流程 → 1. 故事與角色 → 風格與提示詞設定」把**影片提示詞語言**設成工具吃的語言（中國廠牌多半中文較準）、
   **單鏡上限秒數**設成工具單段上限（Flow Lite 8 秒）。
2. 工具會自己出聲（Veo、可靈 3.0）就把**影片提示詞的對白**設成「帶對白」；配音另外用 ElevenLabs 就選「不帶」。
3. 工具能上傳參考圖時，先用角色卡裡的**定裝照提示詞**做好定裝照，按「存入照片」存回卡片（**生圖參考圖**會自動改成「定裝照」），之後每一鏡上傳它。

定裝照與提示詞留在自己手上，平台收掉（像 Sora）也能整包搬到下一家。

## 來源（2026-10-21 搜尋查得，未逐一打開官網核對）

Sora 關閉：the-decoder.com/openai-sets-two-stage-sora-shutdown-with-app-closing-april-2026-and-api-following-in-september/ ·
Gemini 影片：gemini.google/overview/video-generation/ · Gemini API 價格：ai.google.dev/gemini-api/docs/pricing ·
Flow 點數：support.google.com/flow/answer/16526234 · Google AI 方案台灣價：bnext.com.tw/article/85510/google-ai-pro、inside.com.tw/article/40580-google-ai-plus-taiwan ·
可靈方案：kling.ai/app/membership/membership-plan · 海螺：aiarty.com/ai-video-generator/hailuo-ai-pricing.htm ·
Runway：eesel.ai/blog/runway-ai-pricing · Pika 免費版歸零：usagepricing.com/blueprint/activity/pika-labs-2026-09-20-free-tier-zero-credits ·
Luma：hooked.so/compare/luma-ai-pricing · Vidu：platform.vidu.com/docs/pricing · PixVerse：magichour.ai/blog/pixverse-pricing ·
Seedance：dreamina.capcut.com/seedance/seedance-2-0-pricing · Midjourney：eesel.ai/blog/midjourney-pricing ·
Firefly：adobe.com/cc-shared/fragments/products/firefly/plans/faq · Wan 自架：computingforgeeks.com/run-wan-video-generation-locally/、runpod.io/gpu/4090 ·
Gemini 隱私：support.google.com/gemini/answer/13594961 · Runway 條款分析：terms.law/ai-output-rights/runway/ ·
Luma 條款分析：conductatlas.com/platform/luma-ai/luma-ai-terms-of-service/perpetual-irrevocable-ai-training-license-paid-tier/ ·
片商訴訟：engadget.com/ai/disney-warner-bros-discovery-and-universal-file-joint-lawsuit-against-generative-ai-app-hailuo-163819825.html、axios.com/2026/02/13/disney-bytedance-seedance ·
Grok 調查：letsdatascience.com/news/governments-crack-down-on-grok-deepfakes-e1162791 · 可靈隱私：verifywise.ai/ai-trust-index/kling-ai ·
公務機關禁用：cna.com.tw/news/aipl/202502030237.aspx · 國安局抽測：ithome.com.tw/news/172279 ·
ElevenLabs：bigvu.tv/blog/elevenlabs-pricing-2026-plans-credits-commercial-rights-api-costs/
