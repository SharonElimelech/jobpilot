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
        <input type="password" name="password" placeholder="••••••••" autoFocus />
        <button disabled={pending}>{pending ? "..." : "כניסה"}</button>
        {state.error && <div className="err">{state.error}</div>}
      </form>
    </div>
  );
}
