import { HousingQuestionnaireAnswer } from "../housing/adapter";

export interface MappedFactorResult {
  mappedFactor: string;
  mappedValue: string;
}

/**
 * Standard StarRez question codes mapped to Rumi factor keys and domain values.
 */
export const STARREZ_QUESTION_MAPPINGS: Record<
  string,
  {
    factor: string;
    valueMap: Record<string, string>;
  }
> = {
  CLEANLINESS: {
    factor: "cleanliness",
    valueMap: {
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      RELAXED: "1",
      SOMEWHAT_TIDY: "2",
      AVERAGE: "3",
      TIDY: "4",
      SPOTLESS: "5",
    },
  },
  SLEEP: {
    factor: "sleep_schedule",
    valueMap: {
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      EARLY: "1",
      BEFORE_MIDNIGHT: "2",
      MIDNIGHT: "3",
      PAST_1AM: "4",
      NIGHT_OWL: "5",
    },
  },
  NOISE: {
    factor: "noise",
    valueMap: {
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      SILENT: "1",
      QUIET: "2",
      NORMAL: "3",
      MUSIC_ON: "4",
      LOUD: "5",
    },
  },
  GUESTS: {
    factor: "guests",
    valueMap: {
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      RARELY: "1",
      OCCASIONAL: "2",
      MONTHLY: "3",
      WEEKENDS: "4",
      FREQUENTLY: "5",
    },
  },
  SMOKING: {
    factor: "smoking",
    valueMap: {
      NO: "never",
      NEVER: "never",
      OUTSIDE: "sometimes",
      SOMETIMES: "sometimes",
      YES: "regularly",
      REGULARLY: "regularly",
    },
  },
  DRINKING: {
    factor: "drinking",
    valueMap: {
      NO: "never",
      NEVER: "never",
      SOCIALLY: "socially",
      SOMETIMES: "socially",
      YES: "often",
      OFTEN: "often",
    },
  },
  PETS: {
    factor: "pets",
    valueMap: {
      NO: "none",
      NONE: "none",
      HAVE: "have",
      YES: "have",
      WANT: "want",
      OPEN: "want",
    },
  },
  STUDY: {
    factor: "study",
    valueMap: {
      CAMPUS: "campus",
      LIBRARY: "campus",
      HOME_QUIET: "home_quiet",
      QUIET: "home_quiet",
      HOME_SOCIAL: "home_social",
      SOCIAL: "home_social",
      MIX: "mix",
      BOTH: "mix",
    },
  },
};

/**
 * Maps a single StarRez question code and raw value to Rumi factor key and value.
 */
export function mapStarRezAnswer(questionCode: string, rawValue: string): MappedFactorResult | null {
  const normalizedCode = questionCode.trim().toUpperCase();
  const mapping = STARREZ_QUESTION_MAPPINGS[normalizedCode];
  if (!mapping) return null;

  const normalizedVal = rawValue.trim().toUpperCase();
  const mappedVal = mapping.valueMap[normalizedVal] || mapping.valueMap[rawValue.trim()];

  if (!mappedVal) return null;

  return {
    mappedFactor: mapping.factor,
    mappedValue: mappedVal,
  };
}

/**
 * Parses a CSV export from StarRez Questionnaire/Roommate Profile module.
 * Columns: EntryID/StudentID, Email, QuestionCode, AnswerText
 */
export function parseStarRezQuestionnaireCsv(csvText: string): HousingQuestionnaireAnswer[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const idCol = headers.findIndex((h) => /EntryID|StudentID|ASUID/i.test(h));
  const emailCol = headers.findIndex((h) => /Email|Mail/i.test(h));
  const codeCol = headers.findIndex((h) => /QuestionCode|Code|Field/i.test(h));
  const valCol = headers.findIndex((h) => /AnswerText|Value|Response|Answer/i.test(h));

  if (idCol === -1 || codeCol === -1 || valCol === -1) {
    return [];
  }

  const results: HousingQuestionnaireAnswer[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells: string[] = [];
    let inQuotes = false;
    let current = "";

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    const studentId = cells[idCol]?.replace(/^["']|["']$/g, "") || "";
    const email = emailCol >= 0 ? cells[emailCol]?.replace(/^["']|["']$/g, "") : undefined;
    const questionCode = cells[codeCol]?.replace(/^["']|["']$/g, "") || "";
    const rawValue = cells[valCol]?.replace(/^["']|["']$/g, "") || "";

    if (studentId && questionCode && rawValue) {
      results.push({
        externalStudentId: studentId,
        email,
        questionCode,
        rawValue,
      });
    }
  }

  return results;
}
