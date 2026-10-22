import type { MutualConnection, MutualSummary, SocialLink } from "./types";
import { mutualTrustBonus } from "./matching";

type EdgeRow = {
  user_a: string;
  user_b: string;
  source: string;
  strength: number;
  meta: Record<string, unknown> | null;
};

type OrgRow = { org_id: string; name: string };

/**
 * Build "How you're connected" between viewer and target.
 * No Instagram scraping — handles + asserted edges + Rumi graph.
 */
export function buildMutualSummary(input: {
  viewerId: string;
  targetId: string;
  edges: EdgeRow[];
  viewerLinks: Pick<SocialLink, "provider" | "handle">[];
  targetLinks: Pick<SocialLink, "provider" | "handle">[];
  viewerOrgs: OrgRow[];
  targetOrgs: OrgRow[];
  /** Accepted-intro friends of viewer that also accepted-intro with target */
  mutualFriends: Array<{ id: string; name: string; photoUrl?: string | null }>;
}): MutualSummary {
  const connections: MutualConnection[] = [];

  for (const friend of input.mutualFriends) {
    connections.push({
      kind: "rumi_mutual",
      label: `Also connected with ${friend.name}`,
      personId: friend.id,
      personName: friend.name,
      photoUrl: friend.photoUrl ?? null,
    });
  }

  for (const edge of input.edges) {
    if (edge.source === "org" && edge.meta?.org) {
      connections.push({
        kind: "org",
        label: `Same org: ${String(edge.meta.org)}`,
      });
    } else if (edge.source === "group_mate") {
      connections.push({ kind: "group_mate", label: "Shared a Rumi group" });
    } else if (edge.source === "intro_accepted") {
      connections.push({ kind: "intro_accepted", label: "Intro accepted" });
    } else if (edge.source === "asserted_social") {
      const provider = edge.meta?.provider ? String(edge.meta.provider) : "social";
      connections.push({
        kind: "asserted_social",
        label: `Shared ${provider} connection`,
      });
    }
  }

  const viewerOrgIds = new Set(input.viewerOrgs.map((o) => o.org_id));
  for (const org of input.targetOrgs) {
    if (viewerOrgIds.has(org.org_id)) {
      const already = connections.some((c) => c.kind === "org" && c.label.includes(org.name));
      if (!already) {
        connections.push({ kind: "org", label: `Same org: ${org.name}` });
      }
    }
  }

  const targetByProvider = new Map(
    input.targetLinks.map((l) => [`${l.provider}:${l.handle.toLowerCase()}`, l]),
  );
  for (const link of input.viewerLinks) {
    const key = `${link.provider}:${link.handle.toLowerCase()}`;
    // Same provider + identical handle is the same person; look for asserted overlaps via edges only.
    // Soft signal: same provider presence (both have Instagram) is not enough — require matching
    // asserted social edge meta or identical follow handle in meta.
    void targetByProvider;
    void key;
  }

  // Handle overlap: if both list the same third-party handle under meta.shared_handle on an edge
  for (const edge of input.edges) {
    if (edge.source === "asserted_social" && edge.meta?.shared_handle) {
      connections.push({
        kind: "handle_overlap",
        label: `@${String(edge.meta.shared_handle)} overlap`,
      });
    }
  }

  // Dedupe by label
  const seen = new Set<string>();
  const unique = connections.filter((c) => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });

  const count = unique.length;
  return {
    count,
    connections: unique,
    trustBonus: mutualTrustBonus(count),
  };
}

export function socialUrl(provider: SocialLink["provider"], handle: string): string {
  const h = handle.replace(/^@/, "").trim();
  switch (provider) {
    case "instagram":
      return `https://instagram.com/${h}`;
    case "linkedin":
      return `https://linkedin.com/in/${h}`;
    case "tiktok":
      return `https://tiktok.com/@${h}`;
    case "x":
      return `https://x.com/${h}`;
    default:
      return `https://${h}`;
  }
}

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}
