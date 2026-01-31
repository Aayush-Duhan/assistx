import * as Headless from "@headlessui/react";
import clsx from "clsx";
import type React from "react";
import type { Button } from "../ui/Button";

export function Dropdown(props: Headless.MenuProps) {
  return <Headless.Menu {...props} />;
}

export function DropdownButton<T extends React.ElementType = typeof Button>({
  ...props
}: { className?: string } & Omit<Headless.MenuButtonProps<T>, "className">) {
  return <Headless.MenuButton {...props} />;
}

export function DropdownMenu({
  anchor = "bottom",
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuItemsProps, "as" | "className">) {
  return (
    <Headless.MenuItems
      {...props}
      transition
      anchor={anchor}
      className={clsx(
        className,
        "[--anchor-gap:--spacing(2)] [--anchor-padding:--spacing(1)] data-[anchor~=end]:[--anchor-offset:6px] data-[anchor~=start]:[--anchor-offset:-6px] sm:data-[anchor~=end]:[--anchor-offset:4px] sm:data-[anchor~=start]:[--anchor-offset:-4px]",
        "isolate w-max rounded-lg p-1",
        "outline outline-transparent focus:outline-hidden",
        "overflow-y-auto",
        "bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75",
        "shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset",
        "flex flex-col",
        "transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0",
      )}
    />
  );
}

export function DropdownItem({
  className,
  danger,
  warn,
  ...props
}: { className?: string; danger?: boolean; warn?: boolean } & Omit<
  Headless.MenuItemProps<"button">,
  "as" | "className"
>) {
  const classes = clsx(
    className,
    "group cursor-pointer rounded-md px-3 py-2 focus:outline-hidden",
    "text-left text-sm dark:text-white forced-colors:text-[CanvasText]",
    "data-focus:bg-black/10 dark:data-focus:bg-white/10",
    "data-disabled:opacity-50",
    "forced-color-adjust-none forced-colors:data-focus:bg-[Highlight] forced-colors:data-focus:text-[HighlightText]",
    "w-full flex items-center gap-2",
    "[&>svg]:size-4 [&>svg]:shrink-0",
    "[&>svg]:text-zinc-500 dark:[&>svg]:text-zinc-400 data-focus:[&>svg]:text-black dark:data-focus:[&>svg]:text-white",
    danger &&
      "text-red-400! data-focus:bg-red-500! data-focus:text-white! data-focus:[&>svg]:text-white!",
    warn && "data-focus:bg-red-500! data-focus:text-white! data-focus:[&>svg]:text-white!",
  );

  return <Headless.MenuItem as="button" type="button" {...props} className={classes} />;
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={clsx(className, "col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3")} />;
}

export function DropdownSection({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuSectionProps, "as" | "className">) {
  return (
    <Headless.MenuSection
      {...props}
      className={clsx(
        className,
        "col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]",
      )}
    />
  );
}

export function DropdownHeading({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuHeadingProps, "as" | "className">) {
  return (
    <Headless.MenuHeading
      {...props}
      className={clsx(
        className,
        "col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400",
      )}
    />
  );
}

export function DropdownTitle({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={clsx(
        className,
        "block px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-950/5 dark:border-white/10",
      )}
    />
  );
}

export function DropdownDivider({
  className,
  ...props
}: { className?: string } & Omit<Headless.MenuSeparatorProps, "as" | "className">) {
  return (
    <Headless.MenuSeparator
      {...props}
      className={clsx(
        className,
        "col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]",
      )}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return <span {...props} data-slot="label" className={clsx(className, "truncate")} />;
}

export function DropdownDescription({
  className,
  ...props
}: { className?: string } & Omit<Headless.DescriptionProps, "as" | "className">) {
  return (
    <Headless.Description
      data-slot="description"
      {...props}
      className={clsx(
        className,
        "col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 group-data-focus:text-white sm:text-xs/5 dark:text-zinc-400 forced-colors:group-data-focus:text-[HighlightText]",
      )}
    />
  );
}

export function DropdownShortcut({
  keys,
  className,
  ...props
}: { keys: string | string[]; className?: string } & Omit<
  Headless.DescriptionProps<"kbd">,
  "as" | "className"
>) {
  return (
    <Headless.Description
      as="kbd"
      {...props}
      className={clsx(className, "col-start-5 row-start-1 flex justify-self-end")}
    >
      {(Array.isArray(keys) ? keys : keys.split("")).map((char, index) => (
        <kbd
          key={char}
          className={clsx([
            "min-w-[2ch] text-center font-sans text-zinc-400 capitalize group-data-focus:text-white forced-colors:group-data-focus:text-[HighlightText]",
            index > 0 && char.length > 1 && "pl-1",
          ])}
        >
          {char}
        </kbd>
      ))}
    </Headless.Description>
  );
}
