import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSafeMatchShareCard, hashShareToken } from "@/lib/share/token";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await Promise.resolve(params);
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const supabase = createAdminClient();

  // Try looking up by id or by token hash
  let query = supabase.from("match_share_tokens").select("*");
  if (id.length === 64) {
    query = query.eq("token_hash", hashShareToken(id));
  } else {
    query = query.eq("id", id);
  }

  const { data: record, error } = await query.maybeSingle();

  if (error || !record) {
    return new Response("Match card not found", { status: 404 });
  }

  // Mutual consent and validity check
  const now = new Date();
  if (
    !record.user_a_consented ||
    !record.user_b_consented ||
    record.revoked_at ||
    new Date(record.expires_at) <= now
  ) {
    return new Response("Match card not available or revoked", { status: 404 });
  }

  // Fetch participants' profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name")
    .in("id", [record.user_a, record.user_b]);

  const profileA = profiles?.find((p) => p.id === record.user_a);
  const profileB = profiles?.find((p) => p.id === record.user_b);

  // Fetch match score
  const { data: matchScore } = await supabase
    .from("match_scores")
    .select("score, reasons")
    .or(
      `and(viewer_id.eq.${record.user_a},candidate_id.eq.${record.user_b}),and(viewer_id.eq.${record.user_b},candidate_id.eq.${record.user_a})`,
    )
    .limit(1)
    .maybeSingle();

  const reasons = Array.isArray(matchScore?.reasons)
    ? (matchScore?.reasons as string[])
    : [];

  const card = buildSafeMatchShareCard({
    nameA: profileA?.first_name,
    nameB: profileB?.first_name,
    score: matchScore?.score ?? 90,
    reasons,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#171614",
          color: "#f7f5f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "56px 64px",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#e8542a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "20px",
                color: "#f7f5f0",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#f7f5f0",
              }}
            >
              Rumi
            </span>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              backgroundColor: "rgba(232, 84, 42, 0.15)",
              color: "#e8542a",
              fontSize: "15px",
              fontWeight: 600,
              border: "1px solid rgba(232, 84, 42, 0.3)",
            }}
          >
            Verified Compatibility
          </div>
        </div>

        {/* Center Match Highlight */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "32px",
            margin: "24px 0",
          }}
        >
          {/* Names and Avatars */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                backgroundColor: "#2a2724",
                border: "3px solid #e8542a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 700,
                color: "#f7f5f0",
              }}
            >
              {card.initials[0]}
            </div>

            <div
              style={{
                fontSize: "30px",
                color: "rgba(247, 245, 240, 0.4)",
                fontWeight: 300,
              }}
            >
              &
            </div>

            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                backgroundColor: "#2a2724",
                border: "3px solid #e8542a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 700,
                color: "#f7f5f0",
              }}
            >
              {card.initials[1]}
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginLeft: "12px" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#f7f5f0",
                }}
              >
                {card.firstNames[0]} & {card.firstNames[1]}
              </div>
              <div
                style={{
                  fontSize: "18px",
                  color: "rgba(247, 245, 240, 0.6)",
                  marginTop: "4px",
                }}
              >
                Roommate Compatibility
              </div>
            </div>
          </div>

          {/* Score Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 28px",
              backgroundColor: "rgba(232, 84, 42, 0.12)",
              borderRadius: "20px",
              border: "2px solid rgba(232, 84, 42, 0.4)",
            }}
          >
            <div
              style={{
                fontSize: "56px",
                fontWeight: 800,
                color: "#e8542a",
                lineHeight: "1",
              }}
            >
              {card.score}%
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "rgba(247, 245, 240, 0.7)",
                marginTop: "6px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Match Score
            </div>
          </div>
        </div>

        {/* Reasons Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            borderRadius: "16px",
            padding: "20px 24px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#e8542a",
              fontWeight: 700,
            }}
          >
            Why they match
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {card.reasons.length > 0 ? (
              card.reasons.map((reason, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "18px",
                    color: "rgba(247, 245, 240, 0.9)",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#e8542a",
                    }}
                  />
                  <span>{reason}</span>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: "18px",
                  color: "rgba(247, 245, 240, 0.9)",
                }}
              >
                Complementary schedules and aligned living habits.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            fontSize: "14px",
            color: "rgba(247, 245, 240, 0.4)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            paddingTop: "16px",
          }}
        >
          <span>Find your college roommate on Rumi</span>
          <span style={{ fontWeight: 600, color: "rgba(247, 245, 240, 0.6)" }}>
            rumi.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
