// 把 Postgres RPC 拋出的錯誤訊息對應為使用者可讀文字與 HTTP 狀態。
const MAP: Record<string, { status: number; message: string }> = {
  task_not_found: { status: 404, message: "找不到任務" },
  not_assigned: { status: 403, message: "這個任務不是指派給你的" },
  child_not_found: { status: 404, message: "找不到學員" },
  already_completed_today: { status: 409, message: "今天已經完成過囉" },
  already_claimed: { status: 409, message: "這個任務已經被搶走囉" },
  reward_not_found: { status: 404, message: "找不到獎勵" },
  insufficient_coins: { status: 400, message: "星塵不足" },
  out_of_stock: { status: 409, message: "獎勵已兌完" },
  completion_not_found: { status: 404, message: "找不到完成紀錄" },
  not_pending: { status: 409, message: "此項目已被處理" },
};

export function mapRpcError(message: string | undefined) {
  for (const key of Object.keys(MAP)) {
    if (message?.includes(key)) return MAP[key];
  }
  return { status: 500, message: "系統發生錯誤，請稍後再試" };
}
