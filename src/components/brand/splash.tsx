import { WORDMARK } from "./glyphs";

/**
 * Launch splash for the installed app: the wordmark's letters rise out of a
 * mask one after another, then a hairline sweeps until the page is
 * interactive. Pure CSS so it plays before any JavaScript loads; it only
 * appears in standalone (home-screen) mode and fades once React hydrates.
 */
export function LaunchSplash() {
  const height = 44;
  const width = (WORDMARK.width / WORDMARK.height) * height;
  return (
    <div className="launch-splash" aria-hidden>
      <svg viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`} width={width} height={height} className="overflow-hidden fill-current">
        {WORDMARK.letters.map((d, i) => (
          <path key={i} d={d} className="launch-splash-letter" style={{ animationDelay: `${50 + i * 60}ms` }} />
        ))}
      </svg>
      <span className="launch-splash-track">
        <span className="launch-splash-bar" />
      </span>
    </div>
  );
}
