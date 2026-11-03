import { ImageResponse } from "next/og";
import { buildMatchCard, findMatchShare } from "@/lib/share/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// next/og can't read CSS variables; these are the light-theme token values from globals.css.
const BG = "#f7f5f0";
const INK = "#171614";
const INK_2 = "#5e5a53";
const SURFACE = "#ffffff";
const ACCENT = "#e8542a";

/** The share card as an image. `id` is the share token; anything not live is a 404. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const record = await findMatchShare(params.id);
  const card = record?.ready ? await buildMatchCard(record) : null;
  if (!card) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, color: INK, padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>rumi</div>
          <div style={{ display: "flex", fontSize: 22, color: INK_2 }}>Roommate match</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex" }}>
            {card.initials.map((initial, i) => (
              <div key={i} style={{ width: 132, height: 132, borderRadius: 66, background: SURFACE, border: `4px solid ${BG}`, marginLeft: i ? -28 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 600 }}>
                {initial}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {card.firstNames[0]} & {card.firstNames[1]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 16, gap: 8 }}>
              {card.reasons.map((reason) => (
                <div key={reason} style={{ display: "flex", alignItems: "center", fontSize: 26, color: INK_2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: ACCENT, marginRight: 14 }} />
                  {reason}
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: 200, height: 200, borderRadius: 100, border: `14px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, fontWeight: 700 }}>
            {card.score}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: INK_2 }}>
          <span>Free for students</span>
          <span>rumimatch.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "private, no-store" } },
  );
}
