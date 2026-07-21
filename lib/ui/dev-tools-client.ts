"use client";

/** Client-safe: only NEXT_PUBLIC_* is available in the browser. */
export function showDeveloperToolsClient(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEVELOPER_TOOLS === "true";
}
