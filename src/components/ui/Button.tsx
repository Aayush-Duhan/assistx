import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HeadlessButton } from './HeadlessButton'; // Assuming HeadlessButton is in the same directory or imported correctly

// --- Type Definitions ---

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The color scheme of the button. Defaults to 'dark/zinc'. */
  color?: 'dark/zinc' | 'light' | 'dark/white' | 'dark' | 'white' | 'zinc' | 'blue' | 'plain';
  /** If true, renders with an outline style. */
  outline?: boolean;
  /** If true, renders with a plain, transparent background style. */
  plain?: boolean;
  /** If true, disables all default styles for a fully custom button. */
  custom?: boolean;
  children: ReactNode;
};

// --- Style Definitions ---
// This object maps the button's props to Tailwind CSS classes, including all color variants.

const styles = {
  base: [
    // Base layout and typography
    "relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold",
    // Padding and sizing
    "px-[calc(theme(spacing.4)-1px)] py-[calc(theme(spacing.3)-1px)] sm:px-[calc(theme(spacing.4)-1px)] sm:py-[calc(theme(spacing.2)-1px)] sm:text-sm/6",
    // Focus state
    "focus:outline-hidden data-focus:outline data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500",
    // Disabled state
    "data-disabled:opacity-50",
    // Icon styling
    "*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-[--btn-icon] sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText]",
  ],
  solid: [
    // Solid button base styles
    "border-transparent bg-[--btn-border]",
    "dark:bg-[--btn-bg]",
    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-[--btn-bg]",
    "before:shadow-sm",
    "dark:before:hidden",
    "dark:border-white/5",
    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]",
    "after:shadow-[shadow:inset_0_1px_--theme(color-white/15%)]",
    "data-active:after:bg-[--btn-hover-overlay] data-hover:after:bg-[--btn-hover-overlay]",
    "dark:after:-inset-px dark:after:rounded-lg",
    "data-disabled:before:shadow-none data-disabled:after:shadow-none",
  ],
  outline: [
    // Outline button styles
    "border-zinc-950/10 text-zinc-950 data-active:bg-zinc-950/[2.5%] data-hover:bg-zinc-950/[2.5%]",
    "dark:border-white/15 dark:text-white dark:[--btn-bg:transparent] dark:data-active:bg-white/5 dark:data-hover:bg-white/5",
    // Icon colors for outline
    "[--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]",
  ],
  plain: [
    // Plain button styles
    "border-transparent text-zinc-950 data-active:bg-zinc-950/5 data-hover:bg-zinc-950/5",
    "dark:text-white dark:data-active:bg-white/10 dark:data-hover:bg-white/10",
    // Icon colors for plain
    "[--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]",
  ],
  colors: {
    // Color variants for solid buttons
    'plain': "text-white [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10 dark:text-white dark:[--btn-bg:var(--color-zinc-900)]/40 dark:[--btn-hover-overlay:var(--color-white)]/5 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]",
    'dark/zinc': "text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10 dark:text-white dark:[--btn-bg:var(--color-zinc-600)] dark:[--btn-hover-overlay:var(--color-white)]/5 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]",
    'light': "text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10 [--btn-hover-overlay:var(--color-zinc-950)]/[2.5%] data-active:[--btn-border:var(--color-zinc-950)]/15 data-hover:[--btn-border:var(--color-zinc-950)]/15 dark:text-white dark:[--btn-hover-overlay:var(--color-white)]/5 dark:[--btn-bg:var(--color-zinc-800)] [--btn-icon:var(--color-zinc-500)] data-active:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]",
    'dark/white': "text-white [--btn-bg:var(--color-zinc-900)] [--btn-border:var(--color-zinc-950)]/90 [--btn-hover-overlay:var(--color-white)]/10 dark:text-zinc-950 dark:[--btn-bg:white] dark:[--btn-hover-overlay:var(--color-zinc-950)]/5 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)] dark:[--btn-icon:var(--color-zinc-500)] dark:data-active:[--btn-icon:var(--color-zinc-400)] dark:data-hover:[--btn-icon:var(--color-zinc-400)]",
    'dark': "text-white bg-[#05091F]/85 [--btn-border:var(--color-blue-900)]/90 [--btn-hover-overlay:var(--color-white)]/10 dark:[--btn-hover-overlay:var(--color-white)]/5 dark:bg-[#05091F]/85 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]",
    'white': "text-zinc-950 [--btn-bg:white] [--btn-border:var(--color-zinc-950)]/10 [--btn-hover-overlay:var(--color-zinc-950)]/[2.5%] data-active:[--btn-border:var(--color-zinc-950)]/15 data-hover:[--btn-border:var(--color-zinc-950)]/15 dark:[--btn-hover-overlay:var(--color-zinc-950)]/5 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-500)] data-hover:[--btn-icon:var(--color-zinc-500)]",
    'zinc': "text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-zinc-600)] [--btn-border:var(--color-zinc-700)]/90 dark:[--btn-hover-overlay:var(--color-white)]/5 [--btn-icon:var(--color-zinc-400)] data-active:[--btn-icon:var(--color-zinc-300)] data-hover:[--btn-icon:var(--color-zinc-300)]",
    'blue': "text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-blue-600)] [--btn-border:var(--color-blue-700)]/90 [--btn-icon:var(--color-blue-400)] data-active:[--btn-icon:var(--color-blue-300)] data-hover:[--btn-icon:var(--color-blue-300)]",
  },
};

/**
 * A small wrapper to increase the touch target size on mobile devices.
 * This was present in the original code and is a good practice for usability.
 */
function TouchTarget({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
        aria-hidden="true"
      />
      {children}
    </>
  );
}

/**
 * The main styled button component for the application.
 * It wraps the HeadlessButton to apply styles based on its props.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ color, outline, plain, custom, className, children, ...props }, ref) {
    // Use cn to conditionally combine class names.
    const finalClassName = cn(
      className,
      !custom && [
        styles.base,
        outline
          ? styles.outline
          : plain
          ? styles.plain
          : cn(styles.solid, styles.colors[color ?? 'dark/zinc']),
      ]
    );

    return (
      <HeadlessButton
        {...props}
        className={cn(finalClassName, !custom && "cursor-pointer")}
        ref={ref}
      >
        <TouchTarget>{children}</TouchTarget>
      </HeadlessButton>
    );
  }
);