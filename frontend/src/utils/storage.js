// localStorage を使ったデータ保存ユーティリティ
// レシートの一覧をブラウザに保存する(リロードしても消えない)

const STORAGE_KEY = "kakeibo-receipts";

// 保存されている全レシートを読み込む
export function loadReceipts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("localStorage の読み込みに失敗しました:", e);
    return [];
  }
}

// レシート配列を保存する
export function saveReceipts(receipts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch (e) {
    console.error("localStorage への保存に失敗しました:", e);
  }
}
