import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "ob-primary-button disabled:border disabled:border-black/10 disabled:text-black/80 disabled:bg-transparent",
        secondary: "bg-[#F6F6F6]",
        ghost: "bg-transparent text-ob3-foreground",
      },
      size: {
        default: "h-11 w-full",
        fit: "h-10 w-fit px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
