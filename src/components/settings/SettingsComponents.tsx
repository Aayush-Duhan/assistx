import { cn } from "@/lib/utils";
import { HeadlessButton } from "../ui/HeadlessButton";
import { observer } from "mobx-react-lite";
import { kit } from "@/components/kit";

export function SettingsSection({
  title,
  description,
  rightContent,
  bottomContent,
  dark = false,
}: {
  title: string;
  description: string;
  rightContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-6 space-y-4 border rounded-lg",
        dark ? "bg-stone-900/80 border-white/10" : "border-white/10",
      )}
    >
      <div className="flex items-center gap-12">
        <div className="flex-1 space-y-1">
          <h2 className={cn("text-lg font-medium", dark ? "text-white" : "text-stone-900")}>
            {title}
          </h2>
          <p className={cn("text-sm", dark ? "text-white/70" : "text-stone-600")}>{description}</p>
        </div>
        {rightContent}
      </div>
      {bottomContent}
    </div>
  );
}

export function SettingsButton({
  onClick,
  className,
  ...props
}: React.ComponentProps<typeof HeadlessButton>) {
  return (
    <HeadlessButton
      className={cn(
        "inset-ring inset-ring-stone-300/50 rounded-md cursor-pointer",
        "bg-stone-200 text-black text-sm font-medium px-4 py-2",
        "hover:bg-cyan-300 cursor-pointer hover:inset-ring inset-ring-black/5",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      onClick={onClick}
      {...props}
    />
  );
}

const ShortcutItem = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="text-left flex justify-between items-center gap-x-24">
    <div className="grid grid-rows-2">
      <h2 className="text-[18px] text-white/90 font-semibold">{title}</h2>
      <h3 className="text-sm text-white/60 font-medium">{description}</h3>
    </div>
    <div className="text-stone-400 text-xs">{children}</div>
  </div>
);
const SHORTCUT_SHOW_HIDE = "CommandOrControl+\\";

export const ShortcutsList = observer(({ className }: { className?: string }) => {
  return (
    <div className={cn("divide-y divide-white/20 justify-center", className)}>
      <ShortcutItem title="Show / Hide" description={`Toggle visibility of AssistX`}>
        <kit.Shortcut large accelerator={SHORTCUT_SHOW_HIDE} />
      </ShortcutItem>
      <ShortcutItem title="Ask" description={`Ask AssistX about your screen or audio`}>
        <kit.Shortcut large accelerator="CommandOrControl+Enter" />
      </ShortcutItem>
      <ShortcutItem title="Scroll Response" description="Scroll through the AI's response">
        <kit.Shortcut large accelerator="CommandOrControl+Up/Down" />
      </ShortcutItem>
      <ShortcutItem title="Clear" description={`Clear the current conversation with AssistX`}>
        <kit.Shortcut large accelerator="CommandOrControl+R" />
      </ShortcutItem>
    </div>
  );
});
