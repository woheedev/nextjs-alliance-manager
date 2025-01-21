export const formatDate = (date: string | Date | null): string => {
  if (!date) return "Never";

  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d
    .getFullYear()
    .toString()
    .slice(-2)}`;
};
