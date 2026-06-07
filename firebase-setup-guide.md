# 🛠️ Firebase 雲端即時同步資料庫架設教學

本版本使用的是 **Google Firebase Realtime Database** 實時資料庫技術。只要完成以下簡單的 5 個步驟，學生只要一登記新書，大螢幕書櫃就會在不重新整理網頁的情況下**自動即時刷新**！

---

## 步驟 1：建立 Firebase 專案（完全免費）

1. 打開瀏覽器，前往 [Firebase 主控台](https://console.firebase.google.com/)。
2. 登入您的 Google 帳號。
3. 點選 **「新增專案」**（Create a project）。
4. 輸入您的專案名稱（例如：`longmen-bookcase`），點選繼續。
5. 詢問是否啟用 Google Analytics（分析），您可以選擇**關閉**（比較省步驟），然後點選「建立專案」。
6. 等待專案建立完成後，點選「繼續」進入主控台。

---

## 步驟 2：啟用 Realtime Database 資料庫

1. 在左側導覽列中，點選 **「建置」**（Build）展開選單，然後選擇 **「Realtime Database」**。
2. 點選畫面中央的 **「建立資料庫」**（Create database）。
3. **資料庫位置**：選擇預設的「美國（us-central1）」即可，點選下一步。
4. **安全規則**：選擇「以鎖定模式啟動」，點選**「啟用」**。

---

## 步驟 3：修改安全規則（開放讀寫）

由於我們是供班級學生免註冊快速登記，需要將資料庫設定為公開讀寫：

1. 在 Realtime Database 頁面中，切換到上方的 **「規則」**（Rules）標籤頁。
2. 將規則內容修改為以下代碼（即將 `.read` 與 `.write` 都改為 `true`）：
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
3. 點選右上角的 **「發佈」**（Publish）按鈕儲存。
   *(註：Firebase 會顯示紅色的安全警告，這是正常的，因為此資料庫僅作為班級成果展示，沒有高機密資料，公開讀寫最方便。)*

---

## 步驟 4：取得網頁 API 金鑰（組態配置）

1. 點選左上角「專案總覽」（Project Overview）旁邊的 **「齒輪圖示」** ⚙️，選擇 **「專案設定」**（Project settings）。
2. 在「您的應用程式」下方，點選 **「網頁」圖示 `</>`**（Web App）。
3. 輸入一個應用程式暱稱（例如：`bookcase-web`），點選「註冊應用程式」。
4. 註冊後，畫面會出現一段 `firebaseConfig` 程式碼，看起來像這樣：
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyA...",
     authDomain: "longmen-bookcase.firebaseapp.com",
     databaseURL: "https://longmen-bookcase-default-rtdb.firebaseio.com",
     projectId: "longmen-bookcase",
     storageBucket: "longmen-bookcase.appspot.com",
     messagingSenderId: "123456789...",
     appId: "1:123456789..."
   };
   ```
5. 複製這整段大括號 `{ ... }` 內的所有設定值。

---

## 步驟 5：填入網頁程式碼中

1. 使用純文字編輯器（如 Notepad、VS Code 或 Cursor）打開 `[學思軒閱讀書櫃-雲端即時同步版]` 目錄下的 **`app.js`**。
2. 在檔案最上方（第 4 行至第 12 行），將您剛剛複製的資料庫金鑰貼上，取代原本的預設值：
   ```javascript
   const firebaseConfig = {
       apiKey: "貼上您的 apiKey",
       authDomain: "貼上您的 authDomain",
       databaseURL: "貼上您的 databaseURL",
       projectId: "貼上您的 projectId",
       storageBucket: "貼上您的 storageBucket",
       messagingSenderId: "貼上您的 messagingSenderId",
       appId: "貼上您的 appId"
   };
   ```
3. 儲存檔案。

---

## 🎉 完成！開始線上同步！

現在您可以直接在瀏覽器雙擊打開 `index.html`，或者將整個資料夾上傳至 **Netlify** / **GitHub Pages**。

- 將產生後的網址發送給學生，他們可以登入自己的班級座號並登記書籍。
- 您在投影幕上打開同一個網址，學生一按下「確認登記」，大螢幕的書櫃與排行榜就會在 **0.5 秒內自動即時更新**，不需手動重新整理網頁！
