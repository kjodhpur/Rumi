/**
 * Illustrative, fictional ASU students for local development and previews.
 * Never seed production — fake people would mislead real students.
 */

export interface SeedPerson {
  first: string;
  last: string;
  gender: "woman" | "man" | "nonbinary";
  pronouns: string;
  year: "freshman" | "sophomore" | "junior" | "senior" | "grad";
  major: string;
  bio: string;
  taste: keyof typeof TASTES | null;
}

export const PEOPLE: SeedPerson[] = [
  { first: "Maya", last: "Rodriguez", gender: "woman", pronouns: "she/her", year: "junior", major: "Nursing", taste: "indie", bio: "Nursing junior with early clinicals, so I'm usually asleep by 11. I cook a lot (too much pasta) and love sharing. Looking for someone chill who keeps common areas tidy." },
  { first: "Priya", last: "Shah", gender: "woman", pronouns: "she/her", year: "senior", major: "Graphic Design", taste: "indie", bio: "Design senior who's always in the studio until late. At home I want calm — plants, candles, a clean kitchen. Big fan of Sunday farmers markets in Tempe." },
  { first: "Jordan", last: "Kim", gender: "man", pronouns: "he/him", year: "sophomore", major: "Computer Science", taste: "electronic", bio: "CS sophomore, gym in the morning and code at night. Pretty quiet and very clean — I do dishes right away. Down for game nights but not big parties." },
  { first: "Diego", last: "Morales", gender: "man", pronouns: "he/him", year: "junior", major: "Business", taste: "latin", bio: "W. P. Carey junior, work part-time at a coffee shop on Mill. I'm social and like having friends over on weekends, but weeknights are for studying. Will make you breakfast tacos." },
  { first: "Ava", last: "Thompson", gender: "woman", pronouns: "she/her", year: "freshman", major: "Biology", taste: "pop", bio: "Pre-med freshman moving off campus for the first time. Early bird, library person, and I keep my space organized. Looking for a friendly roommate who respects quiet hours." },
  { first: "Marcus", last: "Johnson", gender: "man", pronouns: "he/him", year: "senior", major: "Mechanical Engineering", taste: "hiphop", bio: "MechE senior on the Formula SAE team, so I'm in and out a lot. Easygoing, clean-ish, and I'll always split groceries. Basketball at the SDFC most evenings." },
  { first: "Sofia", last: "Martinez", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Journalism", taste: "latin", bio: "Cronkite sophomore, I write for State Press and I'm always chasing a story. Night owl, decently tidy, and I love hosting small dinners. Spanish and English at home." },
  { first: "Ethan", last: "Wright", gender: "man", pronouns: "he/him", year: "junior", major: "Finance", taste: "country", bio: "Finance junior, intern downtown two days a week. I like a clean, quiet place during the week and getting out on weekends — hiking Camelback, Diamondbacks games." },
  { first: "Chloe", last: "Nguyen", gender: "woman", pronouns: "she/her", year: "junior", major: "Psychology", taste: "indie", bio: "Psych junior working in a research lab. Homebody energy — reading, baking, rewatching Gilmore Girls. Need a quiet, kind roommate. I have a very calm cat." },
  { first: "Noah", last: "Patel", gender: "man", pronouns: "he/him", year: "grad", major: "Data Science", taste: "electronic", bio: "First-year master's student in Data Science. Mostly studying at home, so I value quiet weeknights. Tidy, low drama, and I cook on Sundays for the week." },
  { first: "Isabella", last: "Garcia", gender: "woman", pronouns: "she/her", year: "senior", major: "Marketing", taste: "pop", bio: "Marketing senior, part-time social media job. I'm social, love a clean apartment, and usually have friends over on Fridays. Looking for someone fun but respectful." },
  { first: "Omar", last: "Hassan", gender: "man", pronouns: "he/him", year: "sophomore", major: "Electrical Engineering", taste: "hiphop", bio: "EE sophomore. Up early, gym, class, lab. Don't drink, don't smoke, keep things clean. Looking for a respectful roommate near the Tempe campus." },
  { first: "Emma", last: "Johnson", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Kinesiology", taste: "country", bio: "Kinesiology sophomore and club soccer player. Early mornings, early nights. I'm tidy and pretty easygoing — would love a roommate to hike with." },
  { first: "Mateo", last: "Silva", gender: "man", pronouns: "he/him", year: "junior", major: "Film", taste: "indie", bio: "Film junior, always editing at weird hours. I'm a night owl but I wear headphones. Relaxed about mess within reason. Movie nights are mandatory." },
  { first: "Zoe", last: "Patel", gender: "woman", pronouns: "she/her", year: "senior", major: "Architecture", taste: "indie", bio: "Architecture senior — studio life means late nights and models everywhere (I clean up, promise). Looking for a patient, chill roommate who doesn't mind a little chaos at finals." },
  { first: "Ravi", last: "Iyer", gender: "man", pronouns: "he/him", year: "grad", major: "Biomedical Engineering", taste: "electronic", bio: "PhD student in BME. Pretty quiet, cook a lot of Indian food, and I'm out at the lab most days. Want a calm home and someone considerate." },
  { first: "Hannah", last: "Kim", gender: "woman", pronouns: "she/her", year: "freshman", major: "Supply Chain Management", taste: "pop", bio: "Freshman in Supply Chain, from San Diego. I'm a morning person who likes a neat space and a good playlist. Looking for a roommate who's also new to Tempe." },
  { first: "Tyler", last: "Brooks", gender: "man", pronouns: "he/him", year: "junior", major: "Criminology", taste: "country", bio: "Criminology junior, part-time at Target. Easygoing, I like having a couple friends over to watch games. I clean on weekends and I'm not picky." },
  { first: "Leah", last: "Cohen", gender: "woman", pronouns: "she/her", year: "junior", major: "Public Health", taste: "indie", bio: "Public Health junior, very into running and cooking. I keep a clean kitchen and go to bed by midnight. Looking for a respectful, friendly roommate." },
  { first: "Caleb", last: "Nguyen", gender: "man", pronouns: "he/him", year: "sophomore", major: "Aerospace Engineering", taste: "electronic", bio: "Aero sophomore, rocket club, way too many problem sets. Quiet weeknights, social weekends. I keep my room messy-ish but common areas clean." },
  { first: "Aaliyah", last: "Brooks", gender: "woman", pronouns: "she/her", year: "senior", major: "Political Science", taste: "hiphop", bio: "Poli sci senior and USG senator. Busy schedule, so home is where I recharge. I like it clean and calm, and I love a good brunch." },
  { first: "Andre", last: "Williams", gender: "man", pronouns: "he/him", year: "senior", major: "Music Performance", taste: "hiphop", bio: "Music performance senior (sax). I practice on campus, not at home! Night owl, social, and I'll always bring snacks back from gigs." },
  { first: "Jasmine", last: "Lee", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Economics", taste: "pop", bio: "Econ sophomore, part-time barista. Night owl, tidy, and I like having friends over occasionally. Looking for a roommate who's easy to talk to." },
  { first: "Kai", last: "Nakamura", gender: "man", pronouns: "he/him", year: "junior", major: "Digital Culture", taste: "electronic", bio: "Digital culture junior making music and games. Up late, headphones on. Pretty clean, very low drama. I have a gecko named Toast." },
  { first: "Olivia", last: "Chen", gender: "woman", pronouns: "she/her", year: "grad", major: "Accountancy", taste: "pop", bio: "MAcc student studying for the CPA. I need quiet weeknights and a clean place. Love trying new restaurants on weekends." },
  { first: "Lucas", last: "Ferreira", gender: "man", pronouns: "he/him", year: "sophomore", major: "Sustainability", taste: "indie", bio: "Sustainability sophomore — compost bin included. Early riser, bike everywhere, cook mostly vegetarian. Looking for someone tidy and down to share groceries." },
  { first: "Grace", last: "Okafor", gender: "woman", pronouns: "she/her", year: "junior", major: "Biomedical Engineering", taste: "hiphop", bio: "BME junior and research assistant. I'm organized, love a calm home, and I'm always down for a Trader Joe's run. Don't drink much." },
  { first: "Owen", last: "Murphy", gender: "man", pronouns: "he/him", year: "freshman", major: "Construction Management", taste: "country", bio: "Construction management freshman from Flagstaff. Early mornings, easygoing, love the outdoors. I'll keep the kitchen clean if you do too." },
  { first: "Natalie", last: "Romero", gender: "woman", pronouns: "she/her", year: "senior", major: "Nursing", taste: "latin", bio: "Nursing senior doing night shift rotations soon, so I need blackout curtains and quiet days. Tidy, kind, and I make a great pozole." },
  { first: "Elijah", last: "Scott", gender: "man", pronouns: "he/him", year: "junior", major: "Software Engineering", taste: "hiphop", bio: "Software engineering junior at the Poly campus. Pretty quiet, gaming in the evenings, tidy. Looking for a place in Chandler or Gilbert." },
  { first: "Mia", last: "Hernandez", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Film", taste: "indie", bio: "Film sophomore and coffee snob. I'm a night owl who loves movie marathons and thrifting. Relaxed about mess, serious about good vibes." },
  { first: "Isaac", last: "Cohen", gender: "man", pronouns: "he/him", year: "grad", major: "Economics", taste: "indie", bio: "Econ PhD student. Very quiet, early to bed, tidy. I'm a decent cook and I'll share. Looking for a mature roommate near campus or downtown." },
  { first: "Lily", last: "Tran", gender: "woman", pronouns: "she/her", year: "freshman", major: "Computer Science", taste: "electronic", bio: "CS freshman, hackathons and boba. Night owl, clean, quiet. Looking for a roommate who's also into tech (or at least tolerates keyboard clicks)." },
  { first: "Daniel", last: "Reyes", gender: "man", pronouns: "he/him", year: "senior", major: "Marketing", taste: "latin", bio: "Marketing senior, I DJ on weekends. Social and outgoing, but respectful of quiet hours. Clean common areas are a must for me." },
  { first: "Amara", last: "Mensah", gender: "woman", pronouns: "she/her", year: "junior", major: "Public Health", taste: "hiphop", bio: "Public health junior, peer health educator. I'm warm, organized, and love cooking jollof for friends. Looking for a respectful, tidy roommate." },
  { first: "Aiden", last: "Clark", gender: "man", pronouns: "he/him", year: "sophomore", major: "Finance", taste: "country", bio: "Finance sophomore, golf team. Up early, in bed early-ish, pretty clean. Social on weekends. Looking for an apartment close to campus." },
  { first: "Camila", last: "Torres", gender: "woman", pronouns: "she/her", year: "junior", major: "Architecture", taste: "latin", bio: "Architecture junior who lives in the studio. At home I want calm and clean. I have a small dog (very friendly, very quiet)." },
  { first: "Samuel", last: "Adeyemi", gender: "man", pronouns: "he/him", year: "junior", major: "Computer Science", taste: "hiphop", bio: "CS junior and ACM officer. Balanced — quiet weeknights, game nights on weekends. Tidy and easy to live with. I don't drink." },
  { first: "Ella", last: "Walker", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Psychology", taste: "pop", bio: "Psych sophomore, sorority member, and early riser. I'm social but I like my home to be peaceful and clean. Looking for a friendly roommate." },
  { first: "Ryan", last: "Chen", gender: "man", pronouns: "he/him", year: "freshman", major: "Business", taste: "electronic", bio: "Business freshman from Phoenix. Night owl, easygoing, tidy enough. I'm into basketball and cooking. Looking for a chill roommate near campus." },
  { first: "Nadia", last: "Haddad", gender: "woman", pronouns: "she/her", year: "grad", major: "Public Health", taste: "indie", bio: "MPH student working at the downtown campus. Quiet, tidy, and early to bed. I'd love a roommate who enjoys cooking and the occasional museum trip." },
  { first: "Jake", last: "Miller", gender: "man", pronouns: "he/him", year: "senior", major: "Kinesiology", taste: "country", bio: "Kinesiology senior, personal trainer on the side. Early riser, gym rat, meal prep king. Clean and respectful, social on weekends." },
  { first: "Sara", last: "Ahmed", gender: "woman", pronouns: "she/her", year: "sophomore", major: "Biology", taste: "pop", bio: "Biology sophomore, pre-dental. I don't drink or smoke, I keep things neat, and I'm usually studying. Looking for a kind roommate who values quiet." },
  { first: "Alex", last: "Rivera", gender: "nonbinary", pronouns: "they/them", year: "junior", major: "Digital Culture", taste: "indie", bio: "Digital culture junior, illustrator and plant parent. Night owl, relaxed about mess but never gross. Looking for an open-minded, chill roommate." },
  { first: "Riley", last: "Morgan", gender: "woman", pronouns: "she/they", year: "senior", major: "Journalism", taste: "indie", bio: "Journalism senior and podcast host. Social, curious, decently tidy. I love having people over for dinner but I'm also happy with quiet nights." },
  { first: "Sam", last: "Taylor", gender: "nonbinary", pronouns: "they/them", year: "sophomore", major: "Sustainability", taste: "indie", bio: "Sustainability sophomore, thrift store regular, vegetarian cook. Early-ish bird, tidy common areas, and I'd love a roommate who likes hiking." },
  { first: "Kayla", last: "Davis", gender: "woman", pronouns: "she/her", year: "junior", major: "Criminology", taste: "hiphop", bio: "Criminology junior and RA this year, so I know what makes roommates work: communication and clean dishes. Social, respectful, fun." },
  { first: "River", last: "Jones", gender: "nonbinary", pronouns: "they/them", year: "grad", major: "Music Performance", taste: "electronic", bio: "Grad student in music performance (piano — practice on campus). Quiet, considerate, and early to bed. Looking for a calm, tidy home." },
  { first: "Yusuf", last: "Ali", gender: "man", pronouns: "he/him", year: "junior", major: "Civil Engineering", taste: "hiphop", bio: "Civil engineering junior, ASCE member. Calm, clean, and up early most days. I cook halal meals and I'm happy to share. Looking for a respectful roommate near campus." },
  { first: "Brooke", last: "Anderson", gender: "woman", pronouns: "she/her", year: "freshman", major: "Nursing", taste: "country", bio: "Nursing freshman from Tucson. Early bird, organized, and I love baking on weekends. Looking for a friendly roommate who also keeps things tidy." },
];

export const MAJOR_CAMPUS: Record<string, string[]> = {
  "Software Engineering": ["chandler-gilbert", "tempe-south"],
  "Public Health": ["downtown-phoenix", "central-phoenix"],
  Journalism: ["downtown-phoenix", "tempe-campus"],
  Nursing: ["downtown-phoenix", "central-phoenix", "tempe-campus"],
};

/** Taste clusters → real Spotify artist IDs (so shared artists also work with real users). */
export const TASTES = {
  indie: [
    ["1r1uxoy19fzMxunt3ONAkG", "Phoebe Bridgers", ["indie folk", "indie pop"]],
    ["1hLiboQ98IQWhpKeP9vRFw", "boygenius", ["indie rock", "indie folk"]],
    ["2uYWxilOVlUdk4oV9DvwqK", "Mitski", ["indie", "art pop"]],
    ["3l0CmX0FuQjFxr8SK7Vqag", "Clairo", ["bedroom pop", "indie pop"]],
    ["5INjqkS1o8h1imAzPqGZBb", "Tame Impala", ["psychedelic rock", "indie"]],
    ["7Ln80lUS6He07XvHI8qqHH", "Arctic Monkeys", ["indie rock", "rock"]],
    ["3mIj9lX2MWuHmhNCA7LSCW", "The 1975", ["indie pop", "pop rock"]],
    ["2FXC3k01G6Gw61bmprjgqS", "Hozier", ["indie folk", "soul"]],
    ["163tK9Wjr9P9DmM0AVK7lm", "Lorde", ["art pop", "pop"]],
    ["4Z8W4fKeB5YxbusRsdQVPb", "Radiohead", ["alternative rock", "art rock"]],
    ["7gW0r5CkdEUMm42w9XpyZO", "Laufey", ["jazz pop", "bedroom pop"]],
    ["2RQXRUsr4IW1f3mKyKsy4B", "Noah Kahan", ["folk pop", "indie folk"]],
  ],
  pop: [
    ["06HL4z0CvFAxyc27GXpf02", "Taylor Swift", ["pop", "singer-songwriter"]],
    ["1McMsnEElThX1knmY4oliG", "Olivia Rodrigo", ["pop", "pop rock"]],
    ["74KM79TiuVKeVCqs8QtB0B", "Sabrina Carpenter", ["pop", "dance pop"]],
    ["7GlBOeep6PqTfFi59PTUUN", "Chappell Roan", ["pop", "synth pop"]],
    ["6qqNVTkY8uBg9cP3Jd7DAH", "Billie Eilish", ["pop", "art pop"]],
    ["6vWDO969PvNqNYHIOW5v0m", "Beyoncé", ["pop", "r&b"]],
    ["1Xyo4u8uXC1ZmMpatF05PJ", "The Weeknd", ["pop", "r&b"]],
    ["7tYKF4w9nC0nq9CsPZTHyP", "SZA", ["r&b", "pop"]],
    ["163tK9Wjr9P9DmM0AVK7lm", "Lorde", ["art pop", "pop"]],
    ["08GQAI4eElDnROBrJRGE0X", "Fleetwood Mac", ["classic rock", "soft rock"]],
  ],
  hiphop: [
    ["2YZyLoL8N0Wb9xBt1NhZWg", "Kendrick Lamar", ["hip hop", "rap"]],
    ["4V8LLVI7PbaPR0K2TGSxFF", "Tyler, The Creator", ["hip hop", "rap"]],
    ["2h93pZq0e7k5yf4dywlkpM", "Frank Ocean", ["r&b", "alternative r&b"]],
    ["7tYKF4w9nC0nq9CsPZTHyP", "SZA", ["r&b", "pop"]],
    ["3TVXtAsR1Inumwj472S9r4", "Drake", ["hip hop", "rap"]],
    ["0Y5tJX1MQlPlqiwlOH1tJY", "Travis Scott", ["hip hop", "rap"]],
    ["4LLpKhyESsyAXpc4laK94U", "Mac Miller", ["hip hop", "rap"]],
    ["20wkVLutqVOYrc0kxFs7rA", "Daniel Caesar", ["r&b", "neo soul"]],
    ["57vWImR43h4CaDao012Ofp", "Steve Lacy", ["alternative r&b", "indie"]],
    ["6vWDO969PvNqNYHIOW5v0m", "Beyoncé", ["pop", "r&b"]],
  ],
  latin: [
    ["4q3ewBCX7sLwd24euuV69X", "Bad Bunny", ["reggaeton", "latin trap"]],
    ["790FomKkXshlbRYZFtlgla", "Karol G", ["reggaeton", "latin pop"]],
    ["12GqGscKJx3aE4t07u7eVZ", "Peso Pluma", ["corridos tumbados", "regional mexican"]],
    ["7tYKF4w9nC0nq9CsPZTHyP", "SZA", ["r&b", "pop"]],
    ["1Xyo4u8uXC1ZmMpatF05PJ", "The Weeknd", ["pop", "r&b"]],
    ["06HL4z0CvFAxyc27GXpf02", "Taylor Swift", ["pop", "singer-songwriter"]],
    ["2YZyLoL8N0Wb9xBt1NhZWg", "Kendrick Lamar", ["hip hop", "rap"]],
  ],
  country: [
    ["40ZNYROS4zLfyyBSs2PGe2", "Zach Bryan", ["country", "red dirt"]],
    ["4oUHIQIBe0LHzYfvXNW4QM", "Morgan Wallen", ["country", "contemporary country"]],
    ["2RQXRUsr4IW1f3mKyKsy4B", "Noah Kahan", ["folk pop", "indie folk"]],
    ["06HL4z0CvFAxyc27GXpf02", "Taylor Swift", ["pop", "singer-songwriter"]],
    ["2FXC3k01G6Gw61bmprjgqS", "Hozier", ["indie folk", "soul"]],
    ["08GQAI4eElDnROBrJRGE0X", "Fleetwood Mac", ["classic rock", "soft rock"]],
  ],
  electronic: [
    ["4oLeXFyACqeem2VImYeBFe", "Fred again..", ["electronic", "house"]],
    ["6qgnBH6iDM91ipVXv28OMu", "Kaytranada", ["electronic", "house"]],
    ["5INjqkS1o8h1imAzPqGZBb", "Tame Impala", ["psychedelic rock", "indie"]],
    ["4V8LLVI7PbaPR0K2TGSxFF", "Tyler, The Creator", ["hip hop", "rap"]],
    ["2h93pZq0e7k5yf4dywlkpM", "Frank Ocean", ["r&b", "alternative r&b"]],
    ["57vWImR43h4CaDao012Ofp", "Steve Lacy", ["alternative r&b", "indie"]],
    ["3TVXtAsR1Inumwj472S9r4", "Drake", ["hip hop", "rap"]],
  ],
} as const satisfies Record<string, readonly (readonly [string, string, readonly string[]])[]>;

export const GROUPS = [
  { name: "Tempe 4BR crew", members: ["Diego", "Tyler"], target: 4 },
  { name: "Quiet house on Apache", members: ["Chloe", "Leah"], target: 3 },
  { name: "Downtown duo", members: ["Natalie"], target: 2 },
];

export const DEMO_MESSAGES = [
  ["them", "Hey! Rumi says we'd get along — looks like we both like a quiet place on weeknights. Still looking?"],
  ["you", "Yes! Hoping to find something near campus for August. What's your budget like?"],
  ["them", "Around $900 for my share. I found a 2BR on Apache that's walkable to the light rail."],
  ["you", "That works for me. Want to tour it this weekend?"],
  ["them", "Saturday at 11? I'll send the listing — and let's never send a deposit before we see it in person 😅"],
] as const;
