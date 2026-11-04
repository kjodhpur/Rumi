import { describe, expect, it } from "vitest";
import { isSevere, moderateText } from "./patterns";

describe("regex moderation (automatic scam flags)", () => {
  it.each([
    ["Send the deposit first and I'll mail you the keys", "payment"],
    ["Can you pay with Zelle or a gift card?", "payment"],
    ["Text me at 480-555-0199", "contact"],
    ["Let's move to WhatsApp", "contact"],
    ["See the place at https://cheap-rooms.example.com/x", "links"],
    ["kys", "abuse"],
  ])("flags %j as %s", (text, flag) => {
    expect(moderateText(text)).toContain(flag);
  });

  it.each([
    "I go to bed around 11 and I'm pretty tidy.",
    "Here's the listing: https://www.zillow.com/homedetails/123",
    "Do you want to split groceries?",
  ])("leaves %j alone", (text) => {
    expect(moderateText(text)).toEqual([]);
  });

  it("only payment and abuse report on their own", () => {
    expect(isSevere(["contact", "links"])).toBe(false);
    expect(isSevere(["payment"])).toBe(true);
    expect(isSevere(["abuse"])).toBe(true);
  });
});
