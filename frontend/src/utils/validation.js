// 領収書の合計取得ヘルパーと検証ロジック
// 「合計」はバックエンドが返した receipt.total を優先し、
// 数値として読めない(undefined や "unknown" など)場合のみ
// 明細(items)の price 合計をフォールバックとして使う。

// 明細(items)の price だけを合算した金額を返す
export function calcItemsTotal(receipt) {
  return (receipt?.items || []).reduce(
    (acc, it) => acc + Number(it.price || 0),
    0
  );
}

// 領収書として扱うべき「合計金額」を返す
// receipt.total が数値で取れればそれを使い、無ければ items の合計にフォールバック
export function getReceiptTotal(receipt) {
  const t = receipt?.total;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  // 数値文字列で来た場合に備えて変換も試みる
  if (typeof t === "string") {
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return calcItemsTotal(receipt);
}

// receipt.total と items 合計が食い違っているか(食い違っていれば true)
// 「深夜料」「サービス料」「消費税」などで差が生じる場合に表示分岐に使う
export function hasTotalDiff(receipt) {
  const t = receipt?.total;
  if (typeof t !== "number" || !Number.isFinite(t)) return false;
  return t !== calcItemsTotal(receipt);
}

// 検証を行い、警告メッセージの配列を返す(問題なしなら空配列)
export function validateReceipt(newReceipt, existingReceipts) {
  const warnings = [];

  // 1. 金額が負の値の明細を検出
  const negativeItems = (newReceipt.items || []).filter(
    (it) => Number(it.price) < 0
  );
  if (negativeItems.length > 0) {
    const names = negativeItems
      .map((it) => `「${it.name || "(名前なし)"}」(${Number(it.price).toLocaleString()} 円)`)
      .join("、");
    warnings.push(`金額がマイナスの明細があります: ${names}`);
  }

  // 2. 同じ日付かつ同じ合計金額の領収書が既に登録されていないか確認
  //    合計は receipt.total を優先(無ければ items 合計)
  const newTotal = getReceiptTotal(newReceipt);
  const duplicate = (existingReceipts || []).find(
    (r) => r.date === newReceipt.date && getReceiptTotal(r) === newTotal
  );
  if (duplicate) {
    warnings.push(
      `同じ日付(${newReceipt.date})・同じ合計金額(${newTotal.toLocaleString()} 円)の領収書が既に登録されています。重複の可能性があります。`
    );
  }

  return warnings;
}
