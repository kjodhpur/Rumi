import { describe, expect, it } from "vitest";
import { csvCell, DEFAULT_MAPPING, parseMapping, toCsv, type ExportRow } from "./csv";

const row = (overrides: Partial<ExportRow> = {}): ExportRow => ({
  studentId: "1234567890",
  email: "ana@asu.edu",
  firstName: "Ana",
  lastInitial: "T",
  groupName: "Ana & Ben",
  groupId: "g1",
  groupLeader: "Y",
  groupSize: "2",
  term: "Fall 2027",
  ...overrides,
});

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("defuses spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-2")).toBe("'-2");
  });
});

describe("toCsv", () => {
  it("writes the mapped headers and columns in order with CRLF line endings", () => {
    const csv = toCsv(DEFAULT_MAPPING, [row(), row({ studentId: "", email: "ben@asu.edu", groupLeader: "N" })]);
    expect(csv).toBe(
      "EntryID,Email,GroupName,GroupLeader,GroupSize,Term\r\n" +
        "1234567890,ana@asu.edu,Ana & Ben,Y,2,Fall 2027\r\n" +
        ",ben@asu.edu,Ana & Ben,N,2,Fall 2027\r\n",
    );
  });
});

describe("parseMapping", () => {
  it("falls back to the default for junk", () => {
    expect(parseMapping(null)).toEqual(DEFAULT_MAPPING);
    expect(parseMapping([{ field: "nope", header: "x" }])).toEqual(DEFAULT_MAPPING);
  });

  it("keeps known fields once, cleans headers, and defaults blank ones", () => {
    expect(
      parseMapping([
        { field: "email", header: ' Email,\n"Primary" ' },
        { field: "email", header: "dupe" },
        { field: "groupSize", header: "" },
      ]),
    ).toEqual([
      { field: "email", header: "Email   Primary" },
      { field: "groupSize", header: "Group size" },
    ]);
  });
});
