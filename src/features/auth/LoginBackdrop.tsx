/** Rising motes: fixed offsets and durations so the field looks scattered
 *  without needing randomness (which would change on every render). */
const MOTES = [
  { left: "12%", size: 5, delay: "0s", duration: "19s", opacity: 0.5 },
  { left: "26%", size: 3, delay: "-6s", duration: "24s", opacity: 0.4 },
  { left: "41%", size: 6, delay: "-11s", duration: "21s", opacity: 0.45 },
  { left: "58%", size: 3, delay: "-3s", duration: "26s", opacity: 0.35 },
  { left: "72%", size: 5, delay: "-15s", duration: "20s", opacity: 0.5 },
  { left: "86%", size: 4, delay: "-8s", duration: "28s", opacity: 0.4 },
  { left: "34%", size: 2, delay: "-19s", duration: "23s", opacity: 0.3 },
  { left: "66%", size: 2, delay: "-13s", duration: "30s", opacity: 0.3 },
];

/**
 * Ambient backdrop for the sign-in panel: a deep brand gradient with slow,
 * low-contrast motion layered over it.
 *
 *   1. base gradient — deepest through the centre, where the copy sits
 *   2. an aurora bloom easing around the panel on a 28s cycle
 *   3. oversized soft circles breathing on 24s / 32s cycles
 *   4. rising motes
 *   5. static dot grids in opposite corners
 *   6. a centred vignette that holds text contrast steady while everything moves
 *
 * Every animation is transform/opacity only, so the whole scene stays on the
 * compositor. The bright layers are deliberately confined to the panel's edges:
 * the copy sits in the middle, and contrast was measured across the animation
 * cycle rather than at a single frame.
 *
 * Decorative only: `aria-hidden` and pointer-transparent. The global
 * reduced-motion rule freezes all of it.
 */
export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 1. Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(200deg, #2aa9ec 0%, #0d92d4 14%, #0b6faf 32%, #0a4f83 52%, #08406f 72%, #062f52 100%)",
        }}
      />

      {/* 2. Aurora bloom — the main sense of life, kept to the panel's corners */}
      <div className="absolute -right-1/4 -top-1/3 h-[42rem] w-[42rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(140,220,255,0.5),transparent_66%)] blur-2xl" />
      <div className="absolute -bottom-1/3 -left-1/4 h-[38rem] w-[38rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(0,151,224,0.4),transparent_68%)] blur-2xl [animation-delay:-14s] [animation-duration:34s]" />

      {/* 3. Breathing soft circles */}
      <div className="absolute -right-28 -top-36 size-[36rem] animate-float-slow rounded-full bg-white/[0.07]" />
      <div className="absolute -bottom-52 -left-36 size-[38rem] animate-float-slower rounded-full bg-white/[0.05]" />
      <div className="absolute -right-52 bottom-[-16rem] size-[32rem] animate-float-slow rounded-full bg-navy-950/20 [animation-delay:-9s] [animation-duration:30s]" />

      {/* 4. Rising motes */}
      {MOTES.map((m) => (
        <span
          key={`${m.left}-${m.delay}`}
          className="absolute bottom-[-8%] animate-rise rounded-full bg-white"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
        />
      ))}

      {/* 5. Dot grids */}
      <div
        className="absolute left-8 top-8 h-28 w-40 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1.5px, transparent 1.6px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        className="absolute bottom-10 right-10 h-32 w-44 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.42) 1.5px, transparent 1.6px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* 6. Centred vignette — keeps the copy's contrast constant no matter where
             the aurora happens to be in its cycle. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 58% at 50% 50%, rgba(4,26,46,0.74) 0%, rgba(4,26,46,0.54) 45%, rgba(4,26,46,0.14) 78%, transparent 100%)",
        }}
      />
    </div>
  );
}
