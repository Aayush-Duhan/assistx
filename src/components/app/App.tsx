import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { MouseEventsCapture } from '../windows/MouseEventCapture';
import { MovableWindowsProvider, useMovableWindowApi } from '../../hooks/useMovableWindow';
import { InlineWindow } from '../windows/InlineWindow';
import { CommandBar } from './CommandBar';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { LayoutGroup, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PortalProvider } from '../Portal';
import { Settings } from '../settings/Settings';
import { AiResponseWindow } from '../ai/AiResponseWindow';
import { Shortcut } from '../ui/Shortcut';
import { House } from 'lucide-react';
import { useAtom } from 'jotai';
import { settingsWindowVisibleAtom } from '@/state/atoms';
import { AudioSessionWindow } from '../ai/AudioSessionWindow';
import { MovableTooltip } from '../ui/Tooltip';

export const App: FC = observer(() => {
    const { micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
    const [isAudioSessionVisible, setIsAudioSessionVisible] = useState(true);
    const [, setSettingsWindowVisible] = useAtom(settingsWindowVisibleAtom);


    // Show the audio session window when audio capture starts
    useEffect(() => {
        const isAudioActive =
            micAudioCaptureService.state.state === 'running' ||
            systemAudioCaptureService.state.state === 'running' ||
            micAudioCaptureService.state.state === 'loading' ||
            systemAudioCaptureService.state.state === 'loading';

        if (isAudioActive && !isAudioSessionVisible) {
            setIsAudioSessionVisible(true);
        }
    }, [micAudioCaptureService.state.state, systemAudioCaptureService.state.state, isAudioSessionVisible]);

    return (
        <PortalProvider>
            {({ commandBar, movableWindows, notifications, fullscreen }) => (
                <LayoutGroup>
                    <div ref={fullscreen} className="absolute inset-0" />
                    <div ref={notifications} className="absolute right-5 bottom-5 flex flex-col items-end gap-4" />
                    <MovableWindowsProvider>
                        {({ x, vOrientation }) =>
                            <>
                                <motion.div
                                    className={cn(`absolute left-0 right-0 ${vOrientation === "top" ?
                                        "top-20" : "bottom-20"}`)}
                                    style={{ x }}
                                >
                                    <div ref={movableWindows} className="relative mx-auto w-fit flex flex-col-reverse items-center gap-4" >
                                        <InlineWindow>
                                            <AiResponseWindow />
                                        </InlineWindow>
                                        <Settings />
                                    </div>
                                </motion.div>
                                <motion.div
                                    className={cn('absolute left-0 right-0 flex justify-center',
                                        vOrientation === 'top' ? 'top-5' : 'bottom-5')}
                                    style={{ x }}
                                >
                                    <MouseEventsCapture>
                                        <DraggableContainer>
                                            <div className="flex gap-2">
                                                <InlineWindow
                                                    ref={commandBar}
                                                    contentClassName="h-10 flex items-center gap-6 px-[18px] pr-[14px]"
                                                    fullBorderRadius
                                                    layoutTransition
                                                >
                                                    <CommandBar />
                                                </InlineWindow>
                                                <InlineWindow
                                                    contentClassName="h-10 flex items-center gap-6 px-[13px]"
                                                    fullBorderRadius
                                                    layoutTransition
                                                >
                                                    <MovableTooltip
                                                        tooltipContent={<div className="text-white/90">Activity & Settings</div>}
                                                    >
                                                        <Shortcut
                                                            label={<House size={16} className="text-white/90" />}
                                                            onTrigger={() => setSettingsWindowVisible((prev: boolean) => !prev)}
                                                            showAccelerator={false}
                                                        />
                                                    </MovableTooltip>
                                                </InlineWindow>
                                            </div>
                                        </DraggableContainer>
                                        <AudioSessionWindow />
                                    </MouseEventsCapture>
                                </motion.div>
                            </>
                        }
                    </MovableWindowsProvider>
                </LayoutGroup>
            )}
        </PortalProvider>
    );
});


const DraggableContainer = ({ children }: { children: React.ReactNode }) => {
    const { getX, moveDrag, onVDrag, onVDragStart, onVDragEnd } = useMovableWindowApi();
    const dragState = useRef<{
        state: 'idle' | 'dragging-in-dead-zone' | 'dragging',
        startClientX: number, startX?: number
    }>({ state: 'idle', startClientX: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top &&
            e.clientY <= rect.bottom) {
            dragState.current = { state: 'dragging-in-dead-zone', startClientX: e.clientX };
            onVDragStart();
        }
    }, [onVDragStart]);
    const onPointerMove = useCallback((e: PointerEvent) => {
        onVDrag(e.clientY, window.innerHeight);
        if (dragState.current.state === 'dragging-in-dead-zone' && Math.abs(e.clientX -
            dragState.current.startClientX) > 5) {
            dragState.current = {
                state: 'dragging', startClientX: e.clientX, startX: getX()
            };
        }
        if (dragState.current.state === 'dragging' && dragState.current.startX !==
            undefined) {
            const deltaX = e.clientX - dragState.current.startClientX;
            const newX = dragState.current.startX + deltaX;
            moveDrag(Math.abs(newX) < 10 ? 0 : newX);
        }
    }, [getX, moveDrag, onVDrag]);
    const onPointerUp = useCallback(() => {
        onVDragEnd();
        setTimeout(() => {
            dragState.current = { state: 'idle', startClientX: 0 };
        }, 0);
    }, [onVDragEnd]);
    const onClickCapture = useCallback((e: MouseEvent) => {
        if (dragState.current.state === 'dragging') {
            e.stopPropagation();
        }
    }, []);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.addEventListener('pointerdown', onPointerDown as any);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('click', onClickCapture, { capture: true });
        return () => {
            el.removeEventListener('pointerdown', onPointerDown as any);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('click', onClickCapture, { capture: true });
        };
    }, [onPointerDown, onPointerMove, onPointerUp, onClickCapture]);
    return <div ref={ref}>{children}</div>;
};
