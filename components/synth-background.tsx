'use client';

/**
 * SynthBackground — the global night-city atmosphere layer.
 * Fixed, pointer-events-none, sits behind everything (z-0).
 * Pure CSS (stars, sun, perspective grid, scanlines) — zero JS work
 * after mount, and all animations pause under prefers-reduced-motion.
 */

export function SynthBackground() {
  return (
    <div
      aria-hidden
      className="synth-scanlines fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      {/* Starfield (upper sky) */}
      <div className="synth-stars absolute inset-x-0 top-0 h-1/2" />

      {/* Retro sun sinking behind the horizon */}
      <div className="synth-sun absolute left-1/2 -translate-x-1/2 bottom-[14%] w-[34rem] h-[34rem] max-w-[80vw] max-h-[80vw] opacity-25" />

      {/* Perspective laser grid (lower third) */}
      <div className="synth-grid absolute inset-x-[-20%] bottom-[-6%] h-[42%] opacity-60" />

      {/* Horizon glow line */}
      <div className="absolute inset-x-0 bottom-[38%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}

/**
 * ImageBanner — a tab header banner that layers one of the user's
 * wallpapers over a gradient fallback. If the image file hasn't been
 * dropped into public/images/ yet, the gradient alone still looks right.
 */
export function ImageBanner({
  src,
  children,
  className = '',
}: {
  src: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/20 ${className}`}
    >
      {/* Gradient fallback layer (always present) */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-primary/25" />
      {/* User-provided artwork layer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}
