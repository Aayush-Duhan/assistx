import { ChatModel } from "@/types/chat";
import { CheckIcon, ChevronDown } from "lucide-react";
import { Fragment, memo, PropsWithChildren, useEffect, useState } from "react";
import { ModelProviderIcon } from "./model-provider-icon";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "./command";
import { useChatModels } from "@/hooks/use-chat-models";
import { Button } from "./select-button";
import { useAtom, useSetAtom } from 'jotai';
import { chatModelAtom, setChatModelAtom } from "@/stores/modelStore";


interface SelectModelProps {
    onSelect: (model: ChatModel) => void;
    align?: "start" | "end";
    currentModel?: ChatModel;
    showProvider?: boolean;
}
export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
    const [model, setModel] = useAtom(chatModelAtom);
    const setGlobalModel = useSetAtom(setChatModelAtom);
    const [open, setOpen] = useState(false);
    const { data: providers } = useChatModels();

    useEffect(() => {
        if (props.currentModel) {
            setModel(props.currentModel);
        }
    }, [props.currentModel, setModel]);

    const handleSelect = (selectedModel: ChatModel) => {
        setModel(selectedModel); // updates local + global state
        setGlobalModel(selectedModel); // optional explicit global update
        props.onSelect?.(selectedModel); // still call onSelect if provided
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {props.children || (
                    <Button
                        variant={"secondary"}
                        size={"sm"}
                        className="data-[state=open]:bg-input! hover:bg-input!"
                    >
                        <div className="mr-auto flex items-center gap-1">
                            {(props.showProvider ?? true) && (
                                <ModelProviderIcon
                                    provider={model?.provider || ""}
                                    className="size-3.5 mr-1"
                                />
                            )}
                            <p>{model?.model || "model"}</p>
                        </div>
                        <ChevronDown className="size-3" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="p-0 w-[280px] border-gray-800"
                align={props.align || "end"}
            >
                <Command
                    className="rounded-lg relative bg-black/80 shadow-md h-80"
                    value={JSON.stringify(model)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <CommandInput
                        placeholder="search model..."
                    />
                    <CommandList className="p-2 custom-scrollbar">
                        <CommandEmpty>No results found.</CommandEmpty>
                        {providers?.map((provider, i) => (
                            <Fragment key={provider.provider}>
                                <CommandGroup
                                    heading={<ProviderHeader provider={provider.provider} />}
                                    className="pb-4 group"
                                    onWheel={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    {provider.models.map((item) => (
                                        <CommandItem
                                            key={item.name}
                                            className="cursor-pointer"
                                            onSelect={() => {
                                                handleSelect({
                                                    provider: provider.provider,
                                                    model: item.name,
                                                  });
                                            }}
                                            value={item.name}
                                        >
                                            {model?.provider === provider.provider &&
                                                model?.model === item.name ? (
                                                <CheckIcon
                                                    className="size-3"
                                                />
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
            </PopoverContent>
        </Popover >
    )
}

const ProviderHeader = memo(function ProviderHeader({
    provider,
}: { provider: string }) {
    return (
        <div className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors duration-300">
            {provider === "openai" ? (
                <ModelProviderIcon
                    provider="openai"
                    className="size-3 text-foreground"
                />
            ) : (
                <ModelProviderIcon provider={provider} className="size-3" />
            )}
            {provider}
        </div>
    );
});