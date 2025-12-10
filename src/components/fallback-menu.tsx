import { IconSettingsGear2 } from "@central-icons-react/round-filled-radius-2-stroke-1.5";
import { sendToIpcMain } from "@/shared/ipc";
import { useSharedState } from "@/shared/shared";
import clsx from "clsx";
import { APP_NAME } from "@/shared/constants";
import {
    Dropdown,
    DropdownButton,
    DropdownItem,
    DropdownLabel,
    DropdownMenu,
    DropdownTitle,
} from "@/components/catalyst/dropdown";
import { ArrowUpCircleIcon, PowerIcon, CircleQuestionMarkIcon } from 'lucide-react'
import { useDarkMode } from "usehooks-ts";


export function FallbackMenu() {
    const { isDarkMode } = useDarkMode();
    const { appVersion, autoUpdateState } = useSharedState();
    return (
        <Dropdown>
            <DropdownButton className="outline-none group p-2 cursor-pointer">
                <IconSettingsGear2 className={`size-6 transition-colors duration-75 ${isDarkMode ? "text-white/50 group-hover:text-white/80" : "text-black/40 group-hover:text-black/80"}`} />
            </DropdownButton>
            <DropdownMenu className={clsx(isDarkMode ? "dark" : "light")}>
                <DropdownTitle>
                    {APP_NAME} v{appVersion}
                </DropdownTitle>
                <DropdownItem onClick={() => window.open(`https://support.cluely.com`)}>
                    <CircleQuestionMarkIcon />
                    <DropdownLabel>Help Center</DropdownLabel>
                </DropdownItem>
                {autoUpdateState.state === "downloaded" && (
                    <DropdownItem
                        warn
                        onClick={() => {
                            sendToIpcMain("install-update", null);
                        }}
                    >
                        <ArrowUpCircleIcon />
                        <DropdownLabel>Restart to Update</DropdownLabel>
                    </DropdownItem>
                )}
                <DropdownItem warn onClick={() => sendToIpcMain("quit-app", null)}>
                    <PowerIcon />
                    <DropdownLabel>Quit {APP_NAME}</DropdownLabel>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}