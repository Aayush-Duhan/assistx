/**
 * Browser/Electron Renderer Shim for the 'ws' (WebSocket) Node.js package.
 *
 * PURPOSE:
 * This file acts as a replacement for the 'ws' package when building code
 * for a browser-like environment. If any code (especially from a third-party
 * library) tries to import 'ws', the bundler's alias will point to this
 * file instead.
 *
 * When the code attempts to use the imported module, this shim will throw a
 * clear, informative error, guiding the developer to use the correct,
 * built-in browser API.
 *
 * USAGE:
 * This file is not meant to be imported directly in your application code.
 * Instead, configure your bundler (Vite, Webpack, etc.) to alias the 'ws'
 * package to this file.
 *
 * Example (vite.config.js):
 *   resolve: {
 *     alias: {
 *       'ws': './path/to/this/ws-browser-shim.js'
 *     }
 *   }
 */

function WebSocketShim() {
  // Throw an error immediately when an attempt is made to instantiate it.
  throw new Error(
    "The 'ws' package is for Node.js and does not work in a browser or Electron renderer. Use the native global WebSocket object instead.",
  );
}

// Export the function as the default export to correctly mimic the 'ws' package's main export.
export default WebSocketShim;
