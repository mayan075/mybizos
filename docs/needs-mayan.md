# Things That Need Mayan's Help

These are blockers the army hit that require your input or credentials.
Everything else is being handled autonomously.

## 1. Twilio Master Account (for Model B "MyBizOS Phone")
- We need YOUR Twilio Account SID + Auth Token to create subaccounts
- This lets business owners buy phone numbers through MyBizOS
- Without this: Model B shows "Coming soon / waitlist"
- With this: Business owners can buy a number in 60 seconds

## 2. Railway PostgreSQL Database
- We need a real database for persistent data (not just localStorage)
- Action: Create a Railway account (free tier) → provision PostgreSQL
- Then: Give me the DATABASE_URL and I'll run migrations + seed

## 3. Anthropic API Key (for real AI features)
- The AI assistant, lead scoring, and phone agent all need a Claude API key
- Without it: AI features use mock/simulated responses
- With it: Real AI conversations, real scoring, real phone agent

## 4. Postmark Account (for real email sending)
- Free tier: 100 emails/month
- Needed for: appointment confirmations, review requests, campaign emails

## 5. Vapi.ai Account (for AI phone agent)
- Free tier available
- Needed for: actual AI phone call handling

## 6. Domain Setup
- mybizos.com — do you own this domain?
- If yes: point it to Vercel for app.mybizos.com
- If no: we can buy it or use mybizos.vercel.app for now

## 7. Your Business Details (for demo/testing)
- Northern Removals: exact business name, phone, address, service area
- Moving company: exact business name, phone, address
- Your personal phone for testing call forwarding

## Priority Order
1. Railway DB (unblocks real data persistence)
2. Twilio Account (unblocks phone features)
3. Anthropic Key (unblocks AI features)
4. Everything else can wait
