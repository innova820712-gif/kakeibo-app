// 左サイドバー: カテゴリ別経費ナビゲーション
// - カテゴリをクリックでアコーディオン展開し、そのカテゴリの月別内訳を表示
// - 月をクリックでメイン画面の明細リストを「そのカテゴリ+その月」で絞り込み
// - サイドバー下部に総合計(全期間)を表示
// - モバイル(<=768px)ではハンバーガーメニューで開閉
import { useMemo } from "react";
import {
  CATEGORIES,
  sumByCategory,
  countByCategory,
  sumByCategoryAndMonth,
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
  expandedCategory,
  onToggleCategory,
  isOpenMobile,
  onCloseMobile,
}) {
  // カテゴリの合計金額・件数(件数 0 を除き、金額の多い順)
  const visibleCategories = useMemo(() => {
    const totals = sumByCategory(receipts);
    const counts = countByCategory(receipts);
    return CATEGORIES.map((c) => ({
      key: c.key,
      color: c.color,
      count: counts[c.key] || 0,
      total: totals[c.key] || 0,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.total - a.total);
  }, [receipts]);

  // カテゴリ × 年月の集計マップ
  const monthlyByCategory = useMemo(
    () => sumByCategoryAndMonth(receipts),
    [receipts]
  );

  // 総合計(全期間)
  const grandTotalAll = useMemo(
    () => receipts.reduce((acc, r) => acc + getReceiptTotal(r), 0),
    [receipts]
  );

  // フィルタが立っているカテゴリは強制的に展開して見せる
  const visiblyExpandedCategory = filter ? filter.category : expandedCategory;

  return (
    <>
      <aside className={`sidebar ${isOpenMobile ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>📂 カテゴリ別経費</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={onCloseMobile}
            aria-label="サイドバーを閉じる"
          >
            ×
          </button>
        </div>

        {visibleCategories.length === 0 ? (
          <p className="sidebar-empty">領収書がまだありません</p>
        ) : (
          <nav className="sidebar-nav">
            {visibleCategories.map((c) => {
              // このカテゴリの月別合計(0 円は除外、日付ありを降順 + 不明を末尾)
              const monthMap = monthlyByCategory[c.key] || {};
              const monthEntries = Object.entries(monthMap)
                .filter(([, amt]) => amt > 0)
                .sort(([a], [b]) => {
                  if (a === "不明") return 1;
                  if (b === "不明") return -1;
                  return b.localeCompare(a);
                });

              const expanded = visiblyExpandedCategory === c.key;
              const activeMonth =
                filter && filter.category === c.key ? filter.month : null;

              return (
                <CategoryAccordion
                  key={c.key}
                  category={c}
                  monthEntries={monthEntries}
                  expanded={expanded}
                  onToggle={() => onToggleCategory(c.key)}
                  activeMonth={activeMonth}
                  onSelectMonth={(ym) => onSelectFilter(ym, c.key)}
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

// カテゴリの見出しと、展開時に表示する月別内訳のリスト
function CategoryAccordion({
  category,
  monthEntries,
  expanded,
  onToggle,
  activeMonth,
  onSelectMonth,
}) {
  return (
    <div className={`cat-item ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="cat-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="cat-label">
          <span className="caret" aria-hidden="true">
            {expanded ? "▼" : "▶"}
          </span>
          <span
            className="cat-dot"
            style={{ background: category.color }}
            aria-hidden="true"
          />
          {category.key}
        </span>
        <span className="cat-amount">{category.total.toLocaleString()} 円</span>
      </button>

      {expanded && (
        <ul className="month-list">
          {monthEntries.length === 0 ? (
            <li className="month-empty">データなし</li>
          ) : (
            monthEntries.map(([ym, amt]) => {
              const isActive = activeMonth === ym;
              return (
                <li key={ym}>
                  <button
                    type="button"
                    className={`month-btn ${isActive ? "active" : ""}`}
                    onClick={() => onSelectMonth(ym)}
                    aria-pressed={isActive}
                  >
                    <span className="month-name">{formatMonthLabel(ym)}</span>
                    <span className="month-amt">{amt.toLocaleString()} 円</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
