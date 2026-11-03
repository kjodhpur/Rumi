/** Agreement rules, pure so they're unit-tested and shared by server and UI. */

export interface SectionState {
  key: string;
  acceptedBy: string[];
}

export function sectionAccepted(section: SectionState, memberIds: string[]) {
  return memberIds.every((id) => section.acceptedBy.includes(id));
}

export function readyToSign(sections: SectionState[], memberIds: string[]) {
  return sections.length > 0 && sections.every((s) => sectionAccepted(s, memberIds));
}

/** Editing makes the editor the only one who has accepted the new text. */
export function afterEdit(editorId: string): string[] {
  return [editorId];
}

export function afterAccept(acceptedBy: string[], userId: string): string[] {
  return acceptedBy.includes(userId) ? acceptedBy : [...acceptedBy, userId];
}

/** The agreement no longer describes this group when members have changed. */
export function membersMatch(agreementMembers: string[], groupMembers: string[]) {
  return [...agreementMembers].sort().join(",") === [...groupMembers].sort().join(",");
}

/** A typed signature must match the signer's first name at least, case-insensitively. */
export function signatureMatches(typed: string, firstName: string) {
  const t = typed.trim().toLowerCase();
  return t.length >= 2 && t.split(/\s+/)[0] === firstName.trim().toLowerCase();
}
