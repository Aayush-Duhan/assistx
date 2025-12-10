import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { twMerge } from "tailwind-merge";
import { buttonVariants } from "./variants";

function OnboardingButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={twMerge(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export default OnboardingButton;
