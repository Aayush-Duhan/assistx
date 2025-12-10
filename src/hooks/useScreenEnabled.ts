import { useLocalStorage } from "usehooks-ts";

export function useScreenEnabled() {
  const [isScreenEnabled, setIsScreenEnabled] = useLocalStorage("screen-enabled", true);

  return [isScreenEnabled, setIsScreenEnabled] as const;
}

export function getScreenEnabled() {
  const isScreenEnabled = localStorage.getItem("screen-enabled");

  return isScreenEnabled === null ? true : isScreenEnabled === "true";
}
