type MascotVariant = "wave" | "celebrate" | "still";

export function Mascot({
  size = 80,
  animated = true,
  variant = "wave",
  className = "",
}: {
  size?: number;
  animated?: boolean;
  variant?: MascotVariant;
  className?: string;
}) {
  const showMotion = animated && variant !== "still";

  return (
    <span
      className={`mascot-root relative inline-block overflow-visible bg-transparent ${className}`}
      style={{ width: size, height: size }}
      data-mascot-animated={showMotion ? "true" : "false"}
    >
      <img
        src="/longyu-mascot.png"
        alt="Mascote Longyu"
        draggable={false}
        data-testid="mascot-body"
        className="relative z-[1] h-full w-full select-none object-contain"
      />
      {showMotion && (
        <img
          src="/longyu-eyes-closed.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
          data-testid="mascot-eyes-closed"
          className="mascot-eye-blink pointer-events-none absolute inset-0 z-[2] h-full w-full select-none object-contain"
        />
      )}
    </span>
  );
}
