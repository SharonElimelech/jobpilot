"use client";

import { useActionState } from "react";
import { uploadCv } from "@/app/actions";

export default function CvUpload({ hasCv }: { hasCv: boolean }) {
  const [state, action, pending] = useActionState(uploadCv, {});
  return (
    <section className="panel" data-reveal>
      <h2>
        📄 קורות חיים
        <span className="tag">{hasCv ? "קובץ מעודכן שמור — Claude משתמש בו להתאמות" : "עוד לא הועלה קובץ — נעשה שימוש ב-CV המובנה"}</span>
      </h2>
      <form action={action} className="toolbar" style={{ marginBottom: 0 }}>
        <input type="file" name="cv" accept=".md,.txt" aria-label="קובץ קורות חיים" className="chip" style={{ padding: 8 }} />
        <button className="chip on" disabled={pending}>
          {pending ? "⏳ מעלה..." : "העלה CV"}
        </button>
        {state.ok && <span style={{ color: "var(--acc)", fontSize: 13 }} role="status">✓ נשמר</span>}
        {state.error && <span style={{ color: "var(--bad)", fontSize: 13 }} role="alert">{state.error}</span>}
      </form>
    </section>
  );
}
