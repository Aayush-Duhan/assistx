import { cn } from "@/lib/utils";

interface HeadlessButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  onMouseUp?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function HeadlessButton({ 
  className, 
  onMouseUp, 
  onMouseLeave, 
  ...props 
}: HeadlessButtonProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={cn("focus:outline-none", className)}
      onMouseUp={(event) => {
        event.currentTarget.blur();
        onMouseUp?.(event);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.blur();
        onMouseLeave?.(event);
      }}
      {...props}
    />
  );
}