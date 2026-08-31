"use client";

// Mood as a single friendly face, worst (-2) to best (+2). Hand-drawn SVG so
// there is nothing to license or bundle; the face is isolated here so it can be
// swapped for a Lottie animation later without touching the form.

const FILLS: Record<number, string> = {
  [-2]: "#b9c2d0",
  [-1]: "#c7cfdc",
  0: "#f2d06b",
  1: "#f6c445",
  2: "#f7b733",
};

// Mouth path per mood value, drawn in a 100x100 box.
const MOUTHS: Record<number, string> = {
  [-2]: "M34 68 Q50 54 66 68",
  [-1]: "M34 64 Q50 56 66 64",
  0: "M36 62 H64",
  1: "M34 58 Q50 70 66 58",
  2: "M32 56 Q50 78 68 56",
};

const BROWS: Record<number, string> = {
  [-2]: "M30 34 L44 40 M70 34 L56 40",
  [-1]: "M30 36 L44 40 M70 36 L56 40",
  0: "",
  1: "",
  2: "",
};

export default function MoodFace({ value, size = 96 }: { value: number; size?: number }) {
  const v = Math.max(-2, Math.min(2, value));
  return (
    <svg
      key={v}
      className="mood-face"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="44" style={{ fill: FILLS[v], transition: "fill .25s ease" }} />
      <circle cx="38" cy="44" r="5" fill="#2f3745" />
      <circle cx="62" cy="44" r="5" fill="#2f3745" />
      {BROWS[v] && <path d={BROWS[v]} stroke="#2f3745" strokeWidth="3" strokeLinecap="round" fill="none" />}
      <path d={MOUTHS[v]} stroke="#2f3745" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
