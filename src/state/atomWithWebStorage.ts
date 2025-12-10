import { atomWithStorage } from "jotai/utils";

/**
 * The default behavior of jotai's atomWithStorage is that the first read will
 * produce the initialValue, for SSR compatibility. However, we're in a
 * client-only environment, so we want to read the value immediately from
 * storage.
 */
export function atomWithWebStorage<Value>(key: string, initialValue: Value) {
    return atomWithStorage(key, initialValue, undefined, { getOnInit: true });
}
