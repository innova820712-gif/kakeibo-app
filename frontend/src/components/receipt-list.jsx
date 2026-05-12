// 登録済み領収書の一覧表示コンポーネント
// 日付の新しい順に並べて表示し、削除ボタンも提供する
// 明細のカテゴリはプルダウンで手動変更可能
import {
  calcItemsTotal,
  getReceiptTotal,
  hasTotalDiff,
} from "../utils/validation.js";
import { CATEGORIES } from "../utils/category.js";

export default function ReceiptList({ receipts, onDelete, onChangeCategory }) {
  if (receipts.length === 0) {
    return (
      <div className="empty">
        <p>まだ領収書が登録されていません。</p>
      </div>
    );
  }

  // 日付の新しい順に並べ替え(元配列は変更しない)
  const sorted = [...receipts].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  );

  return (
    <div className="receipt-list">
      <h2>登録した領収書</h2>
      {sorted.map((r) => {
        // レシートに記載されていた合計(優先)と、商品行のみの合計
        const total = getReceiptTotal(r);
        const itemsTotal = calcItemsTotal(r);
        const showBreakdown = hasTotalDiff(r);
        const diff = total - itemsTotal;

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
                  // 既知の8カテゴリに無い値(古いデータなど)はプルダウンに
                  // 同名のオプションを足して、選び直せるようにする
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
                {showBreakdown && (
                  <>
                    <tr className="subtotal-row">
                      <td colSpan={2}>商品計</td>
                      <td className="price">{itemsTotal.toLocaleString()} 円</td>
                    </tr>
                    <tr className="diff-row">
                      <td colSpan={2}>差額(深夜料・サービス料・税など)</td>
                      <td className="price">
                        {diff >= 0 ? "+" : ""}
                        {diff.toLocaleString()} 円
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={2}>合計</td>
                  <td className="price">{total.toLocaleString()} 円</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
