/**
 * Reusable TIA brand logo — renders "TIA" with:
 *   T, A → solid blue (#00020A)
 *   I    → cyan-to-green gradient
 *
 * Props:
 *   size     — "sm" | "md" | "lg" (text size)
 *   variant  — "dark" (default, blue on white) | "light" (white T/A on dark backgrounds)
 *   withDot  — adds the small brand dot after "A"
 *   className — extra classes on the wrapper span
 */

interface TiaLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  withDot?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-4xl",
} as const;

const dotSizeMap = {
  sm: "h-[4px] w-[4px]",
  md: "h-[5px] w-[5px]",
  lg: "h-[5px] w-[5px]",
} as const;

export function TiaLogo({
  size = "md",
  variant = "dark",
  withDot = false,
  className = "",
}: TiaLogoProps) {
  const solidColor = variant === "dark" ? "#00020A" : "#FFFFFF";

  return (
    <span
      className={`inline-flex items-baseline gap-[1px] font-extrabold tracking-[-0.03em] ${sizeMap[size]} ${className}`}
    >
      <span style={{ color: solidColor }}>T</span>
      <span
        style={{
          background: "linear-gradient(135deg, #3B82F6, #2DC653)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        I
      </span>
      <span style={{ color: solidColor }}>A</span>
      {withDot && (
        <span
          className={`mb-1 inline-block rounded-full ${dotSizeMap[size]}`}
          style={{
            background: "linear-gradient(135deg, #3B82F6, #2DC653)",
          }}
        />
      )}
    </span>
  );
}
