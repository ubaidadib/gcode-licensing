export function isPlanValid(plan) {
  return ["trial", "monthly", "annual", "lifetime"].includes(plan);
}

export function isStatusValid(status) {
  return ["active", "inactive", "revoked", "expired"].includes(status);
}

export function futureDateFromPlan(plan, trialDays) {
  const now = new Date();
  if (plan === "trial") {
    now.setDate(now.getDate() + (Number(trialDays) || 7));
    return now;
  }
  if (plan === "monthly") {
    now.setMonth(now.getMonth() + 1);
    return now;
  }
  if (plan === "annual") {
    now.setFullYear(now.getFullYear() + 1);
    return now;
  }
  if (plan === "lifetime") return null;
  return null;
}
