/* 參考圖（角色定裝照、場景圖、道具圖）的儲存：放 IndexedDB，不放 localStorage。
   localStorage 整個網站只有約 5MB，放兩三張照片就滿，連專案文字都會存不進去。
   照片先縮到長邊 1600px 的 JPEG：iPhone 原圖動輒 3～5MB，十張就讓備份檔大到難以分享；
   1600px 拿去當生圖、生影片的參考圖仍然夠清楚。 */
'use strict';
(function (root) {
  const DB = 'aidrama';
  const STORE = 'photos';
  const MAX_SIDE = 1600;
  const MAX_FILE = 40 * 1024 * 1024;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(DB, 1); } catch (e) { reject(new Error('這個瀏覽器不能存照片（可能是無痕模式）')); return; }
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('這個瀏覽器不能存照片（可能是無痕模式）'));
      req.onblocked = () => reject(new Error('照片資料庫被其他分頁占用：請關掉其他開著這個 App 的分頁再試'));
    });
    // 失敗不要快取，下次呼叫才會重試（例如使用者關掉了占用的分頁）
    dbp.catch(() => { dbp = null; });
    return dbp;
  }

  // 一次交易做完再回報：等 oncomplete 才算真的寫進去，避免畫面說存好了、其實被中斷
  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      let out;
      const t = db.transaction(STORE, mode);
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error || new Error('照片存取失敗'));
      t.onabort = () => reject(t.error || new Error('照片存取被中斷：手機空間可能不夠'));
      try { fn(t.objectStore(STORE), v => { out = v; }); } catch (e) {
        try { t.abort(); } catch (x) { /* 已經結束的交易不能再中止 */ }
        reject(e);
      }
    }));
  }

  const key = (pid, coll, id) => pid + '|' + coll + '|' + id;
  const range = pid => IDBKeyRange.bound(pid + '|', pid + '|￿');

  function put(pid, coll, id, blob) { return tx('readwrite', st => { st.put(blob, key(pid, coll, id)); }); }
  function get(pid, coll, id) {
    return tx('readonly', (st, set) => { const r = st.get(key(pid, coll, id)); r.onsuccess = () => set(r.result || null); });
  }
  function del(pid, coll, id) { return tx('readwrite', st => { st.delete(key(pid, coll, id)); }); }
  function delProject(pid) { return tx('readwrite', st => { st.delete(range(pid)); }); }
  function list(pid) {
    return tx('readonly', (st, set) => {
      const out = [];
      const r = st.openCursor(range(pid));
      r.onsuccess = () => {
        const c = r.result;
        if (!c) { set(out); return; }
        const parts = String(c.key).split('|');
        out.push({ coll: parts[1], id: parts.slice(2).join('|'), blob: c.value });
        c.continue();
      };
    });
  }

  // 縮圖用 canvas：iPhone 的 canvas 有面積上限，先算好尺寸再畫；畫完把 canvas 歸零，記憶體才會馬上釋放
  function shrink(file) {
    if (!file) return Promise.reject(new Error('沒有選到照片'));
    if (file.type && !/^image\//.test(file.type)) return Promise.reject(new Error('這不是圖片檔：請選 JPG、PNG 或 HEIC 照片'));
    if (file.size > MAX_FILE) return Promise.reject(new Error('照片超過 40MB：請先在相簿裁小一點再選'));
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w0 = img.naturalWidth, h0 = img.naturalHeight;
          if (!w0 || !h0) throw new Error('empty');
          const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w0 * s));
          c.height = Math.max(1, Math.round(h0 * s));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(b => {
            c.width = 0; c.height = 0;
            if (b) resolve(b); else reject(new Error('照片轉檔失敗：換一張試試'));
          }, 'image/jpeg', 0.88);
        } catch (e) { reject(new Error('照片太大或格式不支援：換一張試試')); }
      };
      img.onerror = () => reject(new Error('讀不到這張照片：換一張 JPG 或 PNG 試試'));
      img.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }

  // 只給備份用，而且讀的是 shrink() 縮好的 JPEG（長邊 1600px、通常幾百 KB），不是相簿原圖，記憶體有上限
  function toDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('照片讀取失敗'));
      r.readAsDataURL(blob);
    });
  }
  // 不用 fetch(dataURL)：CSP 的 connect-src 只允許自己網站，fetch data: 會被擋
  function fromDataURL(s) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(String(s || ''));
    if (!m) return null;
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  }

  // 請瀏覽器不要自動清掉這個網站的資料（加到主畫面的 iPhone 網頁 App 比較容易拿到）；拿不到也照常運作
  function persist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* 舊瀏覽器沒有這個功能 */ }
  }

  root.DramaPhotos = { put, get, del, delProject, list, shrink, toDataURL, fromDataURL, persist };
})(typeof self !== 'undefined' ? self : globalThis);
