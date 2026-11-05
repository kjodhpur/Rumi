/** Standalone screens outside the app shell. */
export const pages = {
  home: "Rumi home",
  signOut: "Sign out",
  tryAgain: "Try again",
  offline: {
    meta: "Offline",
    title: "You're offline",
    body: "Rumi needs a connection to load matches and messages. We'll pick up where you left off as soon as you're back.",
  },
  suspended: {
    meta: "Account suspended",
    title: "This account is suspended",
    body: "After a review, our safety team suspended this account for breaking Rumi's community guidelines. Your profile is hidden from everyone and your chats are paused.",
    reason: "Reason",
    mistakeLead: "If you think this is a mistake, email",
    mistakeTail: "from your school address and we'll take another look.",
    subject: "Account review",
    contact: "Contact support",
    download: "Download your data",
  },
  notStudent: {
    title: "Rumi is for students",
    body: "Your school's sign-in says this account belongs to staff or faculty, so it isn't part of roommate matching. If you work in housing, ask your housing admin for a staff invite.",
    wrongLead: "Think that's wrong? Email",
  },
  appError: {
    title: "That didn't load",
    body: "Check your connection and try again.",
    reference: "Reference: {digest}",
  },
  globalError: {
    title: "Rumi hit a snag",
    body: "Please reload the page. If it keeps happening, try again in a few minutes.",
    reload: "Reload",
  },
};
