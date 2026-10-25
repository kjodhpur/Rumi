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
};
