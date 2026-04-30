export type AdminAiSettings = {
  defaultDailyMessageLimit: number;
};

export type AdminUserAiQuota = {
  userId: string;
  defaultDailyMessageLimit: number;
  overrideDailyMessageLimit: number | null;
  effectiveDailyMessageLimit: number;
  role?: string;
  canOverride?: boolean;
};

