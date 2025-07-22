import { ChildProcess, spawn } from "node:child_process";
import { getMacExtraResourcePath, getChildProcessOutput } from "./utils";
import { app } from "electron";
import type { BaseWindow } from "../../windows/baseWindow";
import type { OnboardingWindow } from "../../windows/OnboardingWindow";

const NATIVE_MAC_RECORDER_PATH = getMacExtraResourcePath('nativeMacRecorder');
const MAC_RECORDER_TIMEOUT = 24000;

let nativeMacRecorderProcess: ChildProcess | null = null;

app.on('before-quit', () => stopMacNativeRecorder());

export function startMacNativeRecorder(window: BaseWindow | OnboardingWindow): void{
    stopMacNativeRecorder();
    const execPath = NATIVE_MAC_RECORDER_PATH;
    nativeMacRecorderProcess = spawn(execPath, [MAC_RECORDER_TIMEOUT.toString()]);
    pipeMacRecorderData(nativeMacRecorderProcess, window);
    getChildProcessOutput(nativeMacRecorderProcess, execPath);
}

export function stopMacNativeRecorder(): void{
    if(nativeMacRecorderProcess){
        nativeMacRecorderProcess.kill('SIGINT');
        nativeMacRecorderProcess = null;
    }
}

function pipeMacRecorderData(process: ChildProcess, window: BaseWindow | OnboardingWindow): void{
    let buffer = '';
    if (!process.stdout) return;

    process.stdout.on('data', (data) => {
        const chunk = data.toString();
        const lines = (buffer + chunk).split('\n');
        buffer = lines.pop() || '';
        const dataBySource: Record<string, string[]> = {};
        for (const line of lines) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex === -1) continue;

            const source = line.slice(0, separatorIndex);
            const base64Data = line.slice(separatorIndex + 1);
            dataBySource[source] ??= [];
            dataBySource[source].push(base64Data);
        }
        for (const source of ['mic','system']){
            const base64chunks = dataBySource[source];
            if (base64chunks) {
                window.sendToWebContents('mac-native-recorder-data', {
                    source: source,
                    base64Chunks: base64chunks.join(''),
                });
            }
        }
    })
}