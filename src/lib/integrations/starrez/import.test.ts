import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { DEFAULT_ASSIGNMENT_MAPPING, parseAssignmentMapping, planImport, validateAssignmentRows } from "./import";

const file = `﻿Student ID,E-mail,Hall,Room,Bed,Term
1001,a@asu.edu,Tooker House,214,A,Fall 2026
1002,B@ASU.EDU,Tooker House,214,B,Fall 2026
,c@asu.edu,Manzanita,1101,,Fall 2026
1004,not-an-email,Tooker House,215,A,Fall 2026
1005,e@asu.edu,,300,A,Fall 2026
1006,f@asu.edu,Tooker House,216,A,Spring 2027
=CMD(),g@asu.edu,Tooker House,217,A,Fall 2026
1001,a@asu.edu,Tooker House,214,A,Fall 2026`;

describe("assignment import validation", () => {
  it("validates row by row with line numbers and finds columns by alias", () => {
    const r = validateAssignmentRows(parseCsv(file), DEFAULT_ASSIGNMENT_MAPPING, { terms: ["Fall 2026"], today: "2026-08-15" });
    expect(r.missingColumns).toEqual([]);
    expect(r.rows.map((x) => x.line)).toEqual([2, 3, 4, 9]);
    expect(r.rows[1]?.email).toBe("b@asu.edu");
    expect(r.errors).toEqual([
      { line: 5, message: "That email doesn't look right." },
      { line: 6, message: "Building is missing." },
      { line: 7, message: 'Term "Spring 2027" isn\'t this term.' },
      { line: 8, message: "Student ID can only have letters, numbers and dashes." },
    ]);
  });

  it("says which columns are missing", () => {
    expect(validateAssignmentRows(parseCsv("Name,Room\nx,1"), DEFAULT_ASSIGNMENT_MAPPING).missingColumns).toEqual(["building", "studentId", "email"]);
  });

  it("falls back to defaults for a bad stored mapping", () => {
    expect(parseAssignmentMapping({ building: "Hall", room: 3 }).room).toBe("Room");
    expect(parseAssignmentMapping({ building: "Hall" }).building).toBe("Hall");
  });
});

describe("import plan", () => {
  const { rows } = validateAssignmentRows(parseCsv(file), DEFAULT_ASSIGNMENT_MAPPING, { terms: ["Fall 2026"], today: "2026-08-15" });
  const lookup = { byStudentId: new Map([["1001", "u1"], ["1002", "u2"]]), byEmail: new Map([["c@asu.edu", "u3"]]) };

  it("inserts new students, reports unknown ones and duplicates, never creates accounts", () => {
    const plan = planImport(rows, lookup, []);
    expect(plan.inserts.map((i) => [i.userId, i.externalRef])).toEqual([["u1", "1001"], ["u2", "1002"], ["u3", "email:c@asu.edu"]]);
    expect(plan.duplicates).toEqual([{ line: 9, message: "Same student as line 2. Skipped." }]);
    expect(plan.unknown).toEqual([]);
  });

  it("is idempotent: importing the same file again changes nothing", () => {
    const existing = [
      { id: "a1", userId: "u1", building: "Tooker House", room: "214", bed: "A", externalRef: "1001" },
      { id: "a2", userId: "u2", building: "Tooker House", room: "214", bed: "B", externalRef: "1002" },
      { id: "a3", userId: "u3", building: "Manzanita", room: "1101", bed: null, externalRef: "email:c@asu.edu" },
    ];
    const plan = planImport(rows, lookup, existing);
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([]);
    expect(plan.unchanged).toBe(3);
  });

  it("turns a changed room into an update", () => {
    const plan = planImport(rows, lookup, [{ id: "a1", userId: "u1", building: "Tooker House", room: "999", bed: "A", externalRef: "1001" }]);
    expect(plan.updates.map((u) => [u.userId, u.assignmentId, u.room])).toEqual([["u1", "a1", "214"]]);
  });

  it("reports students who aren't on Rumi", () => {
    expect(planImport(rows, { byStudentId: new Map(), byEmail: new Map() }, []).unknown).toHaveLength(4);
  });
});
