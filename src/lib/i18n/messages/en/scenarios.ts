/** Rumi's default scenario questions (lib/matching/scenarios). School-added questions show as written. */
export const scenarios = {
  partner_overnight: {
    stem: "Your roommate's partner stays over three nights a week.",
    topic: "overnight guests",
    choices: {
      fine: { label: "Totally fine with me", reason: "You're both relaxed about overnight guests" },
      talk_first: {
        label: "Fine if we talk about it first",
        reason: "You'd both want to talk about overnight guests first",
      },
      too_often: {
        label: "Okay sometimes, but three nights is a lot",
        reason: "You both think a few nights a week is too many",
      },
      not_okay: {
        label: "Not okay for me",
        reason: "Neither of you wants regular overnight guests",
      },
    },
  },
  dishes: {
    stem: "Dishes are left in the sink overnight.",
    topic: "dishes in the sink",
    choices: {
      no_big_deal: {
        label: "No big deal, they'll get done",
        reason: "Neither of you minds dishes waiting a day",
      },
      next_day: {
        label: "Fine if they're done the next day",
        reason: "You both want dishes done within a day",
      },
      mention: {
        label: "I'd mention it in the morning",
        reason: "You'd both bring up dishes left out",
      },
      before_bed: {
        label: "Dishes get done before bed",
        reason: "You both want the sink empty by bedtime",
      },
    },
  },
  thursday_night: {
    stem: "It's 11pm on a Thursday and your roommate has friends over, laughing loudly.",
    topic: "weeknight noise",
    choices: {
      join: {
        label: "I'd probably join in",
        reason: "You both like a lively place, even on weeknights",
      },
      wrap_up: {
        label: "Fine if it wraps up by midnight",
        reason: "You'd both want weeknight noise to wind down by midnight",
      },
      headphones: {
        label: "Headphones on, but I'd mention it",
        reason: "You'd both rather keep weeknights calm",
      },
      quiet: { label: "Weeknights should be quiet", reason: "You both want quiet weeknights" },
    },
  },
  finals_group: {
    stem: "During finals, your roommate wants a study group in your room.",
    topic: "studying in the room",
    choices: {
      love_it: { label: "Great, I'll join", reason: "You both like studying with people around" },
      heads_up: {
        label: "Fine with a heads-up",
        reason: "You'd both want a heads-up before a study group",
      },
      library: {
        label: "I'd head to the library",
        reason: "You'd both move a study group somewhere else",
      },
      keep_quiet: {
        label: "The room should stay quiet during finals",
        reason: "You both want a quiet room during finals",
      },
    },
  },
  bathroom: {
    stem: "The shared bathroom is getting messy by midweek.",
    topic: "cleaning the bathroom",
    choices: {
      dont_notice: {
        label: "I honestly wouldn't notice",
        reason: "Neither of you sweats a messy bathroom",
      },
      weekend: {
        label: "We clean it on the weekend",
        reason: "You'd both clean the bathroom weekly",
      },
      every_few_days: {
        label: "A quick wipe every few days",
        reason: "You both like a quick clean every few days",
      },
      right_away: {
        label: "It gets cleaned right away",
        reason: "You both keep the bathroom spotless",
      },
    },
  },
  early_alarm: {
    stem: "Your roommate's alarm goes off at 6:30am on weekdays.",
    topic: "early alarms",
    choices: {
      already_up: { label: "I'm probably already up", reason: "You're both early risers" },
      fine_weekdays: {
        label: "Fine on weekdays",
        reason: "You're both fine with early weekday alarms",
      },
      no_snooze: {
        label: "Okay, as long as there's no snoozing",
        reason: "You'd both want early alarms off fast",
      },
      bothers_me: {
        label: "That would really bother me",
        reason: "Neither of you wants early alarms",
      },
    },
  },
  late_lamp: {
    stem: "It's 1am and your roommate is still up with the lamp on.",
    topic: "late nights with the lights on",
    choices: {
      me_too: { label: "I'm still up too", reason: "You're both up late" },
      dim: { label: "Fine if it's dim", reason: "You're both fine with a dim light late" },
      dark_by_midnight: {
        label: "I need it dark by midnight",
        reason: "You both want lights out by midnight",
      },
    },
  },
  weekend_visitor: {
    stem: "A friend from home wants to sleep on the floor for the weekend.",
    topic: "weekend visitors",
    choices: {
      of_course: { label: "Of course", reason: "You're both happy to host friends" },
      heads_up: {
        label: "Sure, with a heads-up",
        reason: "You'd both want a heads-up before visitors stay",
      },
      rarely: { label: "Only once in a while", reason: "You both keep visitors occasional" },
      rather_not: { label: "I'd rather not", reason: "Neither of you wants visitors staying over" },
    },
  },
};
