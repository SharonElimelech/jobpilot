"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function login(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const pw = String(formData.get("password") ?? "");
  if (!pw || pw !== process.env.DASHBOARD_PASSWORD) {
    return { error: "סיסמה שגויה" };
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await sha256Hex(pw), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // ponytail: remember for a year, re-login only on password change
    path: "/",
  });
  redirect("/");
}

export async function generateApplyKit(url: string): Promise<void> {
  const { getJob, saveKit } = await import("@/lib/db");
  const { generateKit } = await import("@/lib/claude");
  const job = await getJob(url);
  if (!job) throw new Error("job not found");
  const kit = await generateKit(job);
  await saveKit(url, kit);
  const { toId } = await import("@/lib/id");
  revalidatePath(`/job/${toId(url)}`);
}

export async function uploadCv(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: "לא נבחר קובץ" };
  if (file.size > 200_000) return { error: "קובץ גדול מדי (מקסימום 200KB)" };
  if (!/\.(md|txt)$/i.test(file.name)) return { error: "רק קובצי טקסט: .md או .txt" };
  const text = await file.text();
  if (text.trim().length < 100) return { error: "הקובץ קצר מדי בשביל קורות חיים" };
  const { saveCv } = await import("@/lib/db");
  await saveCv(text);
  revalidatePath("/");
  return { ok: true };
}

export async function generateTailoredCv(url: string): Promise<void> {
  const { getJob, saveTailoredCv } = await import("@/lib/db");
  const { tailorCv } = await import("@/lib/claude");
  const job = await getJob(url);
  if (!job) throw new Error("job not found");
  await saveTailoredCv(url, await tailorCv(job));
  const { toId } = await import("@/lib/id");
  revalidatePath(`/job/${toId(url)}`);
}

export async function setStatus(url: string, status: string | null) {
  const { error } = await supabase()
    .from("jobs")
    .update({
      app_status: status,
      applied_at: status === "applied" ? new Date().toISOString() : undefined,
    })
    .eq("url", url);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
