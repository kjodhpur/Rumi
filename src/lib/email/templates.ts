import { absoluteUrl } from "@/lib/utils";

function escape(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

interface LayoutInput {
  preheader: string;
  heading: string;
  body: string;
  quote?: string;
  cta: { label: string; href: string };
  /** Replaces the notification-settings footer for emails that aren't notifications. */
  footer?: string;
}

/** One calm, accessible layout for every notification email. */
export function layout({ preheader, heading, body, quote, cta, footer }: LayoutInput) {
  const href = absoluteUrl(cta.href);
  const settings = absoluteUrl("/settings/notifications");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#171614;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e7e3db;border-radius:16px;">
<tr><td style="padding:28px 32px 0;"><div style="font-size:24px;font-weight:700;letter-spacing:-0.06em;">rumi</div></td></tr>
<tr><td style="padding:20px 32px 0;"><h1 style="margin:0;font-size:22px;line-height:28px;font-weight:600;letter-spacing:-0.01em;">${escape(heading)}</h1>
<p style="margin:10px 0 0;font-size:15px;line-height:22px;color:#5e5a53;">${escape(body)}</p></td></tr>
${quote ? `<tr><td style="padding:16px 32px 0;"><div style="background:#f0ede6;border-radius:12px;padding:14px 16px;font-size:15px;line-height:22px;color:#171614;">${escape(quote)}</div></td></tr>` : ""}
<tr><td style="padding:24px 32px 32px;"><a href="${href}" style="display:inline-block;background:#171614;color:#f7f5f0;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;">${escape(cta.label)}</a></td></tr>
</table>
<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#6f6a62;">${footer ? escape(footer) : `You're getting this because of your Rumi notification settings. <a href="${settings}" style="color:#6f6a62;">Change them</a>.`}</p>
</td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}${quote ? `\n\n“${quote}”` : ""}\n\n${cta.label}: ${href}\n\n${footer ?? `Change notification settings: ${settings}`}`;
  return { html, text };
}

export function introReceivedEmail(senderName: string, message: string) {
  return {
    subject: `${senderName} sent you an intro on Rumi`,
    ...layout({
      preheader: message.slice(0, 90),
      heading: `${senderName} wants to connect`,
      body: "Accept to open a chat, or pass — they won't be told which.",
      quote: message,
      cta: { label: "View intro", href: "/messages?tab=requests" },
    }),
  };
}

export function introAcceptedEmail(recipientName: string, conversationId: string) {
  return {
    subject: `${recipientName} accepted your intro`,
    ...layout({
      preheader: "Your chat is open.",
      heading: `You and ${recipientName} are connected`,
      body: "Your chat is open — a good first message is a question about their ideal place.",
      cta: { label: "Open chat", href: `/messages/${conversationId}` },
    }),
  };
}

export function newMessageEmail(
  senderName: string,
  preview: string,
  conversationId: string,
  groupName?: string | null,
) {
  return {
    subject: groupName ? `New message in ${groupName}` : `New message from ${senderName}`,
    ...layout({
      preheader: preview.slice(0, 90),
      heading: groupName ? `${senderName} in ${groupName}` : `${senderName} sent you a message`,
      body: "Reply on Rumi — your conversation stays private to the people in it.",
      quote: preview,
      cta: { label: "Reply", href: `/messages/${conversationId}` },
    }),
  };
}

export function groupInviteEmail(inviterName: string, groupName: string) {
  return {
    subject: `${inviterName} invited you to ${groupName}`,
    ...layout({
      preheader: "Join their group to match on bigger places together.",
      heading: `Join ${groupName}?`,
      body: `${inviterName} thinks you'd fit their group. See everyone's compatibility before you decide.`,
      cta: { label: "View invite", href: "/messages?tab=requests" },
    }),
  };
}

export function strongMatchDigestEmail(
  firstName: string,
  matches: { name: string; score: number; id: string }[],
) {
  const top = matches.slice(0, 3);
  const list = top.map((m) => `${m.name} (${m.score}%)`).join(", ");
  return {
    subject:
      matches.length === 1
        ? `New ${top[0].score}% match on Rumi`
        : `${matches.length} strong new matches on Rumi`,
    ...layout({
      preheader: list,
      heading: firstName
        ? `${firstName}, you have new strong matches`
        : "You have new strong matches",
      body: `People who fit how you live just joined or updated their profile: ${list}.`,
      cta: { label: "See your matches", href: "/matches" },
    }),
  };
}

export function staffInviteEmail(
  inviterName: string,
  schoolName: string,
  roleLabel: string,
  token: string,
) {
  return {
    subject: `${inviterName} invited you to Rumi for ${schoolName}`,
    ...layout({
      preheader: `Join as ${roleLabel}. The link works for 7 days.`,
      heading: `Join ${schoolName} on Rumi`,
      body: `${inviterName} invited you as ${roleLabel}. Sign in with this email address to accept. The link works for 7 days.`,
      cta: { label: "Accept invite", href: `/invite/${token}` },
      footer:
        "You're getting this because someone at your school invited this address. Ignore it if you weren't expecting it.",
    }),
  };
}

export function inactivityWarningEmail(daysLeft: number) {
  return {
    subject: "Your Rumi account will be deleted soon",
    ...layout({
      preheader: `Sign in within ${daysLeft} days to keep it.`,
      heading: "We'll delete your account soon",
      body: `You haven't signed in for a long time, so we'll delete your account and everything in it in ${daysLeft} days. Sign in anytime before then to keep it.`,
      cta: { label: "Keep my account", href: "/login" },
      footer: "We delete inactive accounts so we don't hold onto data nobody uses.",
    }),
  };
}

export function housingSuggestionEmail(office: string, proposalId: string, size = 2) {
  const group = size > 2;
  return {
    subject: group
      ? `${office} suggested a group of ${size} for you`
      : `${office} suggested a roommate for you`,
    ...layout({
      preheader: group
        ? "Meet them and say yes or no. Nothing happens unless everyone says yes."
        : "See who it is and say yes or no. Nothing happens unless you both say yes.",
      heading: group ? "A group suggestion" : "A roommate suggestion",
      body: group
        ? `${office} used Rumi to suggest a room of ${size} where everyone is compatible. Meet them, then accept or decline. Nothing happens unless everyone says yes.`
        : `${office} used Rumi to suggest someone you're compatible with. See why you match, then accept or decline. Nothing happens unless you both say yes.`,
      cta: { label: "See the suggestion", href: `/suggestions/${proposalId}` },
    }),
  };
}

export function housingNudgeEmail(office: string) {
  return {
    subject: "Still looking for a roommate?",
    ...layout({
      preheader: "Your best matches are waiting.",
      heading: "Still looking for a roommate?",
      body: `${office} noticed you haven't found a roommate on Rumi yet. Your best matches are ranked and ready, and one intro is all it takes.`,
      cta: { label: "See your matches", href: "/matches" },
    }),
  };
}

/** A student chose to forward a serious report to the school's configured office (Phase 0.3). */
export function escalationForwardEmail(input: {
  office: string;
  category: string;
  reporterFirstName: string;
  reporterEmail: string;
  details: string | null;
  excerpt: string | null;
}) {
  const { html, text } = layout({
    preheader: `A student asked Rumi to forward a ${input.category.toLowerCase()} report.`,
    heading: `A student forwarded a report to ${input.office}`,
    body: `${input.reporterFirstName} (${input.reporterEmail}) reported "${input.category}" on Rumi and chose to send it to your office so you can follow up. Rumi is a roommate-matching service and doesn't investigate.${input.details ? ` What they wrote: ${input.details}` : ""}`,
    quote: input.excerpt ?? undefined,
    cta: { label: "About Rumi", href: "/security" },
    footer:
      "Sent because the student chose to forward their report to this address, which your school configured in Rumi.",
  });
  return { subject: `Forwarded report from a student (${input.category})`, html, text };
}

export function deadlineNudgeEmail(copy: { title: string; body: string; href: string }) {
  const { html, text } = layout({
    preheader: copy.body,
    heading: copy.title,
    body: copy.body,
    cta: { label: "Open Rumi", href: copy.href },
  });
  return { subject: copy.title, html, text };
}
