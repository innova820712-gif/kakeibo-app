// バックエンドサーバー
// フロントエンドから送られた領収書画像を Claude API に渡し、
// 店舗名・日付・合計金額・明細(カテゴリ付き)を JSON で受け取って返す役割を持つ。

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

// プロジェクト直下の .env を読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// 画像を base64 で受け取るので、リクエストサイズの上限を大きめに設定
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Claude API クライアントを作成
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 動作確認用のエンドポイント
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// レシート画像を解析するエンドポイント
// リクエスト body: { imageBase64: "...", mediaType: "image/jpeg" など }
app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "画像データが送られていません" });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(500)
        .json({ error: "サーバー側に ANTHROPIC_API_KEY が設定されていません" });
    }

    // Claude に渡すプロンプト
    // 数字や日付の誤読を減らすため、厳格なルールを明示する
    // 法人経費精算用なので、明細ごとに会計カテゴリも判定させる
    const prompt = `あなたは日本の領収書(レシートを含む)を正確に読み取り、法人経費精算用に仕分けする OCR アシスタントです。
添付の画像をすみずみまで丁寧に確認し、以下の情報を抽出して JSON のみを出力してください(説明文や前置きは一切不要)。

出力フォーマット:
{
  "date": "YYYY-MM-DD",
  "store": "店舗名",
  "total": 領収書記載の合計金額(数値・円),
  "items": [
    { "name": "商品名(明細名)", "price": 金額(数値・税込・円), "category": "会計カテゴリ" }
  ]
}

【絶対に守るルール】
1. 日付は必ず「YYYY-MM-DD」形式の 4 桁の西暦で読み取ること(例: 2026-03-19)。年・月・日のいずれかが欠けてはいけない。
2. 領収書に印字されている年をそのまま使うこと。「2020」「2024」など、ありがちな年に勝手に置き換えてはいけない。和暦(令和○年など)で書かれている場合のみ西暦に変換すること。
3. total は「合計」「現金計」「お買上計」というラベルが付いた行の数字を、そのまま出力すること。
   - 「内税品計」「税抜計」「小計」などのラベルは商品の小計を指すので、total には絶対に使わないこと。
   - 商品の小計と total が一致しなくてもよい(深夜料・サービス料・消費税などが追加されている場合がある)ため、items の合計に合わせて total を改変しないこと。
   - 「合計」「現金計」「お買上計」のラベル行が見つからない場合に限り、商品+追加料金(消費税・サービス料など)の合計を計算して total とすること。
4. 数字は 1 桁も間違えないように、画像を細部まで(にじみ・かすれ・小さい文字も含めて)拡大するつもりで確認すること。1 と 7、3 と 8、0 と 6 などの取り違えに特に注意する。
5. 読み取れない情報は無理に推測しないこと。日付・店舗名・total が読み取れない場合は文字列 "unknown" を返す。明細行で価格が読み取れないものは、その明細行ごと items から除外する。

【カテゴリ分類のルール】
6. 各 items の明細に "category" フィールドを必ず付け、以下の 8 カテゴリから 1 つだけ選ぶこと(英訳や別名は不可・このまま日本語で出力)。
   - 交通費: タクシー、電車(JR・地下鉄・私鉄)、バス、駐車場、ガソリン、ETC・高速料金など移動にかかる費用
   - 接待交際費: 飲食店・居酒屋・レストラン・カフェなど、社外の人との飲食・接待にかかる費用(例: すき家・スターバックスなどの飲食店レシートはこれ)
   - 会議費: 社内会議用の弁当・お茶・お菓子・ペットボトル飲料・会議室レンタル
   - 消耗品費: コピー用紙・文房具・トナー・インク・封筒・付箋など事務用消耗品
   - 通信費: 携帯電話料金・インターネット回線・サーバー・クラウド利用料・ドメイン費
   - 旅費: 出張時のホテル宿泊・新幹線・航空券・旅館などの宿泊・遠距離移動費
   - 雑費: 業務に関連する小額の費用で、上記いずれにも当てはまらないもの
   - その他: どのカテゴリにも該当しないもの、または判断材料が乏しく確信を持てないもの
7. 店舗名や明細全体の文脈を考慮して判定すること(例: 「すき家」の領収書なら、明細名が「牛丼」でも「ドリンク」でも全て「接待交際費」)。

【その他の注意事項】
- 値引き・小計・消費税・合計・現金計などの集計行は items に含めず、購入した商品の行のみを items に入れること。
- price と total は半角数値のみ(カンマや円マーク、税表示記号は含めない)。読めず "unknown" となる場合のみ文字列でよい。
- 商品名は分かりやすい日本語に整えてよいが、数字部分は画像のままにすること。`;

    // Claude API を呼び出す(ビジョン機能で画像を渡す)
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    // Claude の応答から JSON 部分を取り出す
    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock) {
      return res.status(500).json({ error: "Claude から文字応答を取得できませんでした" });
    }

    // 念のため ```json ... ``` のような囲みが混じった場合も除去
    let rawText = textBlock.text.trim();
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON パース失敗:", rawText);
      return res
        .status(500)
        .json({ error: "Claude の応答を JSON に変換できませんでした", raw: rawText });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("解析エラー:", err);
    return res
      .status(500)
      .json({ error: "レシートの解析に失敗しました", detail: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`バックエンド起動中: http://localhost:${PORT}`);
});
