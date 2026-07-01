"use client";

import { useState, useTransition } from "react";
import { generateApplyKit } from "@/app/actions";

export default function KitPanel({ url, kitHtml, kitMd }: { url: string; kitHtml: string | null; kitMd: string | null }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!kitHtml) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 34 }}>
        <p style={{ color: "var(--dim)", marginBottom: 16 }}>
          עוד אין ערכת הגשה למשרה הזאת. Claude יכין: קו"ח מותאם ATS, מכתב מקדים, תשובות מוכנות והכנה לראיון.
        </p>
        <button
          className="chip on"
          style={{ fontSize: 15, padding: "9px 26px" }}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try { await generateApplyKit(url); } catch (e) { setErr(String(e)); }
            })
          }
        >
          {pending ? "⏳ מכין ערכה... (עד דקה)" : "✨ צור ערכת הגשה"}
        </button>
        {err && <p style={{ color: "var(--bad)", marginTop: 12, fontSize: 13 }}>{err}</p>}
      </div>
    );
  }

  return (
    <div className="panel kit">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>📦 ערכת הגשה</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="chip"
            onClick={async () => {
              await navigator.clipboard.writeText(kitMd ?? "");
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "✓ הועתק" : "העתק הכל"}
          </button>
          <button
            className="chip"
            disabled={pending}
            onClick={() => startTransition(async () => { await generateApplyKit(url); })}
          >
            {pending ? "⏳..." : "צור מחדש"}
          </button>
        </div>
      </div>
      <div className="kit-body" dangerouslySetInnerHTML={{ __html: kitHtml }} />
    </div>
  );
}
