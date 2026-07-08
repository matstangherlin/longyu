import type { ComponentProps } from "react";
import { IconChat } from "../ui/Icon";
import { buildFeedbackMailto, type FeedbackContext } from "../../lib/feedback";

type Variant = "primary" | "ghost" | "soft" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong active:scale-[.98] shadow-card",
  ghost: "text-ink-soft hover:bg-surface-2 active:scale-[.98]",
  soft: "bg-accent-soft text-accent hover:brightness-95 active:scale-[.98]",
  outline: "border border-line bg-surface text-ink hover:bg-surface-2 active:scale-[.98]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-4 text-[15px] rounded-xl",
  lg: "h-12 px-5 text-base rounded-2xl",
};

interface FeedbackButtonProps extends Omit<ComponentProps<"a">, "href"> {
  context?: FeedbackContext;
  variant?: Variant;
  size?: Size;
  showIcon?: boolean;
  label?: string;
}

export function FeedbackButton({
  context,
  variant = "primary",
  size = "md",
  showIcon = true,
  label = "Enviar feedback",
  className,
  ...rest
}: FeedbackButtonProps) {
  return (
    <a
      href={buildFeedbackMailto(context)}
      className={[
        "inline-flex select-none items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        VARIANTS[variant],
        SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {showIcon && <IconChat width={17} height={17} />}
      {label}
    </a>
  );
}
