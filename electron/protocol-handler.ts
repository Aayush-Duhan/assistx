import { URL } from "node:url";
import { EventEmitter } from "node:events";
import { electronAppUniversalProtocolClient } from 'electron-app-universal-protocol-client';
import { app } from 'electron';
import { windowManager } from "./windows/WindowManager";
import { updateSharedState } from "./utils/shared/stateManager";

const PROTOCOL_NAME = "assistx";
const isDev = process.env.NODE_ENV === "development";

// Simple event bus for main-process consumers (e.g., MCP OAuth manager)
const protocolEvents = new EventEmitter();
let initialProtocolUrl: string | null = null;

export function setInitialProtocolUrl(url: string): void {
	initialProtocolUrl = url;
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
			windowManager.sendToWebContents("mcp-oauth-callback", { code, state, __rawUrl: url });
			return;
		}

		// Generic route: deliver host as channel with params and pathname
		windowManager.sendToWebContents('protocol-data', { host, pathname, params });
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
	electronAppUniversalProtocolClient.on('request', (url) => {
		windowManager.handleDockIcon();
		updateSharedState({ showDashboard: true });
		windowManager.getOnboardingWindow()?.window.show();
		handleProtocolUrl(url);
	});

	electronAppUniversalProtocolClient.initialize({
		protocol: PROTOCOL_NAME,
		mode: isDev ? 'development' : 'production',
	});

	processArgvForProtocol(process.argv);

	app.on('activate', () => {
		windowManager.handleDockIcon();
		updateSharedState({ showDashboard: true });
	});

	app.on('second-instance', (_event, argv) => {
		updateSharedState({ showDashboard: true });
		processArgvForProtocol(argv);
	});

	if (initialProtocolUrl) {
		handleProtocolUrl(initialProtocolUrl);
		initialProtocolUrl = null;
	}
}

// Allow other main-process modules to subscribe to MCP OAuth callbacks
export function onMcpOAuthCallback(
	handler: (payload: { code: string; state: string; url: string }) => void,
): () => void {
	protocolEvents.on("mcp-oauth-callback", handler);
	return () => protocolEvents.off("mcp-oauth-callback", handler);
}