/**
 * Typed access to environment variables. Public values are inlined by Next at
 * build time; server values are read lazily so static pages build without them.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in (see README → Environment variables).`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    // Supabase's Vercel integration may set the newer publishable key instead of the anon key.
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get googleAuthEnabled() {
    return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  },
  get spotifyEnabled() {
    return process.env.NEXT_PUBLIC_SPOTIFY_ENABLED === "true";
  },
  get supportEmail() {
    return process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@rumimatch.app";
  },
  /** Phase 7.5: web push. Needs VAPID keys on the server too. */
  get pushEnabled() {
    return process.env.NEXT_PUBLIC_PUSH_ENABLED === "true" && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  },
  get vapidPublicKey() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  },
  /** Phase 7.5: text messages (Twilio). */
  get smsEnabled() {
    return process.env.NEXT_PUBLIC_SMS_ENABLED === "true";
  },
  /** Phase 7.3: Google / Microsoft calendar free-busy. */
  get calendarEnabled() {
    return process.env.NEXT_PUBLIC_CALENDAR_ENABLED === "true";
  },
  /** Phase 3: school single sign-on (SAML/OIDC through Supabase Auth SSO). */
  get ssoEnabled() {
    return process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
  },
  /** Phase 8: language picker (English, Spanish). */
  get i18nEnabled() {
    return process.env.NEXT_PUBLIC_I18N_ENABLED !== "false";
  },
};

export const serverEnv = {
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY);
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get adminEmails() {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },
  get tokenEncryptionKey() {
    return required("TOKEN_ENCRYPTION_KEY", process.env.TOKEN_ENCRYPTION_KEY);
  },
  get spotify() {
    return {
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
    };
  },
  get email() {
    return {
      resendApiKey: process.env.RESEND_API_KEY ?? "",
      smtpUrl: process.env.SMTP_URL ?? "",
      from: process.env.EMAIL_FROM ?? "Rumi <hello@rumimatch.app>",
    };
  },
  get moderationWebhookUrl() {
    return process.env.MODERATION_WEBHOOK_URL ?? "";
  },
  get sms() {
    return {
      enabled: process.env.SMS_ENABLED === "true" && process.env.NEXT_PUBLIC_SMS_ENABLED === "true",
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      from: process.env.TWILIO_FROM_NUMBER ?? "",
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? "",
    };
  },
  get push() {
    return {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
      subject: process.env.VAPID_SUBJECT ?? "mailto:support@rumimatch.app",
    };
  },
  get calendar() {
    return {
      googleClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
      googleClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
      microsoftClientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? "",
      microsoftClientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET ?? "",
    };
  },
  /**
   * Phase 0.5 AI screening. Off unless AI_MODERATION_ENABLED=true and a gateway key is set;
   * even then a school must opt in before its students' messages are sent to the model.
   */
  get aiModeration() {
    const threshold = Number(process.env.AI_MODERATION_THRESHOLD ?? "0.8");
    const timeoutMs = Number(process.env.AI_MODERATION_TIMEOUT_MS ?? "8000");
    return {
      enabled: process.env.AI_MODERATION_ENABLED === "true",
      baseURL: process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh",
      apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
      model: process.env.AI_MODERATION_MODEL || "anthropic/claude-opus-5.5",
      threshold: Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.8,
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000,
    };
  },
};
