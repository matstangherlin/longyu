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
      className={`mascot-root relative inline-block overflow-visible bg-transparent ${className}`}
      style={{ width: size, height: size }}
      data-mascot-animated={showMotion ? "true" : "false"}
    >
      <img
        src={base}
        alt="Mascote Longyu"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
      {showMotion && (
        <>
          <span className="mascot-eye-blink mascot-eye-left" data-testid="mascot-eyelid" aria-hidden="true" />
          <span className="mascot-eye-blink mascot-eye-right" data-testid="mascot-eyelid" aria-hidden="true" />
          <img
            src="/longyu-hand-wave.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none absolute left-[8.6%] top-[40.7%] h-[22.1%] w-[20%] select-none object-contain ${handMotion}`}
          />
        </>
      )}
    </span>
  );
}
