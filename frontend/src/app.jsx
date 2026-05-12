// アプリ本体
// 各コンポーネントをまとめ、レシート一覧を localStorage と同期する
import { useState, useEffect } from "react";
import UploadForm from "./components/upload-form.jsx";
import ReceiptList from "./components/receipt-list.jsx";
import CategoryPieChart from "./components/category-pie-chart.jsx";
import MonthlyBarChart from "./components/monthly-bar-chart.jsx";
import { loadReceipts, saveReceipts } from "./utils/storage.js";
import { detectCategory } from "./utils/category.js";

export default function App() {
  // レシート一覧の状態
  const [receipts, setReceipts] = useState([]);

  // 初回マウント時に localStorage から読み込む
  useEffect(() => {
    setReceipts(loadReceipts());
  }, []);

  // 変更があれば localStorage に保存する
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  // 解析結果を受け取って一覧に追加する
  const handleParsed = (parsed) => {
    // 商品ごとにカテゴリを自動判定
    const itemsWithCategory = (parsed.items || []).map((it) => ({
      name: String(it.name || ""),
      price: Number(it.price || 0),
      category: detectCategory(it.name),
    }));

    const newReceipt = {
      // 一意な ID(日時 + 乱数)を付与
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      store: parsed.store || "",
      items: itemsWithCategory,
    };

    setReceipts((prev) => [newReceipt, ...prev]);
  };

  // レシートを削除する
  const handleDelete = (id) => {
    if (!window.confirm("このレシートを削除しますか?")) return;
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  // 全データの合計金額(参考表示用)
  const grandTotal = receipts.reduce(
    (acc, r) =>
      acc + (r.items || []).reduce((a, it) => a + Number(it.price || 0), 0),
    0
  );

  return (
    <div className="container">
      <header className="app-header">
        <h1>レシート家計簿</h1>
        <p className="subtitle">レシートを撮って送るだけで、自動で家計簿に記録します。</p>
      </header>

      <section className="card">
        <UploadForm onParsed={handleParsed} />
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
