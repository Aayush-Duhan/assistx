import { ChatModel } from "@/types/chat";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import { Fragment, memo, PropsWithChildren, useEffect, useState } from "react";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useChatModels } from "../hooks/use-chat-models";
import { Button } from "@/components/ui/select-button";
import { useAtom } from "jotai";
import { chatModelAtom } from "@/stores/modelStore";
import { cn } from "@/lib/utils";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  currentModel?: ChatModel;
  showProvider?: boolean;
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [model, setModel] = useAtom(chatModelAtom);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (props.currentModel) {
      setModel(props.currentModel);
    }
  }, [props.currentModel, setModel]);

  const handleSelect = (selectedModel: ChatModel) => {
    setModel(selectedModel); // updates local + global state
    props.onSelect?.(selectedModel); // still call onSelect if provided
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || <ModelSelectorTrigger model={model} showProvider={props.showProvider} />}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px] border-gray-800" align={props.align || "end"}>
        <CaptureMouseEventsWrapper>
          <ModelList selectedModel={model} onSelect={handleSelect} />
        </CaptureMouseEventsWrapper>
      </PopoverContent>
    </Popover>
  );
};

interface ModelSelectorTriggerProps {
  model: ChatModel | undefined;
  showProvider?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ModelSelectorTrigger = ({
  model,
  showProvider = true,
  className,
  onClick,
}: ModelSelectorTriggerProps) => {
  return (
    <Button
      variant={"secondary"}
      size={"sm"}
      className={cn("data-[state=open]:bg-input! hover:bg-input!", className)}
      onClick={onClick}
    >
      <div className="mr-auto flex items-center gap-1">
        {showProvider && (
          <ModelProviderIcon provider={model?.provider || ""} className="size-3.5 mr-1" />
        )}
        <p>{model?.model || "model"}</p>
      </div>
      <LuChevronDown className="size-3" />
    </Button>
  );
};

interface ModelListProps {
  selectedModel: ChatModel | undefined;
  onSelect: (model: ChatModel) => void;
  className?: string;
}

export const ModelList = ({ selectedModel, onSelect, className }: ModelListProps) => {
  const { data: providers } = useChatModels();

  return (
    <Command
      className={cn("rounded-lg relative bg-black/80 shadow-md h-80", className)}
      value={JSON.stringify(selectedModel)}
      onClick={(e) => e.stopPropagation()}
    >
      <CommandInput placeholder="search model..." />
      <CommandList className="p-2 custom-scrollbar">
        <CommandEmpty>No results found.</CommandEmpty>
        {providers?.map((provider, i) => (
          <Fragment key={provider.provider}>
            <CommandGroup
              heading={
                <ProviderHeader provider={provider.provider} hasAPIKey={provider.hasAPIKey} />
              }
              className={cn("pb-4 group", !provider.hasAPIKey && "opacity-50")}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {provider.models.map((item) => (
                <CommandItem
                  key={item.name}
                  disabled={!provider.hasAPIKey}
                  className="cursor-pointer"
                  onSelect={() => {
                    onSelect({
                      provider: provider.provider,
                      model: item.name,
                    });
                  }}
                  value={item.name}
                >
                  {selectedModel?.provider === provider.provider &&
                  selectedModel?.model === item.name ? (
                    <LuCheck className="size-3" />
                  ) : (
                    <div className="ml-3" />
                  )}
                  <span className="pr-2">{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {i < providers?.length - 1 && <CommandSeparator />}
          </Fragment>
        ))}
      </CommandList>
    </Command>
  );
};

const ProviderHeader = memo(function ProviderHeader({
  provider,
  hasAPIKey,
}: {
  provider: string;
  hasAPIKey: boolean;
}) {
  return (
    <div className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors duration-300">
      {provider === "openai" ? (
        <ModelProviderIcon provider="openai" className="size-3 text-foreground" />
      ) : (
        <ModelProviderIcon provider={provider} className="size-3" />
      )}
      {provider}
      {!hasAPIKey && (
        <>
          <span className="text-xs ml-auto text-muted-foreground">No API Key</span>
        </>
      )}
    </div>
  );
});
