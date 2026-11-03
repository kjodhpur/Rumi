import { describe, expect, it } from "vitest";
import { csvLine, decodeCsvBytes, headerIndex, parseCsv } from "./parse";

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, embedded commas and newlines, CRLF and a BOM", () => {
    const text = '﻿Name,Note\r\n"Lee, Sam","said ""hi""\nthen left"\r\nAna,plain\n\n';
    expect(parseCsv(text)).toEqual([
      ["Name", "Note"],
      ["Lee, Sam", 'said "hi"\nthen left'],
      ["Ana", "plain"],
    ]);
  });

  it("drops blank lines and caps very large files", () => {
    expect(parseCsv("a\n\n , \nb")).toEqual([["a"], ["b"]]);
    expect(() => parseCsv(Array.from({ length: 30 }, (_, i) => `r${i}`).join("\n"), 10)).toThrow("too_many_rows");
  });
});

describe("decodeCsvBytes", () => {
  it("reads UTF-8 and falls back to Windows-1252", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("﻿José"))).toBe("José");
    expect(decodeCsvBytes(new Uint8Array([0x4a, 0x6f, 0x73, 0xe9]))).toBe("José");
  });
});

describe("helpers", () => {
  it("matches headers loosely and writes formula-safe lines", () => {
    const idx = headerIndex(["Student ID", "E-mail", "Room #"]);
    expect(idx("studentid")).toBe(0);
    expect(idx("Email")).toBe(1);
    expect(idx("Bed")).toBe(-1);
    expect(csvLine(["=SUM(A1)", "a,b", 'say "x"'])).toBe(`'=SUM(A1),"a,b","say ""x"""`);
  });
});
