import { NextRequest, NextResponse } from "next/server";
import {
  getActiveInterview, pickInterviewJob, startInterview, processAnswer, stopInterview,
} from "@/lib/interview";

export const maxDuration = 60;

async function reply(chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

const HELP =
  `🛩️ פקודות JobPilot:\n` +
  `• "ראיון" — מתחיל ראיון דמה (5 שאלות) על המשרה הכי רלוונטית שלך\n` +
  `• "עצור" — מפסיק ראיון פעיל\n` +
  `שאר ההתראות מגיעות אוטומטית מהסורק.`;

export async function POST(req: NextRequest) {
  // webhook auth: Telegram echoes back the secret we register with setWebhook
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json();
  const msg = update?.message;
  const chatId = String(msg?.chat?.id ?? "");
  const text: string = (msg?.text ?? "").trim();

  // single-user bot: ignore everyone but Sharon
  if (!chatId || chatId !== process.env.TELEGRAM_CHAT_ID || !text) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (/^(עצור|stop)$/i.test(text)) {
      await stopInterview(chatId);
      await reply(chatId, "הראיון הופסק. תגיד \"ראיון\" כשתרצה סבב חדש 👋");
      return NextResponse.json({ ok: true });
    }

    if (/^(ראיון|interview)/i.test(text)) {
      const job = await pickInterviewJob();
      if (!job) {
        await reply(chatId, "אין עדיין משרות במערכת לראיין עליהן.");
        return NextResponse.json({ ok: true });
      }
      await reply(chatId, `🎤 ראיון דמה ל: ${job.title} @ ${job.company}\nעונים בהודעת טקסט חופשית. "עצור" מסיים.\nמכין שאלות...`);
      const firstQ = await startInterview(chatId, job);
      await reply(chatId, `שאלה 1/5:\n${firstQ}`);
      return NextResponse.json({ ok: true });
    }

    const active = await getActiveInterview(chatId);
    if (active) {
      const feedback = await processAnswer(active, text);
      await reply(chatId, feedback);
      return NextResponse.json({ ok: true });
    }

    await reply(chatId, HELP);
  } catch (e) {
    console.error("telegram webhook error:", e);
    await reply(chatId, "משהו נשבר אצלי רגע 🙈 נסה שוב.");
  }
  return NextResponse.json({ ok: true });
}
