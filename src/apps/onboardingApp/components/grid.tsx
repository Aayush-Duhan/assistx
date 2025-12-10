import { useEffect, useMemo, useRef, useState } from "react";

interface GridProps {
  spacing?: number;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
}

export const Grid = ({
  spacing = 30,
  strokeColor = "#E0E3E9",
  strokeWidth = 1,
  className = "",
}: GridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  const verticalLines = useMemo(
    () => Math.ceil(dimensions.width / spacing),
    [dimensions.width, spacing],
  );
  const horizontalLines = useMemo(
    () => Math.ceil(dimensions.height / spacing),
    [dimensions.height, spacing],
  );

  return (
    <div ref={containerRef} className={`absolute inset-0 ${className}`}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none"
      >
        {/* Vertical lines */}
        {Array.from({ length: verticalLines + 1 }).map((_, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: Placeholders, items not changing positions
            key={`v-${i}`}
            x1={i * spacing}
            y1={0}
            x2={i * spacing}
            y2={dimensions.height}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        ))}

        {/* Horizontal lines */}
        {Array.from({ length: horizontalLines + 1 }).map((_, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: Placeholders, items not changing positions
            key={`h-${i}`}
            x1={0}
            y1={i * spacing}
            x2={dimensions.width}
            y2={i * spacing}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        ))}
      </svg>
    </div>
  );
};
