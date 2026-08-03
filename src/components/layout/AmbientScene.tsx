/** The drifting blurred orbs that sit behind every page, on top of the body
 *  gradient. Purely decorative, never printed, and pointer-transparent so it
 *  cannot intercept clicks. Motion stops under `prefers-reduced-motion`. */
export function AmbientScene() {
  return (
    <div className="no-print pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 left-[8%] size-96 animate-drift rounded-full bg-daikin-200/50 blur-3xl" />
      <div className="absolute right-[-6%] top-1/4 h-[28rem] w-[28rem] animate-drift rounded-full bg-[#b9c9f8]/40 blur-3xl [animation-delay:-7s] [animation-duration:18s]" />
      <div className="absolute bottom-[-10%] left-1/3 size-96 rounded-full bg-white/60 blur-3xl" />
    </div>
  );
}
