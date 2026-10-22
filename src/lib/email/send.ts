import "server-only";
import { serverEnv } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let smtpTransport: import("nodemailer").Transporter | null = null;

/**
 * Delivery: Resend in production (RESEND_API_KEY), SMTP anywhere else
 * (SMTP_URL — e.g. the local Mailpit at smtp://127.0.0.1:54325), otherwise a
 * console log so local development never silently drops mail.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const { resendApiKey, smtpUrl, from } = serverEnv.email;
  try {
    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      return true;
    }
    if (smtpUrl) {
      if (!smtpTransport) {
        const nodemailer = await import("nodemailer");
        smtpTransport = nodemailer.createTransport(smtpUrl);
      }
      await smtpTransport.sendMail({ from, to: email.to, subject: email.subject, html: email.html, text: email.text });
      return true;
    }
    console.info(`[email] (no provider configured) to=${email.to} subject="${email.subject}"`);
    return false;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
