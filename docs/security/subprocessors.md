# Subprocessors

> **Status: draft — not audited.** Confirm current terms and regions with each provider
> before sharing with a school.

| Provider | Purpose | Data | When used |
|---|---|---|---|
| Supabase | Database, authentication, file storage | All application data | Always |
| Vercel | Hosting, serverless functions, scheduled jobs | Request data in transit; logs | Always |
| Resend (or the school's SMTP) | Email delivery | Recipient email, message content | Always (email notifications and sign-in codes via Supabase) |
| Spotify | Optional music matching | Spotify account ID, top artists | Only for students who connect Spotify |
| Twilio | Optional text messages | Phone number, message text, STOP/HELP replies | Only when `SMS_ENABLED` and the student verified a number |
| Web push services (browser vendors) | Optional push notifications | Push endpoint, notification title and body | Only for students who turn on push |
| Amazon Web Services (Bedrock) | Optional "Why you match" sentences | Both students' compatibility factors (no names, no messages) | Only when AWS keys are configured |
| Vercel AI Gateway, routing to Anthropic (Claude) | Optional AI message screening for harassment, threats and scams | Text of messages and intros only (no names, emails or profile data) | Only when `AI_MODERATION_ENABLED` is set and the school turned it on in Staff → Safety settings |
| Google / Microsoft | Optional calendar free/busy | Free/busy blocks only | Only for students who connect a calendar |
| StarRez | Optional housing sync (school's own system) | Roommate groups, assignments | Only when a school connects it |
