// カテゴリ別の支出を円グラフで表示するコンポーネント
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { CATEGORIES, sumByCategory } from "../utils/category.js";

// Chart.js で使う部品を登録する
ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryPieChart({ receipts }) {
  const totals = sumByCategory(receipts);

  // 金額が 0 円のカテゴリは円グラフに表示しない
  const visibleCategories = CATEGORIES.filter((c) => (totals[c.key] || 0) > 0);

  if (visibleCategories.length === 0) {
    return (
      <div className="chart-block">
        <h3>カテゴリ別の支出</h3>
        <p className="empty-small">データがありません</p>
      </div>
    );
  }

  const data = {
    labels: visibleCategories.map((c) => c.key),
    datasets: [
      {
        data: visibleCategories.map((c) => totals[c.key]),
        backgroundColor: visibleCategories.map((c) => c.color),
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          // ツールチップに「カテゴリ名: 金額円」を表示
          label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()} 円`,
        },
      },
    },
  };

  return (
    <div className="chart-block">
      <h3>カテゴリ別の支出</h3>
      <Pie data={data} options={options} />
    </div>
  );
}
