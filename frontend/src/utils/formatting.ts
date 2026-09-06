export function formatSeconds(value: number): string {
  if (value < 60) return `${Math.round(value)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
