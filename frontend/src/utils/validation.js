// レシートの検証ロジック
// - 金額が負の値の商品があれば警告
// - 同じ日付かつ同じ合計金額のレシートが既にある場合は重複警告

// 1件のレシートの合計金額を計算する
export function calcTotal(receipt) {
  return (receipt?.items || []).reduce(
    (acc, it) => acc + Number(it.price || 0),
    0
  );
}

// 検証を行い、警告メッセージの配列を返す(問題なしなら空配列)
export function validateReceipt(newReceipt, existingReceipts) {
  const warnings = [];

  // 1. 金額が負の値の商品を検出
  const negativeItems = (newReceipt.items || []).filter(
    (it) => Number(it.price) < 0
  );
  if (negativeItems.length > 0) {
    const names = negativeItems
      .map((it) => `「${it.name || "(名前なし)"}」(${Number(it.price).toLocaleString()} 円)`)
      .join("、");
    warnings.push(`金額がマイナスの商品があります: ${names}`);
  }

  // 2. 同じ日付かつ同じ合計金額のレシートが既に登録されていないか確認
  const newTotal = calcTotal(newReceipt);
  const duplicate = (existingReceipts || []).find(
    (r) => r.date === newReceipt.date && calcTotal(r) === newTotal
  );
  if (duplicate) {
    warnings.push(
      `同じ日付(${newReceipt.date})・同じ合計金額(${newTotal.toLocaleString()} 円)のレシートが既に登録されています。重複の可能性があります。`
    );
  }

  return warnings;
}
