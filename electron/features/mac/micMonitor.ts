import { app } from "electron";
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "node:events";
import { IS_MAC } from "@/shared/constants";
import type { OnboardingWindow } from "../../windows/OnboardingWindow";
import { AppWindow } from "../../windows/AppWindow";

const MIC_APP_MATCH_RULES: [string, string][] = [
  ["VoiceMemos", "Voice Memos"],
  ["Google Chrome", "Google Chrome"],
  ["firefox", "Mozilla Firefox"],
  ["com.apple.WebKit", "Safari"],
  ["zoom.us", "Zoom"],
  ["GoogleMeet", "Google Meet"],
  ["Slack", "Slack"],
  // below are still untested
  ["FaceTime", "FaceTime"],
  ["Discord", "Discord"],
  ["Teams", "Microsoft Teams"],
  ["QuickTimePlayer", "QuickTime Player"],
];

function getAppNameFromIdentifier(identifier: string): string | null {
  for (const [id, name] of MIC_APP_MATCH_RULES) {
    if (identifier.includes(id)) {
      return name;
    }
  }
  return null;
}

interface MicEvent {
  app: string;
  message: string;
}

class MicMonitor extends EventEmitter {
  private proc: ChildProcess | null = null;

  private matchRules = [
    {
      type: "mic-used",
      subsystem: "com.apple.coreaudio:as_server",
      matchSubstring: '\\"input_running\\":true',
      regex: /"session":\{[^}]*"name":"([A-Za-z0-9_. ]+)\(\d+\)".*?"input_running":\s*true/,
    },
    {
      type: "mic-off",
      subsystem: "com.apple.coreaudio:as_server",
      matchSubstring: '\\"input_running\\":false',
      regex: /"session":\{[^}]*"name":"([A-Za-z0-9_. ]+)\(\d+\)".*?"input_running":\s*false/,
    },
    {
      type: "mic-used",
      subsystem: "com.apple.audio.AVFAudio",
      matchSubstring: "AVCaptureDevice was used",
      regex: /AVCaptureDevice was used for audio by "(.*?)"/,
    },
    {
      type: "mic-off",
      subsystem: "com.apple.audio.AVFAudio",
      matchSubstring: "AVCaptureDevice was stopped",
      regex: /AVCaptureDevice was stopped being used for audio by "(.*?)"/,
    },
    {
      type: "mic-used",
      subsystem: "com.apple.audio.ASDT",
      matchSubstring: ": startStream: running state: 1",
    },
    {
      type: "mic-off",
      subsystem: "com.apple.audio.ASDT",
      matchSubstring: ": stopStream: running state: 0",
    },
    // Firefox-specific rules for AUHAL subsystem
    {
      type: "mic-used",
      subsystem: "com.apple.coreaudio:AUHAL",
      matchSubstring: "connecting device",
    },
    {
      type: "mic-off",
      subsystem: "com.apple.coreaudio:AUHAL",
      matchSubstring: "nothing to teardown",
    },
    // Firefox AVCapture rules
    {
      type: "mic-used",
      subsystem: "com.apple.coremedia",
      matchSubstring: "logging capture stack initiator",
    },
  ];
  start(): void {
    if (this.proc) return;
    console.log("Starting mic monitor");

    const args = ["stream", "--info", "--predicate", this.buildPredicate()];
    const logProc = spawn("log", args);
    this.proc = logProc;

    this.proc.stdout?.on("data", (data: Buffer) => {
      const logMessage = data.toString();
      const lines = logMessage.split("\n").filter((line: string) => line.trim().length > 0);
      for (const line of lines) {
        for (const rule of this.matchRules) {
          const matchString = rule.matchSubstring.replace(/\\"/g, '"');
          if (line.includes(matchString)) {
            let appIdentifier = "";
            if (rule.regex) {
              const match = rule.regex.exec(line);
              if (match?.[1]) {
                appIdentifier = match[1];
              }
            }
            if (!appIdentifier) {
              console.log("[MicMonitor] failed to extract the app name from a matching rule");
              continue;
            }
            const appName = getAppNameFromIdentifier(appIdentifier);
            if (!appName) break;
            console.log(`[MicMonitor] matched rule: ${rule.type} for app: ${appName}`);
            this.emit(rule.type, { app: appName, message: line });
            return;
          }
        }
      }
    });

    this.proc.stderr?.on("data", (data: Buffer) => {
      console.log(`[MicMonitor] log process error: ${data.toString()}`);
    });

    this.proc.on("exit", (code) => {
      console.log(`[MicMonitor] exited with code ${code}`);
      if (this.proc === logProc) {
        this.proc = null;
      }
    });
  }
  private buildPredicate(): string {
    return this.matchRules
      .map((rule) => `(eventMessage CONTAINS "${rule.matchSubstring}")`)
      .join(" || ");
  }

  stop(): void {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  on(event: "mic-used" | "mic-off", listener: (event: MicEvent) => void): this {
    return super.on(event, listener);
  }
}

let micMonitorInstance: MicMonitor | null = null;

app.on("before-quit", () => stopMicMonitor());

export function startMicMonitor(window: AppWindow | OnboardingWindow): void {
  if (!micMonitorInstance && IS_MAC) {
    micMonitorInstance = new MicMonitor();
    micMonitorInstance.start();
    micMonitorInstance.on("mic-used", (payload) => {
      window.sendToWebContents("unhide-window", null);
      window.sendToWebContents("mic-used", payload);
    });
    micMonitorInstance.on("mic-off", (payload) => {
      window.sendToWebContents("mic-off", payload);
    });
  }
}

export function stopMicMonitor(): void {
  if (micMonitorInstance) {
    micMonitorInstance.stop();
    micMonitorInstance = null;
  }
}
