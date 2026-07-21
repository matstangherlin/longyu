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
  const base = showMotion ? "/longyu-body.png" : "/longyu-mascot.png";
  const handMotion = variant === "celebrate" ? "mascot-hand-celebrate" : "mascot-hand-wave";

  return (
    <span
      className={`mascot-root relative isolate inline-block overflow-visible bg-transparent ${className}`}
      style={{ width: size, height: size }}
      data-mascot-animated={showMotion ? "true" : "false"}
    >
      {showMotion && (
        <img
          src="/longyu-hand-wave.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          data-testid="mascot-hand"
          className={`mascot-hand-layer pointer-events-none absolute left-[8.6%] top-[40.7%] z-0 h-[22.1%] w-[20%] select-none object-contain ${handMotion}`}
        />
      )}
      <img
        src={base}
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
