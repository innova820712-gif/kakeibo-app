// レシート画像のアップロードフォーム
// 画像を選択 → base64 に変換 → バックエンドに送信 → 解析結果を親に通知
import { useState } from "react";

export default function UploadForm({ onParsed }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ファイル選択時のハンドラー
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setErrorMsg("");
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  // File を base64 文字列に変換するユーティリティ
  const fileToBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // data:image/jpeg;base64,xxxx の "xxxx" 部分だけ取り出す
        const result = reader.result || "";
        const comma = String(result).indexOf(",");
        resolve(comma >= 0 ? String(result).slice(comma + 1) : String(result));
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  // アップロード(解析)実行
  const handleUpload = async () => {
    if (!file) {
      setErrorMsg("画像を選んでください");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/jpeg",
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `サーバーエラー (${res.status})`);
      }

      const data = await res.json();
      onParsed(data);

      // 成功したらフォームをリセット
      setFile(null);
      setPreviewUrl(null);
      // <input type="file"> の表示もクリアする
      const inputEl = document.getElementById("receipt-file-input");
      if (inputEl) inputEl.value = "";
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "解析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form">
      <h2>レシートをアップロード</h2>

      <input
        id="receipt-file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
      />

      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="レシートのプレビュー" />
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading}
        className="primary-button"
      >
        {loading ? "解析中..." : "解析する"}
      </button>

      {errorMsg && <p className="error">{errorMsg}</p>}
    </div>
  );
}
