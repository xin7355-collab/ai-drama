# 專案工作守則（給 Claude Code）

## 1. 溝通
- 一律用繁體中文（台灣用語）回覆、寫註解、寫 commit 訊息。
- 我主要用 iPhone 操作，沒有電腦。步驟以手機能完成為準；要我去設定頁時直接給網址。
- 回報要誠實：哪些驗過、哪些沒驗到，分開講清楚。不確定的事實先查證再講。
- 我說「只是先問問題」時，只回答，不動手改東西。

## 2. 長期授權：以下不用再問我
- 做完直接合併到 main 並推上去，不需要我同意：
  在指定分支開發 → rebase 到最新 main → fast-forward 合併 → push main → 分支也同步推。
  網路失敗重試最多 4 次（間隔 2/4/8/16 秒）；遠端有新 commit 就 fetch + rebase 再推。
- 部署用的分支（例如 gh-pages）也可以直接推。
- 改工作流、加套件、新增檔案、重構——直接做。
- 不要開 Pull Request，除非我明確要求。

## 3. 連這些也直接做，不用先問
- 刪除：Issue、Release、分支、檔案；force push；改寫 git 歷史。
- 花錢：開付費方案、呼叫付費 API。
- 改公開程度：repo 公開／私人切換、網站權限。
- 做了不可逆的事（刪除、force push、會產生費用的動作），完成後在回覆裡明確列出來。

## 4. 隱私與安全
- 我說過「不要上傳 GitHub」的東西永遠不 commit，做好打包給我下載。
- 絕對不要把金鑰、Token 印出來（log、commit、回覆都不行）。金鑰放 repo Secrets；
  程式用 HTTP 標頭傳，不放網址（網址會出現在錯誤訊息和記錄裡）。
- repo 保持公開（公開 repo 的 Actions 分鐘數無上限；私人免費只有 2000 分鐘／月）。所以：
  - README 精簡，不詳述這個軟體在做什麼；詳細說明放 docs/。
  - 用 GitHub Issue 送的通知，標題和內文只寫數量，不寫內容——公開 Issue 會被搜尋引擎收錄。
  - 網站加 `<meta name="robots" content="noindex, nofollow">`。
- 用到付費 API 時提醒我設預算上限。

## 5. 做事的方式
- 先重現再修：修 bug 前用實際資料或真的瀏覽器（Playwright）重現，修完用同樣方法驗證。
- 新功能附離線可跑的自我測試（例如 `python xxx.py selftest`），涵蓋邊界情況。
- 不要默默失敗：
  - 全部失敗時不交出空檔案；部分失敗要講幾個、哪幾個。
  - 分清楚「還沒設定」（安靜等、不發失敗通知）和「真的壞掉」（紅燈、通知我）。
  - 錯誤訊息要說我能做什麼，不是只丟 HTTP 代碼。
- 註解寫「為什麼」與避開了什麼失敗情境，不重述程式在做什麼。
- commit 訊息寫：問題、根本原因、怎麼修、怎麼驗證。
- 不寫死外部 API 的模型名稱（常改名下架）；能自動挑就自動挑，也能用環境變數指定。
  呼叫 AI 時用 skl 的 `ai-model-router`（只寫等級 fast／smart／best／auto，下架自動換、不合格自動升級）。
- 範圍外的問題簡短提出，不擅自擴大範圍。
- 裝了新技能（app-bootstrap）之後不要停在「裝好了」：先列出執行方案（每個新技能要拿來做什麼、會改哪些檔案、
  技能需要的套件寫進哪個設定檔、怎麼驗證、有沒有費用），列完就直接做，不用等我回覆。需要我提供的東西
  （金鑰、帳號、付款）或本守則沒授權的動作才先問我；我說「只裝不做」時才停。
- 不留死碼；改名、搬檔後全專案搜一次舊名稱的殘留參照。
- CLAUDE.md 每次對話都整份載入，控制在 200 行內：只跟某些檔案有關的細節放 `.claude/rules/`（開頭寫 `paths:`），
  讀或改到那些檔案才載入。

## 6. 選用：手機 PWA + GitHub Actions 類型的專案
（新專案是同一種架構才需要這段，不是的話整段刪掉）
- 前端每次改版都更新版本號（例如 `APP_VER`），手機上的舊頁面偵測到會自動重載。
- iPhone 下載檔案用 `navigator.share({files:[f]})`，不要同時帶 `title`
  （iOS 會只送出 title 文字、檔案被丟掉）；不支援再退回 `<a download>`。
- 大檔上傳直接把 File 當 body 送（XHR 有進度條），不要先讀成 ArrayBuffer——1GB 在 iPhone 上必當。
- 版面：一個分頁盡量一張卡；說明收進 `<details>`；選項多用下拉，不用一排排按鈕。
- GitHub Actions：
  - 長工作每做完一個就存進度，不要整批做完才存（被逾時砍掉會全部白做、無限重來）。
  - 發佈結果的步驟加 `if: always()`。
  - 設時間預算，估不下就留到下一輪。
  - 「抓下來」和「處理成功」分兩段記：成功才標記完成，失敗的下一輪自動重試。
  - 預設 shell 是 `bash -e -o pipefail`：`tee` 到的資料夾要先 `mkdir -p`。
- 大檔暫存用 GitHub Release 附件（單檔上限 2 GiB、不進 git 歷史），repo 只放小標記檔觸發工作流。

## 7. 本專案資訊
- 用途：AI 劇本工坊——把故事拆成 AI 短劇的設定集、分集、分鏡，組出圖片／影片／配音提示詞與字幕。
  AI 用「複製指令→貼到 Claude/ChatGPT→貼回匯入」，不接 API。設計理由見 `docs/設計說明.md`。
- 主要檔案：`core.js`（資料、匯入、檢查、提示詞、匯出，不碰 DOM）、`presets.js`（範本庫）、`tools.js`（AI 工具網址，
  新增網址前要查證是官方網域）、`photos.js`（卡片照片，IndexedDB）、`app.js`（介面：流程、角色、分集、工具四個分頁）、
  `index.html`、`styles.css`、`sw.js`。欄位只定義在 `core.js` 的 `SPEC`，表單／AI 指令／模板都由它產生。
- 需要的 Secrets：無。
- 部署在哪：GitHub Pages，main 分支根目錄（`.nojekyll`）。
- 特別注意：
  - 改版時 `app.js` 的 `APP_VER`、`sw.js` 的 `VER`、`version.json` 三處一起改（有測試擋）。
  - 改了 `SPEC`、示範專案、`presets.js` 或 `tools.js` 要跑 `npm run templates` 重產 `templates/`（有測試擋）。
  - 新增 `.js` 檔要同時加進 `index.html` 與 `sw.js` 的 `FILES`，否則離線時會缺檔。
  - 使用者或 AI 給的文字一律用 textContent，不用 innerHTML；CSP 不允許 inline script。
  - 測試：`npm run selftest`、`npx playwright test`（CI 另跑 WebKit，重試才過也算失敗）。
  - 從 Claude 工作階段 push 不會自動觸發「測試」工作流，推完要手動觸發：
    `gh api -X POST repos/xin7355-collab/ai-drama/actions/workflows/test.yml/dispatches -f ref=main`。
