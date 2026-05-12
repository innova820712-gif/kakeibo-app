// 法人経費精算のカテゴリ定義とキーワード判定ユーティリティ
// 各明細(item)を 8 カテゴリのいずれかに分類する。
// バックエンドの Claude が category を返した場合はそれを優先し、
// 無い場合のフォールバックとしてこのファイルのキーワード判定を使う。
import { getReceiptTotal } from "./validation.js";

// カテゴリ一覧(円グラフ・表で使う色もここで管理)
// 色は系統:青/オレンジ/緑/紫/水色/茶/グレー/薄いグレー
export const CATEGORIES = [
  { key: "交通費", color: "#3b82f6" },     // 青系
  { key: "接待交際費", color: "#f97316" }, // オレンジ系
  { key: "会議費", color: "#10b981" },     // 緑系
  { key: "消耗品費", color: "#a855f7" },   // 紫系
  { key: "通信費", color: "#06b6d4" },     // 水色系
  { key: "旅費", color: "#92400e" },       // 茶系
  { key: "雑費", color: "#6b7280" },       // グレー系
  { key: "その他", color: "#d1d5db" },     // 薄いグレー
];

// キーワード辞書(商品名にこの単語が含まれていればそのカテゴリ)
// 上から順に評価して最初に一致したものを採用するので、
// 具体的な語(旅費・交通費)を上、汎用的な語(接待交際費)を下に置く。
const CATEGORY_KEYWORDS = {
  旅費: [
    "ホテル", "宿泊", "旅館", "新幹線", "航空券", "飛行機",
    "JAL", "ANA", "出張", "民宿", "ゲストハウス",
  ],
  交通費: [
    "タクシー", "JR", "バス", "地下鉄", "電車", "切符", "乗車券",
    "ガソリン", "駐車場", "高速", "ETC", "Suica", "PASMO",
    "ICカード", "定期", "回数券",
  ],
  通信費: [
    "携帯", "スマートフォン", "通信料", "回線", "インターネット",
    "サーバー", "クラウド", "電話料金", "モバイル", "Wi-Fi",
    "ドメイン", "ホスティング",
  ],
  消耗品費: [
    "コピー用紙", "用紙", "文房具", "トナー", "インク",
    "ボールペン", "ペン", "クリアファイル", "ノート", "クリップ",
    "テープ", "ホチキス", "プリンタ", "封筒", "付箋",
  ],
  会議費: [
    "会議室", "ケータリング", "弁当", "お茶", "お菓子",
    "ペットボトル", "ミネラルウォーター", "おにぎり",
  ],
  接待交際費: [
    "すき家", "吉野家", "松屋", "マクドナルド", "モスバーガー",
    "スターバックス", "ドトール", "コメダ", "サイゼリヤ", "ガスト",
    "デニーズ", "居酒屋", "レストラン", "カフェ", "喫茶",
    "ビール", "焼肉", "寿司", "ラーメン", "飲食店", "食堂",
    "バー", "ワイン", "日本酒", "焼酎", "コース料理", "定食",
  ],
};

// Claude が返したカテゴリが有効な 8 カテゴリのいずれかであれば採用し、
// そうでなければ商品名からのキーワード判定にフォールバックする
export function resolveCategory(aiCategory, itemName) {
  if (typeof aiCategory === "string") {
    const matched = CATEGORIES.find((c) => c.key === aiCategory);
    if (matched) return matched.key;
  }
  return detectCategory(itemName);
}

// 商品名 1 件から最適なカテゴリを判定する
// 一致するキーワードがなければ「その他」を返す
export function detectCategory(itemName) {
  if (!itemName) return "その他";
  const name = String(itemName);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return category;
    }
  }
  return "その他";
}

// 領収書配列からカテゴリ別の合計金額を集計する
// 戻り値: { 交通費: 1200, 接待交際費: 5000, ... }
export function sumByCategory(receipts) {
  const totals = {};
  for (const c of CATEGORIES) totals[c.key] = 0;

  for (const r of receipts) {
    for (const item of r.items || []) {
      const cat = item.category || "その他";
      // 既知のカテゴリ以外が紛れていた場合は「その他」に寄せる
      const key = Object.prototype.hasOwnProperty.call(totals, cat) ? cat : "その他";
      totals[key] = totals[key] + Number(item.price || 0);
    }
  }
  return totals;
}

// 領収書配列からカテゴリ別の明細件数を集計する
// 戻り値: { 交通費: 3, 接待交際費: 5, ... }
export function countByCategory(receipts) {
  const counts = {};
  for (const c of CATEGORIES) counts[c.key] = 0;

  for (const r of receipts) {
    for (const item of r.items || []) {
      const cat = item.category || "その他";
      const key = Object.prototype.hasOwnProperty.call(counts, cat) ? cat : "その他";
      counts[key] = counts[key] + 1;
    }
  }
  return counts;
}

// 領収書配列から「年月別」の合計金額を集計する
// 戻り値: { "2026-05": 12000, "2026-04": 8000, ... } を月昇順で
// 各領収書の合計は receipt.total を優先(無ければ items の合計)
export function sumByMonth(receipts) {
  const totals = {};
  for (const r of receipts) {
    const date = r.date || "";
    const ym = date.length >= 7 ? date.slice(0, 7) : "不明";
    const sum = getReceiptTotal(r);
    totals[ym] = (totals[ym] || 0) + sum;
  }

  // 月の昇順に並べ替えて返す
  const sortedKeys = Object.keys(totals).sort();
  const result = {};
  for (const k of sortedKeys) result[k] = totals[k];
  return result;
}
