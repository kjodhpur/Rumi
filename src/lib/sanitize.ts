/**
 * Text hygiene for anything a student types. React escapes output, so this is
 * about keeping stored text clean: no control or invisible characters, no
 * runaway whitespace, sane length.
 */

// C0/C1 control characters except tab and newline.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Zero-width and bidi-override characters used to hide or spoof text.
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function cleanText(input: string, { multiline = true } = {}): string {
  let text = input.normalize("NFC").replace(/\r\n?/g, "\n").replace(CONTROL, "").replace(INVISIBLE, "");
  if (multiline) {
    text = text
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }
  return text.trim();
}

/** Single-line names: letters, spaces, apostrophes, hyphens, periods. */
export function cleanName(input: string): string {
  return cleanText(input, { multiline: false }).replace(/[^\p{L}\p{M}' .-]/gu, "").slice(0, 40);
}
