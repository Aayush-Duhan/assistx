import { useCopy } from "@/hooks/use-copy";
import { cn, isString } from "@/lib/utils";
import { LuCheck, LuCopy } from "react-icons/lu";
import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import JsonView from "@/components/ui/json-view";

export function JsonViewPopup({
  data,
  open,
  onOpenChange,
  children,
}: {
  data?: unknown;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const { copied, copy } = useCopy();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="text-muted-foreground text-xs">
            JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[70vw] min-w-[40vw]">
        <DialogHeader>
          <DialogTitle>JSON</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] w-full  overflow-y-auto p-6 pt-0 flex flex-col">
          <Button
            size="sm"
            className={cn("size-3! p-4! ml-auto")}
            onClick={() => copy(isString(data) ? data : JSON.stringify(data))}
          >
            {copied ? <LuCheck /> : <LuCopy />}
          </Button>
          <JsonView data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
