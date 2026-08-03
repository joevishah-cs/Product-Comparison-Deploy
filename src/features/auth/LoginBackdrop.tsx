/**
 * Static brand gradient for the sign-in panel.
 *
 * Deliberately motionless — the wave field, light sweep and photograph layers
 * were removed so the panel is purely a gradient surface. Depth comes from three
 * quiet, non-animated layers instead:
 *
 *   1. the brand gradient, deepening toward the bottom-left so the headline
 *      always sits on the darkest part of the panel
 *   2. two soft oversized circles that catch the light, very low contrast
 *   3. dot grids in opposite corners
 *
 * Decorative only: `aria-hidden` and pointer-transparent.
 */
export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 1. Brand gradient — bright azure at the top-right easing to deep blue at
             the bottom-left, which is where the copy sits. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(215deg, #35b4f2 0%, #0da2e8 11%, #0097e0 22%, #0b6faf 40%, #0a4f83 58%, #073b66 78%, #052c4d 100%)",
        }}
      />

      {/* Radial lift in the top-right corner so the gradient reads as lit rather
          than as a flat ramp. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(34rem 26rem at 108% -6%, rgba(120,215,255,0.45), transparent 68%), radial-gradient(40rem 40rem at 0% 100%, rgba(3,28,52,0.6), transparent 62%)",
        }}
      />

      {/* 2. Soft oversized circles */}
      <div className="absolute -right-32 -top-40 size-[38rem] rounded-full bg-white/[0.07]" />
      <div className="absolute -bottom-56 -left-40 size-[40rem] rounded-full bg-white/[0.05]" />
      <div className="absolute -right-56 bottom-[-18rem] size-[34rem] rounded-full bg-navy-950/15" />

      {/* 3. Dot grids in opposite corners, as in the reference */}
      <div
        className="absolute left-8 top-8 h-28 w-40 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.55) 1.5px, transparent 1.6px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        className="absolute bottom-10 right-10 h-32 w-44 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.45) 1.5px, transparent 1.6px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Gentle darkening behind the copy column keeps small text well clear of
          the WCAG contrast floor wherever the gradient is at its brightest. */}
      <div className="absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-navy-950/70 via-navy-950/48 to-transparent" />
    </div>
  );
}
