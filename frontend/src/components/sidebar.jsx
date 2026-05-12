// 左サイドバー: 月別ナビゲーション
// - 月をクリックでアコーディオン展開し、その月のカテゴリ別金額を表示
// - カテゴリをクリックでメイン画面の明細リストを「その月+そのカテゴリ」に絞り込み
// - サイドバー下部に総合計(全期間)を表示
// - モバイル(<=768px)ではハンバーガーメニューで開閉
import { useMemo } from "react";
import {
  CATEGORIES,
  sumByCategory,
  countByCategory,
} from "../utils/category.js";
import { getReceiptTotal } from "../utils/validation.js";

// "2026-05" → "2026年5月" 形式に変換
function formatMonthLabel(ym) {
  if (ym === "不明") return "日付不明";
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${y}年${Number(m)}月`;
}

export default function Sidebar({
  receipts,
  filter,
  onSelectFilter,
  expandedMonth,
  onToggleMonth,
  isOpenMobile,
  onCloseMobile,
}) {
  // 月のリストを「日付ありを降順 + 日付不明を末尾」で生成
  const months = useMemo(() => {
    const set = new Set();
    for (const r of receipts) {
      const d = r.date || "";
      set.add(d.length >= 7 ? d.slice(0, 7) : "不明");
    }
    const dated = [...set].filter((m) => m !== "不明").sort().reverse();
    const undated = set.has("不明") ? ["不明"] : [];
    return [...dated, ...undated];
  }, [receipts]);

  // 総合計(全期間)
  const grandTotalAll = useMemo(
    () => receipts.reduce((acc, r) => acc + getReceiptTotal(r), 0),
    [receipts]
  );

  // フィルタが立っている月は強制的に展開して見せる
  const visiblyExpandedMonth = filter ? filter.month : expandedMonth;

  return (
    <>
      <aside className={`sidebar ${isOpenMobile ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>📊 月別ナビゲーション</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={onCloseMobile}
            aria-label="サイドバーを閉じる"
          >
            ×
          </button>
        </div>

        {months.length === 0 ? (
          <p className="sidebar-empty">領収書がまだありません</p>
        ) : (
          <nav className="month-nav">
            {months.map((month) => {
              // 「不明」月は date 先頭一致がうまく効かないので、別途フィルタを用意
              const monthReceipts = receipts.filter((r) => {
                const d = r.date || "";
                if (month === "不明") return d.length < 7;
                return d.startsWith(month);
              });
              const expanded = visiblyExpandedMonth === month;
              const activeCategory =
                filter && filter.month === month ? filter.category : null;
              return (
                <MonthAccordion
                  key={month}
                  month={month}
                  monthLabel={formatMonthLabel(month)}
                  monthReceipts={monthReceipts}
                  expanded={expanded}
                  onToggle={() => onToggleMonth(month)}
                  activeCategory={activeCategory}
                  onSelectCategory={(cat) => onSelectFilter(month, cat)}
                />
              );
            })}
          </nav>
        )}

        <div className="sidebar-total">
          <span>総合計(全期間)</span>
          <strong>{grandTotalAll.toLocaleString()} 円</strong>
        </div>
      </aside>

      {/* モバイルでサイドバーを開いた時の背景オーバーレイ(タップで閉じる) */}
      {isOpenMobile && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// 月の見出しと、展開時に表示するカテゴリ別合計のリスト
function MonthAccordion({
  monthLabel,
  monthReceipts,
  expanded,
  onToggle,
  activeCategory,
  onSelectCategory,
}) {
  const monthTotal = monthReceipts.reduce(
    (acc, r) => acc + getReceiptTotal(r),
    0
  );

  const totals = sumByCategory(monthReceipts);
  const counts = countByCategory(monthReceipts);

  // 件数 0 のカテゴリは表示しない、合計金額の多い順
  const rows = CATEGORIES.map((c) => ({
    key: c.key,
    color: c.color,
    count: counts[c.key] || 0,
    total: totals[c.key] || 0,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className={`month-item ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="month-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="month-label">
          <span className="caret" aria-hidden="true">
            {expanded ? "▼" : "▶"}
          </span>
          {monthLabel}
        </span>
        <span className="month-amount">{monthTotal.toLocaleString()} 円</span>
      </button>

      {expanded && (
        <ul className="category-list">
          {rows.length === 0 && (
            <li className="category-empty">カテゴリデータなし</li>
          )}
          {rows.map((r) => {
            const isActive = activeCategory === r.key;
            return (
              <li key={r.key}>
                <button
                  type="button"
                  className={`category-btn ${isActive ? "active" : ""}`}
                  onClick={() => onSelectCategory(r.key)}
                  aria-pressed={isActive}
                >
                  <span className="cat-name">
                    <span
                      className="cat-dot"
                      style={{ background: r.color }}
                      aria-hidden="true"
                    />
                    {r.key}
                  </span>
                  <span className="cat-amount">
                    {r.total.toLocaleString()} 円
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
