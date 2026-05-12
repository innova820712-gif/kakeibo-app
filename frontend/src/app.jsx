// アプリ本体
// 各コンポーネントをまとめ、領収書一覧を localStorage と同期する
// 左サイドバーから「月+カテゴリ」を選ぶと、メイン画面の明細リストが
// その月+カテゴリで絞り込まれる(円グラフ・棒グラフ・表は常に全期間ベース)
import { useState, useEffect, useMemo } from "react";
import UploadForm from "./components/upload-form.jsx";
import ReceiptList from "./components/receipt-list.jsx";
import CategoryPieChart from "./components/category-pie-chart.jsx";
import MonthlyBarChart from "./components/monthly-bar-chart.jsx";
import CategoryTable from "./components/category-table.jsx";
import Sidebar from "./components/sidebar.jsx";
import { loadReceipts, saveReceipts } from "./utils/storage.js";
import { resolveCategory } from "./utils/category.js";
import { validateReceipt, getReceiptTotal } from "./utils/validation.js";

export default function App() {
  // 領収書一覧の状態
  const [receipts, setReceipts] = useState([]);

  // 検証で警告が出た領収書を一時保留する状態
  const [pending, setPending] = useState(null);

  // サイドバー: アコーディオン展開中の月("YYYY-MM" もしくは null)
  const [expandedMonth, setExpandedMonth] = useState(null);

  // メイン画面の絞り込み: { month: "YYYY-MM", category: "..." } もしくは null
  const [filter, setFilter] = useState(null);

  // モバイルでのサイドバー開閉
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    // 明細ごとにカテゴリを決定(Claude が返したカテゴリを優先、
    // 無効/未指定ならフロントエンドのキーワード判定にフォールバック)
    const itemsWithCategory = (parsed.items || []).map((it) => ({
      name: String(it.name || ""),
      price: Number(it.price || 0),
      category: resolveCategory(it.category, it.name),
    }));

    // バックエンドが返した total を数値として正規化(unknown 等は null)
    const totalNum = Number(parsed.total);
    const normalizedTotal = Number.isFinite(totalNum) ? totalNum : null;

    const newReceipt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      store: parsed.store || "",
      total: normalizedTotal,
      items: itemsWithCategory,
    };

    const warnings = validateReceipt(newReceipt, receipts);
    if (warnings.length > 0) {
      setPending({ receipt: newReceipt, warnings });
    } else {
      setReceipts((prev) => [newReceipt, ...prev]);
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    setReceipts((prev) => [pending.receipt, ...prev]);
    setPending(null);
  };
  const cancelPending = () => setPending(null);

  const handleDelete = (id) => {
    if (!window.confirm("この領収書を削除しますか?")) return;
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  // 明細のカテゴリを手動で変更する(localStorage は useEffect で自動保存)
  const handleChangeCategory = (receiptId, itemIndex, newCategory) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const newItems = (r.items || []).map((it, idx) =>
          idx === itemIndex ? { ...it, category: newCategory } : it
        );
        return { ...r, items: newItems };
      })
    );
  };

  // 全データを削除する(取り消し不可なので二重で確認)
  const handleResetAll = () => {
    if (receipts.length === 0) {
      window.alert("削除する領収書はありません。");
      return;
    }
    const msg = `登録されている領収書(${receipts.length} 件)をすべて削除します。\nこの操作は取り消せません。本当にリセットしますか?`;
    if (!window.confirm(msg)) return;
    setReceipts([]);
    setPending(null);
    setFilter(null);
    setExpandedMonth(null);
  };

  // サイドバー: 月の展開/折り畳み(同じ月をクリックで閉じる)
  const handleToggleMonth = (month) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  // サイドバー: カテゴリ選択(同じ組み合わせをもう一度押すと絞り込み解除)
  const handleSelectFilter = (month, category) => {
    setFilter((prev) =>
      prev && prev.month === month && prev.category === category
        ? null
        : { month, category }
    );
    // モバイルではカテゴリ選択後にサイドバーを閉じて結果を見やすくする
    setSidebarOpen(false);
  };

  // 絞り込み解除
  const clearFilter = () => setFilter(null);

  // メイン画面の明細リスト用に絞り込み後の領収書を作る
  // 月で日付を絞り、明細(items)はカテゴリでさらに絞り込む
  const filteredReceipts = useMemo(() => {
    if (!filter) return receipts;
    return receipts
      .filter((r) => {
        const d = r.date || "";
        if (filter.month === "不明") return d.length < 7;
        return d.startsWith(filter.month);
      })
      .map((r) => ({
        ...r,
        items: (r.items || []).filter(
          (it) => (it.category || "その他") === filter.category
        ),
      }))
      .filter((r) => r.items.length > 0);
  }, [receipts, filter]);

  // 全データの合計金額(常に全期間ベース)
  const grandTotal = receipts.reduce((acc, r) => acc + getReceiptTotal(r), 0);

  return (
    <div className="app-layout">
      <Sidebar
        receipts={receipts}
        filter={filter}
        onSelectFilter={handleSelectFilter}
        expandedMonth={expandedMonth}
        onToggleMonth={handleToggleMonth}
        isOpenMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        {/* モバイル用トップバー(ハンバーガーとアプリ名) */}
        <div className="mobile-topbar">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="サイドバーを開く"
          >
            ☰
          </button>
          <span className="mobile-title">領収書スキャナー</span>
        </div>

        <div className="container">
          <header className="app-header">
            <h1>領収書スキャナー</h1>
            <p className="subtitle">
              領収書を撮って送るだけで、自動で経費を記録します。
            </p>
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
                <p className="warning-note">この内容で追加しますか?</p>
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
              <div>
                登録件数: <strong>{receipts.length}</strong> 件
              </div>
              <div>
                合計金額: <strong>{grandTotal.toLocaleString()} 円</strong>
              </div>
            </div>
            <div className="charts-row">
              <CategoryPieChart receipts={receipts} />
              <MonthlyBarChart receipts={receipts} />
            </div>
            <CategoryTable receipts={receipts} />
          </section>

          <section className="card">
            <ReceiptList
              receipts={filteredReceipts}
              onDelete={handleDelete}
              onChangeCategory={handleChangeCategory}
              filter={filter}
              onClearFilter={clearFilter}
            />
          </section>

          <footer className="app-footer">
            <small>データはこのブラウザの中だけに保存されます。</small>
            <button
              type="button"
              className="reset-button"
              onClick={handleResetAll}
            >
              全データをリセット
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
