// カテゴリ別の合計金額と件数を表で表示するコンポーネント
// 件数 0 のカテゴリは非表示、合計金額の多い順に並べる
import {
  CATEGORIES,
  sumByCategory,
  countByCategory,
} from "../utils/category.js";

export default function CategoryTable({ receipts }) {
  const totals = sumByCategory(receipts);
  const counts = countByCategory(receipts);

  // 件数が 1 件以上のカテゴリだけを残し、合計金額の多い順に並べる
  const rows = CATEGORIES.map((c) => ({
    key: c.key,
    color: c.color,
    count: counts[c.key] || 0,
    total: totals[c.key] || 0,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) {
    return null;
  }

  // 表の最下部に出す合計(全カテゴリの件数・金額の総和)
  const totalCount = rows.reduce((acc, r) => acc + r.count, 0);
  const totalAmount = rows.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="category-table-block">
      <h3>カテゴリ別の合計</h3>
      <table className="category-table">
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th className="num">件数</th>
            <th className="num">合計金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <span
                  className="cat-dot"
                  style={{ background: r.color }}
                  aria-hidden="true"
                />
                {r.key}
              </td>
              <td className="num">{r.count.toLocaleString()} 件</td>
              <td className="num">{r.total.toLocaleString()} 円</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>合計</td>
            <td className="num">{totalCount.toLocaleString()} 件</td>
            <td className="num">{totalAmount.toLocaleString()} 円</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
