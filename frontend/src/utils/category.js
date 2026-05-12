// 商品名から「食費」「日用品」「外食」などのカテゴリを自動判定するユーティリティ
// シンプルなキーワード一致で分類する
import { getReceiptTotal } from "./validation.js";

// カテゴリ一覧(円グラフの色もここで管理)
export const CATEGORIES = [
  { key: "食費", color: "#ef6c6c" },
  { key: "外食", color: "#f3a35c" },
  { key: "日用品", color: "#6ec6c6" },
  { key: "飲料", color: "#8aa9e8" },
  { key: "衣料品", color: "#b89edb" },
  { key: "交通費", color: "#6dbf85" },
  { key: "その他", color: "#bdbdbd" },
];

// キーワード辞書(商品名にこの単語が含まれていればそのカテゴリ)
const CATEGORY_KEYWORDS = {
  食費: [
    "米", "パン", "肉", "豚", "牛", "鶏", "魚", "卵", "野菜", "キャベツ",
    "玉ねぎ", "にんじん", "じゃがいも", "トマト", "きゅうり", "果物", "りんご",
    "バナナ", "みかん", "牛乳", "ヨーグルト", "チーズ", "豆腐", "納豆",
    "弁当", "おにぎり", "惣菜", "総菜", "サラダ", "醤油", "味噌", "塩",
    "砂糖", "油", "麺", "うどん", "そば", "パスタ", "ラーメン",
  ],
  外食: [
    "レストラン", "カフェ", "喫茶", "マクドナルド", "モスバーガー", "すき家",
    "吉野家", "松屋", "スターバックス", "ドトール", "コメダ", "サイゼリヤ",
    "ガスト", "デニーズ", "定食", "ランチセット",
  ],
  日用品: [
    "ティッシュ", "トイレットペーパー", "洗剤", "シャンプー", "リンス",
    "ボディソープ", "石鹸", "歯ブラシ", "歯磨き", "タオル", "ゴミ袋",
    "ラップ", "アルミホイル", "電池", "乾電池", "マスク", "綿棒",
  ],
  飲料: [
    "水", "ミネラルウォーター", "お茶", "緑茶", "麦茶", "紅茶", "コーヒー",
    "ジュース", "コーラ", "ビール", "発泡酒", "ワイン", "日本酒", "焼酎",
    "牛乳", "豆乳",
  ],
  衣料品: [
    "シャツ", "Tシャツ", "ズボン", "パンツ", "スカート", "下着", "靴下",
    "セーター", "ジャケット", "コート", "靴", "スニーカー", "帽子",
  ],
  交通費: [
    "切符", "乗車券", "定期", "ICカード", "Suica", "PASMO", "タクシー",
    "ガソリン", "駐車場",
  ],
};

// 商品名 1 件から最適なカテゴリを判定する
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

// レシート配列からカテゴリ別の合計金額を集計する
// 戻り値: { 食費: 1200, 日用品: 500, ... }
export function sumByCategory(receipts) {
  const totals = {};
  for (const c of CATEGORIES) totals[c.key] = 0;

  for (const r of receipts) {
    for (const item of r.items || []) {
      const cat = item.category || "その他";
      totals[cat] = (totals[cat] || 0) + Number(item.price || 0);
    }
  }
  return totals;
}

// レシート配列から「年月別」の合計金額を集計する
// 戻り値: { "2026-05": 12000, "2026-04": 8000, ... } を月昇順で
// 各レシートの合計は receipt.total を優先(無ければ items の合計)
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
