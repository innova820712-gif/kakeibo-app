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
    // JSON のみを返してもらうよう厳密に指示する
    const prompt = `あなたは日本のレシートを読み取るアシスタントです。
添付の画像から以下の情報を抽出し、JSON のみを出力してください(説明文や前置きは一切不要)。

出力フォーマット:
{
  "date": "YYYY-MM-DD",
  "store": "店舗名",
  "items": [
    { "name": "商品名", "price": 金額(数値・税込・円) }
  ]
}

注意事項:
- 日付が読み取れない場合は今日の日付を入れてください
- 値引きや合計行、小計、税の行は items に含めないでください
- price は半角数値のみ(カンマ・円マークなし)
- 商品名は分かりやすい日本語に整えてください`;

    // Claude API を呼び出す(ビジョン機能で画像を渡す)
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
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
