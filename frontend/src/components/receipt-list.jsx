// 登録済み領収書の一覧表示コンポーネント
// - 日付の新しい順に並べて表示
// - 明細のカテゴリはプルダウンで手動変更可能
// - 絞り込み(月+カテゴリ)が有効な時は、フィルタバナーと
//   選択カテゴリの小計を表示する
import {
  calcItemsTotal,
  getReceiptTotal,
  hasTotalDiff,
} from "../utils/validation.js";
import { CATEGORIES } from "../utils/category.js";

// "2026-05" → "2026年5月"(フィルタバナーで使う)
function formatMonthLabel(ym) {
  if (!ym || ym === "不明") return "日付不明";
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${y}年${Number(m)}月`;
}

export default function ReceiptList({
  receipts,
  onDelete,
  onChangeCategory,
  filter,
  onClearFilter,
}) {
  const filterActive = !!filter;

  return (
    <div className="receipt-list">
      <h2>登録した領収書</h2>

      {filterActive && (
        <div className="filter-banner">
          <span>
            絞り込み中: <strong>{formatMonthLabel(filter.month)}</strong>
            {" / "}
            <strong>{filter.category}</strong>
          </span>
          <button
            type="button"
            className="clear-filter-button"
            onClick={onClearFilter}
          >
            絞り込みを解除
          </button>
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="empty">
          <p>
            {filterActive
              ? "選択した月・カテゴリに該当する領収書はありません。"
              : "まだ領収書が登録されていません。"}
          </p>
        </div>
      ) : (
        // 日付の新しい順に並べ替え(元配列は変更しない)
        [...receipts]
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .map((r) => {
            const total = getReceiptTotal(r);
            const itemsTotal = calcItemsTotal(r);
            const showBreakdown = hasTotalDiff(r);
            const diff = total - itemsTotal;
            // 絞り込み中の小計(表示中の items の合計)
            const filteredSubtotal = (r.items || []).reduce(
              (acc, it) => acc + Number(it.price || 0),
              0
            );

            return (
              <div key={r.id} className="receipt-card">
                <div className="receipt-header">
                  <div>
                    <strong>{r.date || "日付不明"}</strong>{" "}
                    <span className="store">{r.store || ""}</span>
                  </div>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => onDelete(r.id)}
                  >
                    削除
                  </button>
                </div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>商品名</th>
                      <th>カテゴリ</th>
                      <th className="price">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.items || []).map((item, idx) => {
                      const currentCategory = item.category || "その他";
                      const isUnknownCategory = !CATEGORIES.some(
                        (c) => c.key === currentCategory
                      );
                      return (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td>
                            <select
                              className="category-select"
                              value={currentCategory}
                              onChange={(e) =>
                                onChangeCategory(r.id, idx, e.target.value)
                              }
                              aria-label="カテゴリを変更"
                            >
                              {isUnknownCategory && (
                                <option value={currentCategory}>
                                  {currentCategory}(旧)
                                </option>
                              )}
                              {CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.key}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="price">
                            {Number(item.price || 0).toLocaleString()} 円
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {filterActive ? (
                      // 絞り込み中: 選択カテゴリの小計と、領収書全体の合計を併記
                      <>
                        <tr className="subtotal-row">
                          <td colSpan={2}>選択カテゴリ計</td>
                          <td className="price">
                            {filteredSubtotal.toLocaleString()} 円
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2}>領収書合計</td>
                          <td className="price">
                            {total.toLocaleString()} 円
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {showBreakdown && (
                          <>
                            <tr className="subtotal-row">
                              <td colSpan={2}>商品計</td>
                              <td className="price">
                                {itemsTotal.toLocaleString()} 円
                              </td>
                            </tr>
                            <tr className="diff-row">
                              <td colSpan={2}>
                                差額(深夜料・サービス料・税など)
                              </td>
                              <td className="price">
                                {diff >= 0 ? "+" : ""}
                                {diff.toLocaleString()} 円
                              </td>
                            </tr>
                          </>
                        )}
                        <tr>
                          <td colSpan={2}>合計</td>
                          <td className="price">
                            {total.toLocaleString()} 円
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            );
          })
      )}
    </div>
  );
}
