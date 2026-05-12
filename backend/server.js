// バックエンドサーバー
// フロントエンドから送られたレシート画像を Claude API に渡し、
// 商品名・金額・日付を JSON で受け取って返す役割を持つ。

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
    const prompt = `あなたは日本のレシートを正確に読み取る OCR アシスタントです。
添付の画像をすみずみまで丁寧に確認し、以下の情報を抽出して JSON のみを出力してください(説明文や前置きは一切不要)。

出力フォーマット:
{
  "date": "YYYY-MM-DD",
  "store": "店舗名",
  "total": レシート記載の合計金額(数値・円),
  "items": [
    { "name": "商品名", "price": 金額(数値・税込・円) }
  ]
}

【絶対に守るルール】
1. 日付は必ず「YYYY-MM-DD」形式の 4 桁の西暦で読み取ること(例: 2026-03-19)。年・月・日のいずれかが欠けてはいけない。
2. レシートに印字されている年をそのまま使うこと。「2020」「2024」など、ありがちな年に勝手に置き換えてはいけない。和暦(令和○年など)で書かれている場合のみ西暦に変換すること。
3. total は「合計」「現金計」「お買上計」というラベルが付いた行の数字を、そのまま出力すること。
   - 「内税品計」「税抜計」「小計」などのラベルは商品の小計を指すので、total には絶対に使わないこと。
   - 商品の小計と total が一致しなくてもよい(深夜料・サービス料・消費税などが追加されている場合がある)ため、items の合計に合わせて total を改変しないこと。
   - 「合計」「現金計」「お買上計」のラベル行がレシート上に見つからない場合に限り、商品+追加料金(消費税・サービス料など)の合計を計算して total とすること。
4. 数字は 1 桁も間違えないように、画像を細部まで(にじみ・かすれ・小さい文字も含めて)拡大するつもりで確認すること。1 と 7、3 と 8、0 と 6 などの取り違えに特に注意する。
5. 読み取れない情報は無理に推測しないこと。日付・店舗名・total が読み取れない場合は文字列 "unknown" を返す。商品行で価格が読み取れないものは、その商品行ごと items から除外する。

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
