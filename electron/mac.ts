import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';
import { isDevelopment } from './utils/platform';

const MIN_MACOS_VERSION = 13; // Ventura+
const MAC_RECORDER_TIMEOUT = 24000;

interface ProcessOutput {
  stdout: string;
}

interface WindowWithWebContents {
  sendToWebContents: (channel: string, data: any) => void;
}

async function getProcessOutput(process: ChildProcess, processName: string): Promise<ProcessOutput> {
  return await new Promise((resolve, reject) => {
    let stdout = '';
    process.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    process.stderr?.on('data', (data: Buffer) => {
      console.error(`[${processName}] stderr: ${data}`);
    });
    process.on('close', (code: number | null) => {
      if (code !== 0) {
        console.error(`[${processName}] process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve({ stdout });
      }
    });
    process.on('error', (err: Error) => {
      console.error(`[${processName}] process error: ${err}`);
      reject(err);
    });
  });
}

async function checkMacosVersion(): Promise<{ isSupported: boolean }> {
  const swVersProcess = spawn('sw_vers', ['-productVersion']);
  const { stdout } = await getProcessOutput(swVersProcess, 'sw_vers');
  const majorVersion = Number.parseInt(stdout.split('.')[0] ?? '', 10);
  return { isSupported: !Number.isNaN(majorVersion) && majorVersion >= MIN_MACOS_VERSION };
}

const MAC_EXTRA_RESOURCES_PATH = join(
  isDevelopment ? app.getAppPath() : process.resourcesPath,
  'macExtraResources'
);

function getMacExtraResourcePath(fileName: string): string {
  return join(MAC_EXTRA_RESOURCES_PATH, fileName);
}

const NATIVE_MAC_RECORDER_PATH = getMacExtraResourcePath('nativeMacRecorder');
let nativeMacRecorderProcess: ChildProcess | null = null;

app.on('before-quit', () => stopMacNativeRecorder());

function startMacNativeRecorder(window: WindowWithWebContents): void {
  stopMacNativeRecorder(); // Ensure any existing process is killed
  nativeMacRecorderProcess = spawn(NATIVE_MAC_RECORDER_PATH, [MAC_RECORDER_TIMEOUT.toString()]);
  pipeMacRecorderData(nativeMacRecorderProcess, window);
  getProcessOutput(nativeMacRecorderProcess, NATIVE_MAC_RECORDER_PATH);
}

function stopMacNativeRecorder(): void {
  if (nativeMacRecorderProcess) {
    nativeMacRecorderProcess.kill('SIGINT');
    nativeMacRecorderProcess = null;
  }
}

function pipeMacRecorderData(process: ChildProcess, window: WindowWithWebContents): void {
  let buffer = '';
  process.stdout?.on('data', (data: Buffer) => {
    const chunk = data.toString();
    const lines = (buffer + chunk).split('\n');
    buffer = lines.pop() ?? ''; // Store incomplete line
    window.sendToWebContents('mac-native-recorder-data', {
      base64Data: lines.join('') // Concatenate all complete lines
    });
  });
}

const MIC_USING_APPS_KEYWORDS: [string, string][] = [
  ['VoiceMemos', 'Voice Memos'],
  ['Google Chrome', 'Google Chrome'],
  ['firefox', 'Mozilla Firefox'],
  ['com.apple.WebKit', 'Safari'],
  ['zoom.us', 'Zoom'],
  ['GoogleMeet', 'Google Meet'],
  ['Slack', 'Slack'],
  ['FaceTime', 'FaceTime'],
  ['Discord', 'Discord'],
  ['Teams', 'Microsoft Teams'],
  ['QuickTimePlayer', 'QuickTime Player']
];

function getMicUsingAppName(rawName: string): string | null {
  for (const [keyword, appName] of MIC_USING_APPS_KEYWORDS) {
    if (rawName.includes(keyword)) {
      return appName;
    }
  }
  return null;
}

interface MatchRule {
  type: 'mic-used' | 'mic-off';
  subsystem: string;
  matchSubstring: string;
  regex?: RegExp;
}

interface MicEvent {
  app: string;
  message: string;
}

class MicMonitor extends EventEmitter {
  proc: ChildProcess | null = null;
  matchRules: MatchRule[] = [
    {
      type: 'mic-used',
      subsystem: 'com.apple.coreaudio:as_server',
      matchSubstring: '\\"input_running\\":true',
      regex: /"session":\{[^}]*"name":"([A-Za-z0-9_\. ]+)\(\d+\)".*?"input_running":\s*true/
    },
    {
      type: 'mic-off',
      subsystem: 'com.apple.coreaudio:as_server',
      matchSubstring: '\\"input_running\\":false',
      regex: /"session":\{[^}]*"name":"([A-Za-z0-9_\. ]+)\(\d+\)".*?"input_running":\s*false/
    },
    {
      type: 'mic-used',
      subsystem: 'com.apple.audio.AVFAudio',
      matchSubstring: 'AVCaptureDevice was used',
      regex: /AVCaptureDevice was used for audio by "(.*?)"/
    },
    {
      type: 'mic-off',
      subsystem: 'com.apple.audio.AVFAudio',
      matchSubstring: 'AVCaptureDevice was stopped',
      regex: /AVCaptureDevice was stopped being used for audio by "(.*?)"/
    },
    { type: 'mic-used', subsystem: 'com.apple.audio.ASDT', matchSubstring: ': startStream: running state: 1' },
    { type: 'mic-off', subsystem: 'com.apple.audio.ASDT', matchSubstring: ': stopStream: running state: 0' },
    { type: 'mic-used', subsystem: 'com.apple.coreaudio:AUHAL', matchSubstring: 'connecting device' },
    { type: 'mic-off', subsystem: 'com.apple.coreaudio:AUHAL', matchSubstring: 'nothing to teardown' },
    { type: 'mic-used', subsystem: 'com.apple.coremedia', matchSubstring: 'logging capture stack initiator' }
  ];

  start(): void {
    if (this.proc) return;
    console.log('[MicMonitor] start() called');

    const args = ['stream', '--info', '--predicate', this.buildPredicate()];
    const logProcess = spawn('log', args);
    this.proc = logProcess;

    this.proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      const lines = output.split('\n').filter((line: string) => line.trim().length > 0);
      for (const line of lines) {
        for (const rule of this.matchRules) {
          const matchString = rule.matchSubstring.replace(/\\"/g, '"');
          if (line.includes(matchString)) {
            let appNameRaw = '';
            if (rule.regex) {
              const match = rule.regex.exec(line);
              if (match?.[1]) {
                appNameRaw = match[1];
              }
            }
            if (!appNameRaw) {
              console.log('[MicMonitor] failed to extract the app name from a matching rule');
              continue;
            }
            const appName = getMicUsingAppName(appNameRaw);
            if (!appName) break;
            
            console.log(`[MicMonitor] matched rule: ${rule.type} for app: ${appName}`);
            this.emit(rule.type, { app: appName, message: line });
            return;
          }
        }
        console.log('[MicMonitor] no rule matched for log message:', output);
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      console.error('[MicMonitor stderr]', data.toString());
    });

    this.proc.on('exit', (code: number | null) => {
      console.log(`[MicMonitor] exited with code ${code}`);
      if (this.proc === logProcess) {
        this.proc = null;
      }
    });
  }

  buildPredicate(): string {
    return this.matchRules.map((rule) => `(eventMessage CONTAINS "${rule.matchSubstring}")`).join(' || ');
  }

  stop(): void {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  // Type-safe event emitter methods
  on(event: 'mic-used' | 'mic-off', listener: (event: MicEvent) => void): this {
    return super.on(event, listener);
  }

  emit(event: 'mic-used' | 'mic-off', data: MicEvent): boolean {
    return super.emit(event, data);
  }
}

let micMonitor: MicMonitor | null = null;

app.on('before-quit', () => disableMicMonitor());

function enableMicMonitor(window: WindowWithWebContents): void {
  // Check if we're on macOS
  const isMac = process.platform === 'darwin';
  
  if (!micMonitor && isMac) {
    micMonitor = new MicMonitor();
    micMonitor.start();
    micMonitor.on('mic-used', (event: MicEvent) => {
      window.sendToWebContents('unhide-window', null);
      window.sendToWebContents('mic-used', event);
    });
    micMonitor.on('mic-off', (event: MicEvent) => {
      window.sendToWebContents('mic-off', event);
    });
  }
}

function disableMicMonitor(): void {
  if (micMonitor) {
    micMonitor.stop();
    micMonitor = null;
  }
}

// Export functions for use in other modules
export {
  checkMacosVersion,
  startMacNativeRecorder,
  stopMacNativeRecorder,
  enableMicMonitor,
  disableMicMonitor
};