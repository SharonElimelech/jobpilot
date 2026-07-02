"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {} as { error?: string });
  return (
    <div className="login-wrap">
      <form className="login" action={action}>
        <h1>JobPilot 🛩️</h1>
        <p>לוח בקרה אישי — הזן סיסמה</p>
        <label htmlFor="pw">סיסמה</label>
        <input id="pw" type="password" name="password" placeholder="••••••••" autoComplete="current-password" autoFocus />
        <button disabled={pending}>{pending ? "מתחבר…" : "כניסה"}</button>
        {state.error && <div className="err" role="alert">{state.error}</div>}
      </form>
    </div>
  );
}
