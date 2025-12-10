import { observer } from "mobx-react-lite";
import { ShortcutsList, SettingsSection, SettingsButton } from "./SettingsComponents";
import { sendToIpcMain } from "@/services/electron";
import { useIsInvisible } from "@/hooks/useInvisibility";
import { APP_NAME, APP_VERSION, IS_DEV } from "@/shared/constants";
export const SettingPage = observer(() => {
    const isInvisible = useIsInvisible();

    return (
        <>
            <div className="p-8 h-full overflow-x-auto scrollbar scrollbar-thumb-stone-300 scrollbar-track-stone-100">
                <SettingsSection
                    title="Keyboard shortcuts"
                    description={`${APP_NAME} works with these easy to remember commands.`}
                    bottomContent={<ShortcutsList className="-mb-3" />}
                    dark
                />
                <SettingsSection
                    title="Invisibility"
                    description={`${APP_NAME} is currently ${isInvisible ? 'invisible' : 'visible'} to others when sharing your screen. Changing this setting will restart ${APP_NAME}.`}
                    rightContent={<SettingsButton onClick={() => sendToIpcMain('toggle-invisible', null)}>{isInvisible ? 'Make visible' : 'Make invisible'}</SettingsButton>}
                    dark
                />
                <SettingsSection
                    title="App version"
                    description={`You are currently using ${APP_NAME} version ${APP_VERSION}${IS_DEV ? ' (dev)' : ''}.`}
                    rightContent={null}
                    dark
                />
                <div className="flex justify-center gap-4">
                    <SettingsButton
                        onClick={() => sendToIpcMain('reset-onboarding', null)}
                    >
                        Reset onboarding
                    </SettingsButton>
                    <SettingsButton
                        onClick={() => sendToIpcMain('quit-app', null)}
                    >
                        Quit {APP_NAME}
                    </SettingsButton>
                </div>
            </div>
        </>
    )
})