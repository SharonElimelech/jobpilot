// job url ↔ route id (base64url), safe in browser and server
export function toId(url: string): string {
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(url, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(url)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromId(id: string): string {
  const b64 = id.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8"); // server-only
}
