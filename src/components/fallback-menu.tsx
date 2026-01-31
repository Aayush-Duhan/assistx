import { IoIosSettings } from "react-icons/io";
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
import { IoArrowUpCircleOutline, IoPower } from "react-icons/io5";
import { GrCircleQuestion } from "react-icons/gr";
import { useDarkMode } from "usehooks-ts";

export function FallbackMenu() {
  const { isDarkMode } = useDarkMode();
  const { appVersion, autoUpdateState } = useSharedState();
  return (
    <Dropdown>
      <DropdownButton className="outline-none group p-2 cursor-pointer">
        <IoIosSettings
          className={`size-6 transition-colors duration-75 ${isDarkMode ? "text-white/50 group-hover:text-white/80" : "text-black/40 group-hover:text-black/80"}`}
        />
      </DropdownButton>
      <DropdownMenu className={clsx(isDarkMode ? "dark" : "light")}>
        <DropdownTitle>
          {APP_NAME} v{appVersion}
        </DropdownTitle>
        <DropdownItem onClick={() => window.open(`https://support.cluely.com`)}>
          <GrCircleQuestion />
          <DropdownLabel>Help Center</DropdownLabel>
        </DropdownItem>
        {autoUpdateState.state === "downloaded" && (
          <DropdownItem
            warn
            onClick={() => {
              sendToIpcMain("install-update", null);
            }}
          >
            <IoArrowUpCircleOutline />
            <DropdownLabel>Restart to Update</DropdownLabel>
          </DropdownItem>
        )}
        <DropdownItem warn onClick={() => sendToIpcMain("quit-app", null)}>
          <IoPower />
          <DropdownLabel>Quit {APP_NAME}</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
