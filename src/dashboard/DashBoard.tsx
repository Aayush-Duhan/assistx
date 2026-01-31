import { ToolsPage } from "@/components/settings/components/ToolsPage";
import { PersonalizePage } from "@/components/settings/PersonalizePage";
import { SettingPage } from "@/components/settings/SettingPage";
import { SettingSideBar } from "@/components/settings/SettingSideBar";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";
import { activeAppAtom } from "./atoms";
import { ElectronDragWrapper } from "../components/electronDragWrapper";
import { IS_MAC } from "@/shared/constants";
import { LuSearch } from "react-icons/lu";

export const Dashboard = observer(() => {
  const [pageKey, setPageKey] = useState(0);
  const [activeApp] = useAtom(activeAppAtom);
  const handleNavToSamePage = useCallback(() => {
    setPageKey((k) => k + 1);
  }, []);
  return (
    // <div className="relative h-full flex flex-col">
    <div className="relative isolate flex h-svh w-full flex-col">
      <div className="flex justify-between py-1.5 px-2 gap-1.5">
        <div className="hidden md:block absolute right-1/2 translate-x-1/2">
          <button
            type="button"
            className="opacity-60 hover:opacity-100 outline-none bg-zinc-200 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 relative cursor-pointer select-none flex items-center w-md justify-center font-medium duration-150 transition-[colors, opacity] gap-x-1.5 py-1.5 px-1.5 rounded-lg pl-4 pr-6"
          >
            <LuSearch className="size-3" />
            <span className="text-xs truncate max-w-[75%]">Search or ask anything...</span>
          </button>
        </div>
      </div>

      {/* <ElectronDragWrapper className="absolute top-0 left-0 right-0 h-[35px] flex items-center px-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                <img src={Logo} alt="Logo" className="size-5" />
                <div className="text-white text-sm font-semibold">AssistX</div>
                </div>
                </ElectronDragWrapper> */}
      <div className={cn("relative  h-[calc(100vh-35px)] mt-[35px] bg-black")}>
        <div className="outline-none flex flex-row flex-1 overflow-auto bg-zinc-930 overflow-y-scroll sm:rounded-md sm:ring-[0.5px] sm:ring-zinc-50/10 m-2">
          <SettingSideBar onNavToSamePage={handleNavToSamePage} />
          <div key={pageKey} className={cn("relative flex-1 h-full overflow-hidden bg-black")}>
            {activeApp === "app" && <SettingPage />}
            {activeApp === "personalize" && <PersonalizePage />}
            {activeApp === "settings.integrations" && <h1>Hello</h1>}
            {activeApp === "settings.tools" && <ToolsPage />}
          </div>
        </div>
      </div>
      <DashboardIframeDragRegions />
    </div>
    // </div>
  );
});

function DashboardIframeDragRegions() {
  return IS_MAC ? (
    <>
      <ElectronDragWrapper className="absolute top-0 left-0 w-[73px] h-10" />
      <ElectronDragWrapper className="absolute top-0 left-[140px] w-[calc(50%-365px)] h-10" />
      <ElectronDragWrapper className="absolute top-0 right-[135px] w-[calc(50%-360px)] h-10" />
    </>
  ) : (
    <>
      <ElectronDragWrapper className="absolute top-0 left-[120px] w-[calc(50%-345px)] h-10" />
      <ElectronDragWrapper className="absolute top-0 right-[271px] w-[calc(50%-495px)] h-10" />
    </>
  );
}
