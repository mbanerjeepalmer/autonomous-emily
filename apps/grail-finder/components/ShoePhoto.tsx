// Placeholder "photos" drawn in SVG so the prototype has no image assets.
// Replace with <img src={photo.url}> once listings come from real sources.

import type { PhotoKind, Sketch } from "@/lib/types";

const LOW = "M28,100 C24,86 26,70 34,62 C44,56 60,58 74,60 C92,56 104,52 118,54 C146,58 170,72 182,86 C186,92 186,98 182,100 Z";
const UPPERS: Record<Sketch["shape"], string> = {
  moc: LOW,
  derby: LOW,
  plain: LOW,
  patchwork: LOW,
  runner: "M30,100 C26,88 28,76 36,68 C48,62 62,64 76,64 C96,58 110,56 124,58 C150,62 172,74 184,88 C188,94 186,99 182,100 Z",
  boot: "M34,100 L36,22 C60,18 80,18 96,22 L100,58 C130,60 160,70 180,84 C186,90 186,98 182,100 Z",
  hightop: "M30,100 L34,36 C52,30 76,30 92,36 L104,58 C134,60 162,70 180,84 C186,90 186,98 182,100 Z",
};

function SideView({ s, uid }: { s: Sketch; uid: string }) {
  const soleColor = s.sole === "cup" ? "#f2f2ee" : s.sole === "vibram" || s.sole === "lug" ? "#2a2724" : s.sole === "waffle" ? "#e9e3d6" : "#3a332d";
  const soleH = s.sole === "cup" ? 14 : s.sole === "flat" ? 6 : 10;
  return (
    <g>
      <ellipse cx="104" cy={104 + soleH} rx="84" ry="5" fill="#000" opacity="0.12" />
      <clipPath id={`up-${uid}`}>
        <path d={UPPERS[s.shape]} />
      </clipPath>
      <path d={UPPERS[s.shape]} fill={s.color} />
      {s.shape === "patchwork" && (
        <g clipPath={`url(#up-${uid})`}>
          <rect x="20" y="40" width="46" height="70" fill={s.accent} opacity="0.35" />
          <rect x="66" y="40" width="34" height="30" fill="#5a6f99" />
          <rect x="100" y="40" width="40" height="36" fill="#1d2a47" />
          <rect x="140" y="60" width="50" height="50" fill="#8a6d52" opacity="0.6" />
          {[52, 64, 76, 88].map((y) => (
            <line key={y} x1="20" x2="190" y1={y} y2={y} stroke={s.accent} strokeWidth="1.2" strokeDasharray="3 3" />
          ))}
        </g>
      )}
      {s.shape === "moc" && (
        <g>
          <path d="M96,66 C116,60 150,68 174,84" fill="none" stroke={s.accent} strokeWidth="1.6" strokeDasharray="3 2" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={100 + i * 5} y1={64 + i * 0.6} x2={98 + i * 5} y2={80 + i * 0.6} stroke={s.accent} strokeWidth="1.6" />
          ))}
        </g>
      )}
      {s.shape === "derby" && (
        <g>
          <path d="M84,62 C96,56 108,54 120,56 L116,72 C104,72 94,72 88,74 Z" fill={s.accent} stroke="#000" strokeOpacity="0.3" />
          {[0, 1, 2].map((i) => (
            <line key={i} x1={92 + i * 8} y1={60 - i} x2={96 + i * 8} y2={72 - i} stroke="#bbb" strokeWidth="1.2" />
          ))}
        </g>
      )}
      {s.shape === "runner" && <path d="M30,100 C28,88 30,80 36,74 L66,80 L62,100 Z" fill={s.accent} />}
      {s.shape === "boot" && (
        <g>
          <line x1="90" y1="26" x2="94" y2="92" stroke={s.accent} strokeWidth="2.2" strokeDasharray="2 1.5" />
          <rect x="86" y="24" width="7" height="10" rx="1.5" fill="#9a9a9a" />
        </g>
      )}
      {s.shape === "hightop" && (
        <g stroke={s.accent} strokeWidth="5" fill="none" opacity="0.9">
          <path d="M44,40 C60,56 80,62 100,60" />
          <path d="M40,64 C70,70 100,72 126,64" />
        </g>
      )}
      <path d={`M22,100 L186,100 C188,${100 + soleH * 0.6} 184,${100 + soleH} 176,${100 + soleH} L30,${100 + soleH} C24,${100 + soleH} 20,${100 + soleH * 0.6} 22,100 Z`} fill={soleColor} />
      {(s.sole === "vibram" || s.sole === "lug") &&
        Array.from({ length: 14 }).map((_, i) => <rect key={i} x={30 + i * 11} y={100 + soleH - 3} width="6" height="3" fill="#000" opacity="0.4" />)}
    </g>
  );
}

function SoleView({ s, uid }: { s: Sketch; uid: string }) {
  const outline = "M100,10 C136,10 146,44 140,70 C136,96 130,120 100,122 C70,120 64,96 60,70 C54,44 64,10 100,10 Z";
  const base = s.sole === "cup" ? "#ececec" : s.sole === "waffle" ? "#e2dccd" : "#2b2825";
  const mark = s.sole === "cup" || s.sole === "waffle" ? "#9c978c" : "#55504a";
  const pattern = [];
  if (s.sole === "vibram" || s.sole === "lug") {
    for (let y = 16; y < 122; y += 9)
      for (let x = 56; x < 146; x += 12) pattern.push(<path key={`${x}-${y}`} d={`M${x},${y} l5,4 l-5,4`} stroke={mark} strokeWidth="2.4" fill="none" />);
  } else if (s.sole === "waffle") {
    for (let y = 16; y < 122; y += 8) for (let x = 58; x < 146; x += 8) pattern.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={mark} />);
  } else {
    for (let y = 18; y < 122; y += 6) pattern.push(<line key={y} x1="50" x2="150" y1={y} y2={y + 4} stroke={mark} strokeWidth="1.4" />);
  }
  return (
    <g>
      <clipPath id={`sole-${uid}`}>
        <path d={outline} />
      </clipPath>
      <path d={outline} fill={base} />
      <g clipPath={`url(#sole-${uid})`}>{pattern}</g>
    </g>
  );
}

function TagView({ s }: { s: Sketch }) {
  const lines = s.tagLines ?? [];
  return (
    <g>
      <rect x="0" y="0" width="200" height="130" fill={s.color} opacity="0.85" />
      <g transform="rotate(-4 100 65)">
        <rect x="34" y="28" width="132" height="74" rx="3" fill="#f5f0e4" stroke="#c9bfa8" />
        {lines.map((l, i) => (
          <text key={i} x="100" y={50 + i * 18} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize={i === 0 ? 13 : 10} fontWeight={i === 0 ? 700 : 500} fill="#2a2620">
            {l}
          </text>
        ))}
      </g>
    </g>
  );
}

function DetailView({ s, uid }: { s: Sketch; uid: string }) {
  return (
    <g>
      <clipPath id={`det-${uid}`}>
        <circle cx="100" cy="65" r="56" />
      </clipPath>
      <g clipPath={`url(#det-${uid})`}>
        <rect x="0" y="0" width="200" height="130" fill={s.color} />
        {s.shape === "boot" ? (
          <g>
            <rect x="92" y="0" width="16" height="130" fill="#555" />
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={i} x={i % 2 ? 94 : 100} y={i * 8} width="6" height="5" fill={s.accent} />
            ))}
            <rect x="88" y="52" width="24" height="30" rx="3" fill={s.accent} />
          </g>
        ) : (
          Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1="30" x2="170" y1={20 + i * 11} y2={20 + i * 11} stroke={s.accent} strokeWidth="2" strokeDasharray="6 4" />
          ))
        )}
      </g>
      <circle cx="100" cy="65" r="56" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
    </g>
  );
}

export function ShoePhoto({ sketch, kind, uid, className }: { sketch: Sketch; kind: PhotoKind; uid: string; className?: string }) {
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, "_");
  return (
    <svg viewBox="0 0 200 130" className={className ?? "photo"} role="img" aria-label={`${kind} photo`}>
      <rect width="200" height="130" fill={sketch.bg ?? "#eceae6"} />
      {kind === "side" && <SideView s={sketch} uid={id} />}
      {kind === "sole" && <SoleView s={sketch} uid={id} />}
      {kind === "tag" && <TagView s={sketch} />}
      {kind === "detail" && <DetailView s={sketch} uid={id} />}
    </svg>
  );
}
