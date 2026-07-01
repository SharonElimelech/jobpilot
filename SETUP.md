# JobPilot Setup (one-time, ~15 min)

## 1. Supabase
1. https://supabase.com → New project (free tier).
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Project Settings → API: copy `URL` → `SUPABASE_URL`, `service_role` key → `SUPABASE_SERVICE_KEY`.

## 2. Telegram bot
1. In Telegram, message **@BotFather** → `/newbot` → name it (e.g. JobPilot) → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Send any message to your new bot (e.g. "hi").
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser → copy `message.chat.id` → `TELEGRAM_CHAT_ID`.

## 3. Anthropic
https://platform.claude.com → API key → `ANTHROPIC_API_KEY`.

## 4. Local run
Copy `.env.example` to `.env`, fill in all five values, then:

```
npm install
npm test
npm run scan
```

## 5. GitHub
1. Create a repo, push.
2. Repo → Settings → Secrets and variables → Actions → add all five secrets with the same names.
3. Actions tab → "scan" workflow → Run workflow (manual test).

From then on it runs automatically every 2 hours.
