import { URL } from "node:url";
import { EventEmitter } from "node:events";
import { electronAppUniversalProtocolClient } from 'electron-app-universal-protocol-client';
import { app } from 'electron';
import { windowManager } from "./windows/WindowManager";

const PROTOCOL_NAME = "assistx";
const isDev = process.env.NODE_ENV === "development";

// Simple event bus for main-process consumers (e.g., MCP OAuth manager)
const protocolEvents = new EventEmitter();

// Queue deep links that arrive before a window is ready
let pendingProtocolUrls: string[] = [];

function deliverToRenderer(channel: string, payload: any) {
	const currentWindow = windowManager.getCurrentWindow();
	if (currentWindow && !currentWindow.isDestroyed()) {
		currentWindow.sendToWebContents(channel, payload);
	} else {
		// No window available; queue as a generic URL to reprocess later
		pendingProtocolUrls.push(payload?.__rawUrl || channel);
	}
}

function handleProtocolUrl(url: string) {
	try {
		const parsedUrl = new URL(url);
		const host = parsedUrl.hostname; // e.g., 'mcp'
		const pathname = parsedUrl.pathname || "/"; // e.g., '/oauth/callback'
		const params = Object.fromEntries(parsedUrl.searchParams);

		// Special-case MCP OAuth callback: assistx://mcp/oauth/callback?code=...&state=...
		if (host === "mcp" && pathname.replace(/\/+$/, '') === "/oauth/callback") {
			const code = params["code"] as string | undefined;
			const state = params["state"] as string | undefined;
			if (!code || !state) {
				console.error("MCP OAuth callback missing code/state", { code, state });
				return;
			}
			// Notify main-process listeners
			protocolEvents.emit("mcp-oauth-callback", { code, state, url });
			// Also notify renderer (optional UI handling)
			deliverToRenderer("mcp-oauth-callback", { code, state, __rawUrl: url });
			return;
		}

		// Generic route: deliver host as channel with params and pathname
		deliverToRenderer(host, { ...params, __pathname: pathname, __rawUrl: url });
	} catch (error) {
		console.error(`Failed to handle protocol URL: ${url}`, error);
	}
}

function processArgvForProtocol(argv: string[]): void {
	const protocolUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL_NAME}://`));
	if (protocolUrl) {
		handleProtocolUrl(protocolUrl);
	}
}

export function setupMainProtocolHandlers(): void {
	// Drain any queued deep links when the window changes/appears
	windowManager.onWindowChange(() => {
		if (pendingProtocolUrls.length) {
			for (const url of pendingProtocolUrls.splice(0)) {
				handleProtocolUrl(url);
			}
		}
	});

	electronAppUniversalProtocolClient.on('request', (url) => {
		console.log(`Received protocol request: ${url}`);
		windowManager.handleDockIcon();
		const currentWindow = windowManager.getCurrentWindow();
		if (currentWindow?.show) currentWindow.show();
		currentWindow?.sendToWebContents("unhide-window", null);
		handleProtocolUrl(url);
	});

	electronAppUniversalProtocolClient.initialize({
		protocol: PROTOCOL_NAME,
		mode: isDev ? 'development' : 'production',
	});

	processArgvForProtocol(process.argv);

	app.on('second-instance', (_event, argv) => {
		const currentWindow = windowManager.getCurrentWindow();
		currentWindow?.sendToWebContents("unhide-window", null);
		processArgvForProtocol(argv);
	});
}

// Allow other main-process modules to subscribe to MCP OAuth callbacks
export function onMcpOAuthCallback(
	handler: (payload: { code: string; state: string; url: string }) => void,
): () => void {
	protocolEvents.on("mcp-oauth-callback", handler);
	return () => protocolEvents.off("mcp-oauth-callback", handler);
}