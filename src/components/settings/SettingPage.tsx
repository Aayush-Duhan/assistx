import { observer } from "mobx-react-lite";
import { ShortcutsList, SettingsSection, SettingsButton } from "./SettingsComponents";
import { send } from "@/services/electron";
import { useInvisibility } from "@/hooks/useInvisibility";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { IS_DEV } from "@/lib/constants";
export const SettingPage = observer(() => {
    const { isInvisible, toggleInvisibility } = useInvisibility();

    return (
        <>
            <div className="p-8 space-y-6 h-full overflow-x-auto scrollbar scrollbar-thumb-stone-300 scrollbar-track-stone-100">
                <SettingsSection
                    title="Keyboard shortcuts"
                    description={`${APP_NAME} works with these easy to remember commands.`}
                    bottomContent={<ShortcutsList className="-mb-3" />}
                    dark
                />
                <SettingsSection
                    title="Invisibility"
                    description={`${APP_NAME} is currently ${isInvisible ? 'invisible' : 'visible'} to others when sharing your screen. Changing this setting will restart ${APP_NAME}.`}
                    rightContent={<SettingsButton onClick={toggleInvisibility}>{isInvisible ? 'Make visible' : 'Make invisible'}</SettingsButton>}
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
                        onClick={() => send('reset-onboarding', null)}
                    >
                        Reset onboarding
                    </SettingsButton>
                    <SettingsButton
                        onClick={() => send('quit-app', null)}
                    >
                        Quit {APP_NAME}
                    </SettingsButton>
                </div>
            </div>
        </>
    )
})