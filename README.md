# レシート家計簿

レシートの画像をアップロードすると、Claude API(claude-haiku-4-5)が中身を読み取って自動で家計簿に記録する Web アプリです。

## できること

- レシート画像から **日付・店名・商品名・金額** を自動抽出
- 商品名から **カテゴリ(食費・外食・日用品など)を自動分類**
- **カテゴリ別の円グラフ** と **月別の棒グラフ** を表示(Chart.js)
- データは **ブラウザの localStorage に保存** されるのでリロードしても消えません

## フォルダ構成

```
kakeibo-app/
├── .env             # Claude API キー(.gitignore で除外)
├── backend/         # Node.js + Express(Claude API を呼ぶサーバー)
└── frontend/        # React + Vite(画面)
```

## 必要なもの

- Node.js 18 以上(20 推奨)
- Claude API キー(`sk-ant-...`)

## 初回セットアップ

### 1. API キーを設定する

プロジェクト直下の `.env` を開き、`ANTHROPIC_API_KEY` に自分の API キーを書き込んでください。

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
PORT=3001
```

> `.env` は `.gitignore` に入っているので GitHub にアップロードされません。

### 2. バックエンドの準備

ターミナルで以下を実行します。

```bash
cd backend
npm install
```

### 3. フロントエンドの準備

別のターミナル(またはタブ)で以下を実行します。

```bash
cd frontend
npm install
```

## 起動の仕方

ターミナルを2つ開いて、それぞれで以下を実行します。

### ターミナル 1(バックエンド)

```bash
cd backend
npm run dev
```

`バックエンド起動中: http://localhost:3001` と表示されれば OK。

### ターミナル 2(フロントエンド)

```bash
cd frontend
npm run dev
```

ブラウザで <http://localhost:5173> を開くとアプリが表示されます。

## 使い方

1. 「ファイルを選択」からレシート画像を選ぶ
2. 「解析する」ボタンを押す → Claude がレシートを読み取って一覧に追加されます
3. 円グラフ・棒グラフで支出を確認

## カテゴリの自動分類について

`frontend/src/utils/category.js` のキーワード辞書をもとに、商品名から
カテゴリ(食費・外食・日用品・飲料・衣料品・交通費・その他)を自動で判定しています。
キーワードを追加したい場合はこのファイルを編集してください。
