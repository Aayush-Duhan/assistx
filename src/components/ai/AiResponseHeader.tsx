import React from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { WindowTitle } from '../ui/WindowTitle';
import { HeadlessButton } from '../ui/HeadlessButton';
import { CopyButton } from '../ui/CopyButton';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { isCopyingAtom, isClearingAtom } from '../../state/atoms';
import { AiResponse } from './AiResponse';
import { Logo } from '../app/Logo';
import { CircleX } from 'lucide-react';

export const AIResponseHeader = observer(({
    title,
    titleKey,
    showPulseAnimation = false,
    children,
    curResponse,
}: {
    title: React.ReactNode;
    titleKey: string;
    showPulseAnimation?: boolean;
    children?: React.ReactNode;
    curResponse?: AiResponse;
}) => {
    const { aiResponsesService } = useGlobalServices();
    const setIsClearing = useSetAtom(isClearingAtom);

    return (
        <WindowTitle>
            <div className="flex flex-1 items-center w-full">
                <div className="flex justify-between items-center gap-2 flex-1">
                    <div className={`flex flex-1 items-center gap-2 ${showPulseAnimation ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}>
                        <Logo className="size-3.5 fill-white -mt-[1px]" />
                        <AnimatePresence mode="popLayout">
                            <motion.p
                                key={titleKey}
                                className="min-w-fit"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {title}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
                <div className="flex flex-1 justify-end">
                    <div className="flex items-center gap-2">
                        {children}
                        <div>
                            <div className="flex-shrink-0 flex items-center gap-0">
                                {curResponse && <CopyConversationButton curResponse={curResponse} />}
                                <HeadlessButton
                                    className="cursor-pointer rounded hover:bg-white/10 active:bg-white/20 transition"
                                    onClick={() => {
                                        aiResponsesService.clearCurrentConversation();
                                    }}
                                    onMouseOver={() => setIsClearing(true)}
                                    onMouseOut={() => setIsClearing(false)}
                                >
                                    <div className="group flex items-center justify-end gap-2 p-1 text-white/50 hover:text-white">
                                        <div className="inset-0 h-4 flex items-center justify-end duration-300">
                                            <CircleX size={14} />
                                        </div>
                                    </div>
                                </HeadlessButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </WindowTitle>
    );
});

const CopyConversationButton = observer(({ curResponse }: { curResponse: AiResponse }) => {
    const setIsCopyingConversation = useSetAtom(isCopyingAtom);
    return (
        <div
            className="cursor-pointer rounded hover:bg-white/10 active:bg-white/20 transition"
            onMouseOver={() => setIsCopyingConversation(true)}
            onMouseOut={() => setIsCopyingConversation(false)}
        >
            <CopyButton
                content={curResponse.state.state !== 'error' ? curResponse.state.text : ''}
                size="lg"
            />
        </div>
    );
});