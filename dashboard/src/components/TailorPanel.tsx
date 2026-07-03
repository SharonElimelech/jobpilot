"use client";

import { useState, useTransition } from "react";
import { generateTailoredCv } from "@/app/actions";

function download(name: string, content: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function printPdf(cvHtml: string): void {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(
    `<html dir="ltr"><head><title>CV</title><style>
      body { font-family: Georgia, serif; color: #111; max-width: 720px; margin: 32px auto; line-height: 1.5; font-size: 13px; }
      h1 { font-size: 22px; margin-bottom: 2px; } h2 { font-size: 15px; border-bottom: 1px solid #999; padding-bottom: 3px; margin: 18px 0 8px; }
      h3 { font-size: 13.5px; margin: 10px 0 3px; } ul { padding-left: 18px; margin: 4px 0; } li { margin: 2px 0; } p { margin: 4px 0; }
    </style></head><body>${cvHtml}</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

export default function TailorPanel({
  url, company, cvMd, changesHtml, cvHtml,
}: { url: string; company: string; cvMd: string | null; changesHtml: string | null; cvHtml: string | null }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState(true);

  const generate = () =>
    startTransition(async () => {
      try { setErr(null); await generateTailoredCv(url); } catch (e) { setErr(String(e)); }
    });

  if (!cvHtml) {
    return (
      <div className="panel" data-reveal style={{ textAlign: "center", padding: 34 }}>
        <p style={{ color: "var(--dim)", marginBottom: 16 }}>
          🪄 CV מותאם למשרה: ניסוח והדגשה מחדש של הניסיון האמיתי שלך בלבד — בלי המצאות, עם פירוט מה שונה ולמה.
        </p>
        <button className="chip on" style={{ fontSize: 15, padding: "9px 26px" }} disabled={pending} onClick={generate}>
          {pending ? "⏳ מתאים CV... (עד דקה)" : "🪄 התאם CV למשרה"}
        </button>
        {err && <p style={{ color: "var(--bad)", marginTop: 12, fontSize: 13 }} role="alert">{err}</p>}
      </div>
    );
  }

  return (
    <div className="panel kit" data-reveal>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>🪄 CV מותאם</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {changesHtml && (
            <button className="chip" aria-pressed={showChanges} onClick={() => setShowChanges(!showChanges)}>
              {showChanges ? "הסתר שינויים" : "מה שונה?"}
            </button>
          )}
          <button className="chip" onClick={() => download(`CV-${company.replace(/[^\w-]+/g, "_")}.md`, cvMd ?? "")}>הורד .md</button>
          <button className="chip" onClick={() => { const el = document.getElementById("tailored-cv"); if (el) printPdf(el.innerHTML); }}>הורד PDF</button>
          <button className="chip" disabled={pending} onClick={generate}>{pending ? "⏳..." : "צור מחדש"}</button>
        </div>
      </div>
      {changesHtml && showChanges && (
        <div className="kit-body changes" dangerouslySetInnerHTML={{ __html: changesHtml }} />
      )}
      <div className="kit-body" id="tailored-cv" dir="ltr" style={{ textAlign: "left" }} dangerouslySetInnerHTML={{ __html: cvHtml }} />
      {err && <p style={{ color: "var(--bad)", marginTop: 12, fontSize: 13 }} role="alert">{err}</p>}
    </div>
  );
}
