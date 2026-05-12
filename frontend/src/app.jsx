// アプリ本体
// 各コンポーネントをまとめ、レシート一覧を localStorage と同期する
import { useState, useEffect } from "react";
import UploadForm from "./components/upload-form.jsx";
import ReceiptList from "./components/receipt-list.jsx";
import CategoryPieChart from "./components/category-pie-chart.jsx";
import MonthlyBarChart from "./components/monthly-bar-chart.jsx";
import { loadReceipts, saveReceipts } from "./utils/storage.js";
import { detectCategory } from "./utils/category.js";
import { validateReceipt, getReceiptTotal } from "./utils/validation.js";

export default function App() {
  // レシート一覧の状態
  const [receipts, setReceipts] = useState([]);

  // 検証で警告が出たレシートを一時保留する状態
  // { receipt: {...}, warnings: ["..."] } もしくは null
  const [pending, setPending] = useState(null);

  // 初回マウント時に localStorage から読み込む
  useEffect(() => {
    setReceipts(loadReceipts());
  }, []);

  // 変更があれば localStorage に保存する
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  // 解析結果を受け取って一覧に追加する(検証で問題があれば保留して確認する)
  const handleParsed = (parsed) => {
    // 商品ごとにカテゴリを自動判定
    const itemsWithCategory = (parsed.items || []).map((it) => ({
      name: String(it.name || ""),
      price: Number(it.price || 0),
      category: detectCategory(it.name),
    }));

    // バックエンドが返した total を数値として正規化(unknown 等は null)
    const totalNum = Number(parsed.total);
    const normalizedTotal = Number.isFinite(totalNum) ? totalNum : null;

    const newReceipt = {
      // 一意な ID(日時 + 乱数)を付与
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      store: parsed.store || "",
      total: normalizedTotal,
      items: itemsWithCategory,
    };

    // 検証(マイナス金額・日付と合計の重複)
    const warnings = validateReceipt(newReceipt, receipts);

    if (warnings.length > 0) {
      // 警告がある場合は保留して、ユーザーに確認してもらう
      setPending({ receipt: newReceipt, warnings });
    } else {
      // 問題なければそのまま追加
      setReceipts((prev) => [newReceipt, ...prev]);
    }
  };

  // 保留中レシートを「それでも追加する」
  const confirmPending = () => {
    if (!pending) return;
    setReceipts((prev) => [pending.receipt, ...prev]);
    setPending(null);
  };

  // 保留中レシートを破棄する
  const cancelPending = () => {
    setPending(null);
  };

  // レシートを削除する
  const handleDelete = (id) => {
    if (!window.confirm("このレシートを削除しますか?")) return;
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  // 全データの合計金額(レシート記載の total を優先して合算)
  const grandTotal = receipts.reduce((acc, r) => acc + getReceiptTotal(r), 0);

  return (
    <div className="container">
      <header className="app-header">
        <h1>レシート家計簿</h1>
        <p className="subtitle">レシートを撮って送るだけで、自動で家計簿に記録します。</p>
      </header>

      <section className="card">
        <UploadForm onParsed={handleParsed} />

        {pending && (
          <div className="warning-banner" role="alert">
            <h3>⚠ 確認してください</h3>
            <ul>
              {pending.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="warning-note">
              この内容で追加しますか?
            </p>
            <div className="warning-actions">
              <button
                type="button"
                className="primary-button"
                onClick={confirmPending}
              >
                それでも追加する
              </button>
              <button
                type="button"
                className="delete-button"
                onClick={cancelPending}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="summary">
          <div>登録件数: <strong>{receipts.length}</strong> 件</div>
          <div>合計金額: <strong>{grandTotal.toLocaleString()} 円</strong></div>
        </div>
        <div className="charts-row">
          <CategoryPieChart receipts={receipts} />
          <MonthlyBarChart receipts={receipts} />
        </div>
      </section>

      <section className="card">
        <ReceiptList receipts={receipts} onDelete={handleDelete} />
      </section>

      <footer className="app-footer">
        <small>データはこのブラウザの中だけに保存されます。</small>
      </footer>
    </div>
  );
}
