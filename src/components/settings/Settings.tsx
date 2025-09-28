import { useCallback, useState } from 'react';
import MovableWindow from '../windows/MovableWindow';
import { cn } from '@/lib/utils';
import { SettingSideBar } from './SettingSideBar';
import { useAtom } from 'jotai';
import { activeAppAtom, settingsWindowVisibleAtom } from '@/state/atoms';
import { SettingPage } from './SettingPage';
import { PersonalizePage } from './PersonalizePage';
import { IntegrationsPage } from './IntegrationsPage';
import { observer } from 'mobx-react-lite';
import { ToolsPage } from './components/ToolsPage';
 

export const Settings = observer(() => {
    const [pageKey, setPageKey] = useState(0);
    const [activeApp] = useAtom(activeAppAtom);
    const [isWindowVisible] = useAtom(settingsWindowVisibleAtom);
    const handleNavToSamePage = useCallback(() => {
        setPageKey(k => k + 1);
    }, []);
    return (
        <>
        <MovableWindow
            show={isWindowVisible}
            captureMouseEvents
            backgroundClassname={cn('border-0 inset-ring-0 !bg-transparent',
                'shadow-[10px_10px_30px_10px_rgba(0,0,0,0.2)]'
            )}
            contentClassName={cn('overflow-hidden', 'border-[0.5px] border-black/20')}
            width={1050}
            layoutTransition={false}
            fastAnimations={false}
        >
            <div className={cn('relative grid grid-cols-[200px_1fr] h-[min(75vh,735px)] rounded-lg overflow-hidden pointer-events-auto')}>
                <SettingSideBar onNavToSamePage={handleNavToSamePage} />
                <div key={pageKey} className={cn('relative h-full overflow-hidden bg-black')}>                    
                    {activeApp === 'app' && (
                        <SettingPage />
                    )}
                    {activeApp === 'personalize' && (
                        <PersonalizePage />
                    )}
                    {activeApp === 'settings.integrations' && (
                        <IntegrationsPage />
                    )}
                    {activeApp === 'settings.tools' && (
                        <ToolsPage />
                    )}
                </div>
            </div>
        </MovableWindow>
        </>
    );
});
