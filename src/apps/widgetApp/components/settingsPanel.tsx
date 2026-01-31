import { PiEyeglassesBold, PiMouseScroll } from "react-icons/pi";
import { GrPan } from "react-icons/gr";
import { HiAnnotation } from "react-icons/hi";
import { LuLink } from "react-icons/lu";
import { FaUserGroup, FaWandMagicSparkles } from "react-icons/fa6";
import { RiCollapseDiagonalLine } from "react-icons/ri";
import { updateState, useSharedState } from "@/shared";
import { Switch } from "@headlessui/react";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import ModeSelector from "../chat/modeSelector";
import { ELECTRON_ACCELERATOR_PART_TO_LABEL, electronAcceleratorToLabels } from "@/lib/utils";
import { useKeybindings } from "@/hooks/useKeybindings";
import { useHideChatAlsoHidesWidget } from "../hooks/useToggleShowHide";

type SettingsRowData = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  content:
    | { type: "toggle"; value: boolean; onChange: (checked: boolean) => void }
    | { type: "shortcut"; accelerator: string | ReactNode | undefined };
};

export function SettingsPanel() {
  const { undetectabilityEnabled } = useSharedState();
  const keybinds = useKeybindings();
  const [hideChatAlsoHidesWidget, setHideChatAlsoHidesWidget] = useHideChatAlsoHidesWidget();

  const rows: SettingsRowData[] = [
    {
      icon: PiEyeglassesBold,
      label: "Undetectability",
      content: {
        type: "toggle",
        value: undetectabilityEnabled,
        onChange: (checked) => updateState({ undetectabilityEnabled: checked }),
      },
    },
    {
      icon: HiAnnotation,
      label: `Show/Hide ${hideChatAlsoHidesWidget ? "Cluely" : "Chat"}`,
      content: {
        type: "shortcut",
        accelerator: keybinds.hide,
      },
    },
    {
      icon: LuLink,
      label: "Hide Chat Also Hides Widget",
      content: {
        type: "toggle",
        value: hideChatAlsoHidesWidget,
        onChange: (checked) => setHideChatAlsoHidesWidget(checked),
      },
    },
    {
      icon: FaWandMagicSparkles,
      label: "Auto-Answer",
      content: {
        type: "shortcut",
        accelerator: keybinds.trigger_ai,
      },
    },
    {
      icon: GrPan,
      label: "Move Cluely",
      content: {
        type: "shortcut",
        accelerator: (
          <>
            <Kbd>{ELECTRON_ACCELERATOR_PART_TO_LABEL.CommandOrControl}</Kbd>
            <Kbd>
              <div className="flex items-center gap-[3px]">
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Up}
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Down}
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Left}
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Right}
              </div>
            </Kbd>
          </>
        ),
      },
    },
    {
      icon: PiMouseScroll,
      label: "Scroll Chat",
      content: {
        type: "shortcut",
        accelerator: (
          <>
            <Kbd>{ELECTRON_ACCELERATOR_PART_TO_LABEL.CommandOrControl}</Kbd>
            <Kbd>{ELECTRON_ACCELERATOR_PART_TO_LABEL.Shift}</Kbd>
            <Kbd>
              <div className="flex items-center gap-[3px]">
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Up}
                {ELECTRON_ACCELERATOR_PART_TO_LABEL.Down}
              </div>
            </Kbd>
          </>
        ),
      },
    },
    {
      icon: RiCollapseDiagonalLine,
      label: "Collapse Chat",
      content: {
        type: "shortcut",
        accelerator: keybinds.start_over,
      },
    },
  ];

  return (
    <div
      className="w-[300px] text-white text-xs p-4 rounded-2xl flex flex-col bg-linear-to-b from-[hsla(252,_10%,_10%,_0.9)] to-[hsla(252,_10%,_10%,_0.95)]"
      style={{
        boxShadow:
          "0px -0.5px 0px 0px rgba(255, 255, 255, 0.8), 0px 0px 0px 0.5px rgba(207, 226, 255, 0.24) inset",
      }}
    >
      {rows.map(({ icon, label, content }) => (
        <SettingsRow key={label} icon={icon} label={label}>
          {content.type === "shortcut" && (
            <div className="flex items-center gap-1">
              {content.accelerator ? (
                typeof content.accelerator === "string" ? (
                  electronAcceleratorToLabels(content.accelerator).map((label, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    <Kbd key={index}>{label}</Kbd>
                  ))
                ) : (
                  content.accelerator
                )
              ) : (
                <span className="text-white/50 font-medium">No shortcut</span>
              )}
            </div>
          )}

          {content.type === "toggle" && (
            <Switch
              checked={content.value}
              onChange={content.onChange}
              className="group inline-flex h-5 w-9 items-center rounded-full bg-white/20 transition data-checked:bg-blue-600"
            >
              <span className="size-3 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-5" />
            </Switch>
          )}
        </SettingsRow>
      ))}

      {
        <SettingsRow icon={FaUserGroup} label="Mode" className="pt-1.5">
          <ModeSelector />
        </SettingsRow>
      }
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={twMerge(
        "flex items-center justify-between py-2 border-b border-white/5 last:border-0 first:pt-0 last:pb-0",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="opacity-60">
          <Icon className="size-5" />
        </div>
        <div>{label}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Kbd({ children }: PropsWithChildren) {
  return (
    <div className="min-w-5.5 h-5.5 bg-linear-to-b from-black/10 to-black/15 inline-flex justify-center items-center font-mono text-[10px] text-white/50 border-white/20 border-0.5 border rounded-md px-[3px] py-1">
      {children}
    </div>
  );
}
