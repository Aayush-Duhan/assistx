import { type SVGProps, useId } from "react";
import { twMerge } from "tailwind-merge";

export default function HintHighlight() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Ripple />
      <Ripple offset={1} />
      <Ripple offset={2} />
    </div>
  );
}

function Ripple({
  className,
  offset = 0,
  style,
  ...props
}: { offset?: number } & SVGProps<SVGSVGElement>) {
  const id = useId();
  const paint0Id = `paint0_radial_${id}`;
  const paint1Id = `paint1_radial_${id}`;
  const paint2Id = `paint2_radial_${id}`;
  const paint3Id = `paint3_radial_${id}`;

  return (
    <svg
      width="97"
      height="97"
      viewBox="0 0 97 97"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={twMerge("absolute inset-0 size-full", className)}
      style={{
        animation: "ripple 3s ease-out forwards infinite",
        animationDelay: `${offset}s`,
        ...style,
      }}
      {...props}
    >
      <circle cx="48.5992" cy="48.6002" r="47.916" fill={`url(#${paint0Id})`} fillOpacity="0.7" />
      <circle
        cx="48.5992"
        cy="48.6002"
        r="47.916"
        fill={`url(#${paint1Id})`}
        style={{ mixBlendMode: "overlay" }}
      />
      <circle
        cx="48.5992"
        cy="48.6002"
        r="47.916"
        stroke={`url(#${paint2Id})`}
        strokeWidth="0.968"
      />
      <circle
        cx="48.5992"
        cy="48.6002"
        r="47.916"
        stroke={`url(#${paint3Id})`}
        strokeWidth="0.968"
        style={{ mixBlendMode: "overlay" }}
      />
      <defs>
        <radialGradient
          id={paint0Id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(9.61327 16.9154) rotate(41.4337) scale(110.986)"
        >
          <stop stopColor="#497EE9" />
          <stop offset="1" stopColor="#648BEC" />
        </radialGradient>
        <radialGradient
          id={paint1Id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(63.7134 79.3681) rotate(-105) scale(98.5286)"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={paint2Id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(9.61327 16.9154) rotate(41.4337) scale(110.986)"
        >
          <stop stopColor="#497EE9" />
          <stop offset="1" stopColor="#648BEC" />
        </radialGradient>
        <radialGradient
          id={paint3Id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(63.7134 79.3681) rotate(-105) scale(98.5286)"
        >
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
