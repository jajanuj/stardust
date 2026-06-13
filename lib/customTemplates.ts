// 常用任務（自訂模板）型別。
// 資料儲存於後端 task_templates 表，透過 /api/commander/templates 存取。

export interface CustomTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  coinsReward: number;
  taskType: "once" | "daily" | "weekly";
  recurDays?: number[];
}

export interface CustomTemplateInput {
  icon: string;
  title: string;
  description: string;
  coinsReward: number;
  taskType: "once" | "daily" | "weekly";
  recurDays?: number[];
}
