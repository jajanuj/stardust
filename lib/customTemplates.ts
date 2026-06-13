"use client";

// 常用任務（自訂模板）— 存於瀏覽器 localStorage，依家庭 ID 分開。
// 讓指揮官把修改過的模板內容存起來，後續一鍵帶入快速建立任務。

export interface CustomTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  coinsReward: number;
  taskType: "once" | "daily" | "weekly";
  recurDays?: number[];
}

const keyFor = (familyId: string) => `sd_custom_templates_${familyId}`;

export function getCustomTemplates(familyId: string): CustomTemplate[] {
  if (typeof window === "undefined" || !familyId) return [];
  try {
    const raw = localStorage.getItem(keyFor(familyId));
    return raw ? (JSON.parse(raw) as CustomTemplate[]) : [];
  } catch {
    return [];
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveCustomTemplate(
  familyId: string,
  tpl: Omit<CustomTemplate, "id">
): CustomTemplate {
  const item: CustomTemplate = { ...tpl, id: genId() };
  const next = [item, ...getCustomTemplates(familyId)];
  try {
    localStorage.setItem(keyFor(familyId), JSON.stringify(next));
  } catch {}
  return item;
}

export function deleteCustomTemplate(familyId: string, id: string): void {
  const next = getCustomTemplates(familyId).filter((t) => t.id !== id);
  try {
    localStorage.setItem(keyFor(familyId), JSON.stringify(next));
  } catch {}
}
