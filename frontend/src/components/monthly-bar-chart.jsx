// 月別の支出を棒グラフで表示するコンポーネント
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { sumByMonth } from "../utils/category.js";

// Chart.js で使う部品を登録する
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function MonthlyBarChart({ receipts }) {
  const monthly = sumByMonth(receipts);
  const labels = Object.keys(monthly);
  const values = Object.values(monthly);

  if (labels.length === 0) {
    return (
      <div className="chart-block">
        <h3>月別の支出</h3>
        <p className="empty-small">データがありません</p>
      </div>
    );
  }

  const data = {
    labels,
    datasets: [
      {
        label: "支出 (円)",
        data: values,
        backgroundColor: "#6ec6c6",
        borderColor: "#3a9d9d",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${Number(ctx.raw).toLocaleString()} 円`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Y 軸の目盛りも「カンマ区切り + 円」で表示
          callback: (v) => `${Number(v).toLocaleString()} 円`,
        },
      },
    },
  };

  return (
    <div className="chart-block">
      <h3>月別の支出</h3>
      <Bar data={data} options={options} />
    </div>
  );
}
