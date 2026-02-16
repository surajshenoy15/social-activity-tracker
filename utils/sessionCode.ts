export const generateSessionCode = (activityType: string = "ACT"): string => {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${activityType}-${randomPart}-${datePart}`;
};
