# Version Management for Electron Apps in Practice: Auto Updates, Version Checks, and a Better User Experience

- **Source**: https://chenguangliang.com/en/posts/blog177_electron-version-management-guide/
- **Date**: 2 Jun, 2026

---

Anyone who has shipped a desktop app knows version management looks simple but is full of traps. If users don’t upgrade, they complain about bugs; force them to upgrade and they call you hostile. Sloppy version numbers make compatibility impossible to trace when you need to roll back. Silent updates leave users unaware anything changed, while update dialogs risk annoying them.

This article walks through the complete version management system for an Electron app, covering versioning conventions, automatic checks, user notifications, and rollback strategies. It’s not a tutorial-style API walkthrough — it’s a collection of best practices distilled from real production scars.

## Version Numbering: Semantic Versioning

### The Basics

For Electron apps, [Semantic Versioning](https://semver.org/lang/zh-CN/) is the recommended scheme: `MAJOR.MINOR.PATCH`.

```json
{
  "version": "2.3.1",
  "description": "2 (Major).3 (Minor).1 (Patch)"
}
```

- **MAJOR**: incompatible API changes, UI overhauls, data format changes
- **MINOR**: backward-compatible new features
- **PATCH**: backward-compatible bug fixes and performance improvements

### Pre-release Versions

Use pre-release identifiers during development:

```json
// Internal alpha version
{ "version": "2.4.0-alpha.1" }

// Public beta version  
{ "version": "2.4.0-beta.3" }

// Release candidate
{ "version": "2.4.0-rc.1" }
```

### Build Metadata

```json
// Includes build timestamp
{ "version": "2.3.1+build.20260602.1045" }

// Includes Git commit hash
{ "version": "2.3.1+git.a1b2c3d" }
```

### Practical Recommendations

**1. Treat package.json as the single source of truth**

```javascript
// main.js
const { app } = require('electron');
const packageInfo = require('./package.json');

console.log(`Current version: ${packageInfo.version}`);
console.log(`App version: ${app.getVersion()}`); // Automatically reads package.json
```

**2. Wire versioning into your tooling**

```json
{
  "scripts": {
    "version:patch": "npm version patch --no-git-tag-version",
    "version:minor": "npm version minor --no-git-tag-version", 
    "version:major": "npm version major --no-git-tag-version",
    "build:dev": "electron-builder",
    "build:release": "npm run version:patch && electron-builder",
    "release": "npm run build:release && git tag v$(npm pkg get version | tr -d '\"')"
  }
}
```

**3. Distinguish versions across environments**

```javascript
// version.js
const packageInfo = require('./package.json');
const isDev = process.env.NODE_ENV === 'development';
const buildTime = process.env.BUILD_TIME || new Date().toISOString();

module.exports = {
  version: packageInfo.version,
  fullVersion: `${packageInfo.version}${isDev ? '-dev' : ''}`,
  buildTime,
  displayName: isDev ? `${packageInfo.version} (Dev)` : packageInfo.version
};
```

---

## The Auto-Update Mechanism

### Integrating electron-updater

```bash
npm install electron-updater
```

**Main process setup**:

```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Update event listeners
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  mainWindow?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
  mainWindow?.webContents.send('update-not-available');
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
  mainWindow?.webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  log.info(message);
  mainWindow?.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  mainWindow?.webContents.send('update-downloaded', info);
});

// IPC Handlers
ipcMain.handle('get-version-info', async () => {
  return {
    version: app.getVersion(),
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    electron: process.versions.electron,
    node: process.versions.node
  };
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { available: false, reason: 'Development mode' };
  }
  
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: result.updateInfo.version !== app.getVersion() };
  } catch (error) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Preload script**:

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Version information
  getVersionInfo: () => ipcRenderer.invoke('get-version-info'),
  
  // Update checking
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Update event listeners
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  
  // Clean up listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
```

### Release Server Configuration

**GitHub Releases**:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-username",
        "repo": "your-app",
        "private": false
      }
    ]
  }
}
```

**Self-hosted server**:

```json
{
  "build": {
    "publish": [
      {
        "provider": "generic",
        "url": "https://releases.yourapp.com"
      }
    ]
  }
}
```

**Server directory layout**:

```text
releases/
├── latest.yml              # Latest version metadata
├── your-app-2.3.1.exe     # Windows installer
├── your-app-2.3.1.dmg     # macOS installer
└── your-app-2.3.1.AppImage # Linux installer
```

**Sample latest.yml**:

```yaml
version: 2.3.1
files:
  - url: your-app-2.3.1.exe
    sha512: d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5
    size: 87654321
path: your-app-2.3.1.exe
sha512: d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5
releaseDate: '2026-06-02T02:00:00.000Z'
```

---

## UI and UX Design

### Displaying Version Information

**About page**:

```html
<!-- about.html -->
<div class="about-section">
  <h2>Version Information</h2>
  <div class="version-info">
    <div class="version-item">
      <span class="label">Current Version:</span>
      <span class="value" id="current-version">--</span>
    </div>
    <div class="version-item">
      <span class="label">Build Time:</span>
      <span class="value" id="build-time">--</span>
    </div>
    <div class="version-item">
      <span class="label">Electron:</span>
      <span class="value" id="electron-version">--</span>
    </div>
    <div class="version-item">
      <span class="label">Node.js:</span>
      <span class="value" id="node-version">--</span>
    </div>
  </div>
  
  <button id="check-update-btn" class="btn-primary">Check for Updates</button>
  <div id="update-status" class="update-status"></div>
</div>
```

```javascript
// about.js
class AboutPage {
  constructor() {
    this.initVersionInfo();
    this.initUpdateChecker();
  }

  async initVersionInfo() {
    const versionInfo = await window.electronAPI.getVersionInfo();
    
    document.getElementById('current-version').textContent = versionInfo.version;
    document.getElementById('build-time').textContent = new Date(versionInfo.buildTime).toLocaleString();
    document.getElementById('electron-version').textContent = versionInfo.electron;
    document.getElementById('node-version').textContent = versionInfo.node;
  }

  initUpdateChecker() {
    const checkBtn = document.getElementById('check-update-btn');
    const statusDiv = document.getElementById('update-status');

    checkBtn.addEventListener('click', async () => {
      checkBtn.disabled = true;
      statusDiv.innerHTML = '<span class="checking">Checking for updates...</span>';

      try {
        const result = await window.electronAPI.checkForUpdates();
        
        if (result.available) {
          statusDiv.innerHTML = '<span class="available">New version available!</span>';
          this.showUpdateDialog(result.info);
        } else {
          statusDiv.innerHTML = '<span class="up-to-date">Already on latest version</span>';
        }
      } catch (error) {
        statusDiv.innerHTML = `<span class="error">Check failed: ${error.message}</span>`;
      } finally {
        checkBtn.disabled = false;
      }
    });
  }

  showUpdateDialog(updateInfo) {
    const dialog = document.createElement('div');
    dialog.className = 'update-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay">
        <div class="dialog-content">
          <h3>New Version ${updateInfo.version}</h3>
          <div class="release-notes">
            <h4>Release Notes:</h4>
            <div class="notes-content">${this.formatReleaseNotes(updateInfo.releaseNotes)}</div>
          </div>
          <div class="update-size">
            <span>Update Size: ${this.formatFileSize(updateInfo.files[0]?.size || 0)}</span>
          </div>
          <div class="dialog-actions">
            <button class="btn-secondary" id="later-btn">Remind Me Later</button>
            <button class="btn-primary" id="update-btn">Update Now</button>
          </div>
          <div class="progress-container" id="progress-container" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="progress-text" id="progress-text">Preparing download...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Event handling
    document.getElementById('later-btn').onclick = () => {
      // Clean up event listeners
      window.electronAPI.removeAllListeners('update-download-progress');
      window.electronAPI.removeAllListeners('update-downloaded');
      window.electronAPI.removeAllListeners('update-error');
      document.body.removeChild(dialog);
    };

    document.getElementById('update-btn').onclick = () => {
      this.startUpdate(dialog);
    };
  }

  async startUpdate(dialog) {
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const updateBtn = document.getElementById('update-btn');
    const laterBtn = document.getElementById('later-btn');

    updateBtn.style.display = 'none';
    laterBtn.style.display = 'none';
    progressContainer.style.display = 'block';

    // Listen for download progress
    window.electronAPI.onUpdateDownloadProgress((event, progress) => {
      const percent = Math.round(progress.percent);
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `Downloading... ${percent}% (${this.formatFileSize(progress.transferred)}/${this.formatFileSize(progress.total)})`;
    });

    // Listen for download completion
    window.electronAPI.onUpdateDownloaded((event, info) => {
      progressText.textContent = 'Download complete, preparing install...';
      
      setTimeout(() => {
        window.electronAPI.installUpdate();
      }, 2000);
    });

    // Listen for download errors
    window.electronAPI.onUpdateError((event, error) => {
      progressText.textContent = `Download failed: ${error}`;
      updateBtn.style.display = 'inline-block';
      laterBtn.style.display = 'inline-block';
      progressContainer.style.display = 'none';
    });

    // Start download
    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      progressText.textContent = `Download failed: ${error.message}`;
      updateBtn.style.display = 'inline-block';
      laterBtn.style.display = 'inline-block';
      progressContainer.style.display = 'none';
    }
  }

  formatReleaseNotes(notes) {
    if (!notes) return 'No release notes available';
    
    // Simple Markdown parsing
    return notes
      .replace(/### (.+)/g, '<h4>$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/- (.+)/g, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  new AboutPage();
});
```

### Notification Styles

```css
/* update-styles.css */
.update-status {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.update-status .checking {
  color: #1890ff;
}

.update-status .available {
  color: #52c41a;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}

.update-status .up-to-date {
  color: #595959;
  background-color: #fafafa;
  border: 1px solid #d9d9d9;
}

.update-status .error {
  color: #ff4d4f;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
}

.update-dialog .dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.update-dialog .dialog-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.update-dialog h3 {
  margin-top: 0;
  color: #262626;
}

.release-notes {
  margin: 16px 0;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.release-notes h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #595959;
  font-size: 14px;
}

.notes-content {
  font-size: 13px;
  line-height: 1.5;
  color: #262626;
}

.update-size {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #40a9ff;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #595959;
}

.btn-secondary:hover {
  background-color: #e6f7ff;
}

.progress-container {
  margin-top: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #1890ff;
  transition: width 0.3s ease;
  width: 0%;
}

.progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #595959;
  text-align: center;
}
```

---

## Update Strategies and User Control

### Update Strategy Configuration

```javascript
// updateConfig.js
const UpdateConfig = {
  // Update checking frequency
  checkInterval: {
    startup: true,              // Check on startup
    intervalHours: 24,          // Periodic check interval (hours)
    onFocus: false,             // Check on window focus
    manual: true                // Allow manual checks
  },

  // Update behavior
  behavior: {
    autoDownload: false,        // Auto download updates
    silentInstall: false,       // Silent installation
    forceUpdate: false,         // Mandatory update
    allowSkip: true,            // Allow skipping versions
    allowDefer: true,           // Allow deferring updates
    deferMaxDays: 7            // Max deferral days
  },

  // Notification settings
  notification: {
    checkingVisible: false,     // Show checking status
    notAvailableVisible: false, // Show no update message
    errorVisible: true,         // Show error messages
    progressVisible: true,      // Show download progress
    completedTimeout: 3000     // Completion message timeout (ms)
  },

  // Version control
  versionControl: {
    skipVersions: [],           // Skipped versions list
    requiredVersion: null,      // Mandatory minimum version
    deprecatedVersions: [],     // Deprecated versions list
    migrationRequired: []       // Versions requiring migration
  }
};

module.exports = UpdateConfig;
```

### Persisting User Preferences

```javascript
// userPreferences.js
const Store = require('electron-store');

class UpdatePreferences {
  constructor() {
    this.store = new Store({
      name: 'update-preferences',
      defaults: {
        autoCheck: true,
        autoDownload: false,
        notifyOnAvailable: true,
        skippedVersions: [],
        lastCheckTime: null,
        deferredUpdates: {}
      }
    });
  }

  // Auto-check settings
  setAutoCheck(enabled) {
    this.store.set('autoCheck', enabled);
  }

  getAutoCheck() {
    return this.store.get('autoCheck');
  }

  // Auto-download settings
  setAutoDownload(enabled) {
    this.store.set('autoDownload', enabled);
  }

  getAutoDownload() {
    return this.store.get('autoDownload');
  }

  // Skip version
  skipVersion(version) {
    const skipped = this.store.get('skippedVersions', []);
    if (!skipped.includes(version)) {
      skipped.push(version);
      this.store.set('skippedVersions', skipped);
    }
  }

  isVersionSkipped(version) {
    return this.store.get('skippedVersions', []).includes(version);
  }

  // Defer update
  deferUpdate(version, until) {
    const deferred = this.store.get('deferredUpdates', {});
    deferred[version] = until;
    this.store.set('deferredUpdates', deferred);
  }

  isDeferredUpdate(version) {
    const deferred = this.store.get('deferredUpdates', {});
    const deferUntil = deferred[version];
    
    if (!deferUntil) return false;
    
    return new Date() < new Date(deferUntil);
  }

  // Clean up expired deferrals
  cleanupExpiredDefers() {
    const deferred = this.store.get('deferredUpdates', {});
    const now = new Date();
    
    Object.keys(deferred).forEach(version => {
      if (now >= new Date(deferred[version])) {
        delete deferred[version];
      }
    });
    
    this.store.set('deferredUpdates', deferred);
  }

  // Last update check timestamp
  updateLastCheckTime() {
    this.store.set('lastCheckTime', new Date().toISOString());
  }

  getLastCheckTime() {
    return this.store.get('lastCheckTime');
  }
}

module.exports = UpdatePreferences;
```

### Smart Update Logic

```javascript
// smartUpdater.js
const { autoUpdater } = require('electron-updater');
const UpdatePreferences = require('./userPreferences');
const UpdateConfig = require('./updateConfig');

class SmartUpdater {
  constructor() {
    this.preferences = new UpdatePreferences();
    this.lastCheckTime = null;
    this.isChecking = false;
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // Custom update check logic
    autoUpdater.autoDownload = false; // Disable auto download
    autoUpdater.autoInstallOnAppQuit = false; // Disable install on quit
    
    autoUpdater.on('update-available', (info) => {
      this.handleUpdateAvailable(info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.handleUpdateDownloaded(info);
    });
  }

  async checkForUpdates(manual = false) {
    if (this.isChecking) return false;
    
    // Check user preferences
    if (!manual && !this.preferences.getAutoCheck()) {
      return false;
    }

    // Check time interval
    const lastCheck = this.preferences.getLastCheckTime();
    if (!manual && lastCheck) {
      const hoursSinceCheck = (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck < UpdateConfig.checkInterval.intervalHours) {
        return false;
      }
    }

    this.isChecking = true;
    
    try {
      const result = await autoUpdater.checkForUpdates();
      this.preferences.updateLastCheckTime();
      return result;
    } catch (error) {
      console.error('Update check failed:', error);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  handleUpdateAvailable(updateInfo) {
    const version = updateInfo.version;

    // Check if user skipped version
    if (this.preferences.isVersionSkipped(version)) {
      console.log(`Version ${version} is skipped by user`);
      return;
    }

    // Check if user deferred version
    if (this.preferences.isDeferredUpdate(version)) {
      console.log(`Version ${version} is deferred by user`);
      return;
    }

    // Check if update is mandatory
    if (this.isForceUpdate(version)) {
      this.showForceUpdateDialog(updateInfo);
      return;
    }

    // Check auto download settings
    if (this.preferences.getAutoDownload()) {
      autoUpdater.downloadUpdate();
    } else {
      this.showUpdateNotification(updateInfo);
    }
  }

  isForceUpdate(version) {
    const currentVersion = require('../package.json').version;
    const requiredVersion = UpdateConfig.versionControl.requiredVersion;
    
    if (!requiredVersion) return false;
    
    return this.compareVersions(currentVersion, requiredVersion) < 0;
  }

  showUpdateNotification(updateInfo) {
    // Send notification to renderer
    if (this.window) {
      this.window.webContents.send('show-update-notification', updateInfo);
    }
  }

  showForceUpdateDialog(updateInfo) {
    // Display mandatory update dialog
    if (this.window) {
      this.window.webContents.send('show-force-update', updateInfo);
    }
  }

  handleUpdateDownloaded(updateInfo) {
    // Update downloaded, ask user to install
    if (this.window) {
      this.window.webContents.send('update-ready-to-install', updateInfo);
    }
  }

  // User action interface
  async downloadUpdate() {
    return autoUpdater.downloadUpdate();
  }

  installUpdate() {
    autoUpdater.quitAndInstall();
  }

  skipVersion(version) {
    this.preferences.skipVersion(version);
  }

  deferUpdate(version, days = 7) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    this.preferences.deferUpdate(version, until);
  }

  // Version comparison utility
  compareVersions(version1, version2) {
    const v1 = version1.split('.').map(n => parseInt(n, 10));
    const v2 = version2.split('.').map(n => parseInt(n, 10));
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      
      if (a > b) return 1;
      if (a < b) return -1;
    }
    
    return 0;
  }

  setWindow(window) {
    this.window = window;
  }
}

module.exports = SmartUpdater;
```

---

## Rollback and Compatibility Management

### Version Rollback Mechanism

```javascript
// versionManager.js
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class VersionManager {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.backupPath = path.join(this.userDataPath, 'backups');
    this.versionHistoryFile = path.join(this.userDataPath, 'version-history.json');
    this.initializeVersionTracking();
  }

  async initializeVersionTracking() {
    await fs.ensureDir(this.backupPath);
    
    if (!await fs.pathExists(this.versionHistoryFile)) {
      await this.createVersionHistory();
    }
  }

  async createVersionHistory() {
    const currentVersion = app.getVersion();
    const history = {
      current: currentVersion,
      previous: null,
      versions: [
        {
          version: currentVersion,
          installDate: new Date().toISOString(),
          dataVersion: '1.0',
          compatible: true
        }
      ]
    };

    await fs.writeJson(this.versionHistoryFile, history, { spaces: 2 });
  }

  async recordVersionUpdate(newVersion, dataVersion = null) {
    const history = await this.getVersionHistory();
    const oldVersion = history.current;

    // Backup current version data
    await this.backupCurrentData(oldVersion);

    // Update version history
    history.previous = oldVersion;
    history.current = newVersion;
    history.versions.push({
      version: newVersion,
      installDate: new Date().toISOString(),
      dataVersion: dataVersion || await this.detectDataVersion(),
      compatible: await this.checkCompatibility(oldVersion, newVersion),
      previousVersion: oldVersion
    });

    await fs.writeJson(this.versionHistoryFile, history, { spaces: 2 });
  }

  async backupCurrentData(version) {
    const backupDir = path.join(this.backupPath, version);
    await fs.ensureDir(backupDir);

    // Backup critical data files
    const filesToBackup = [
      'config.json',
      'user-preferences.json',
      'data.db',
      'cache'
    ];

    for (const file of filesToBackup) {
      const sourcePath = path.join(this.userDataPath, file);
      const targetPath = path.join(backupDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
      }
    }

    // Record backup details
    const backupInfo = {
      version,
      timestamp: new Date().toISOString(),
      files: filesToBackup,
      appVersion: app.getVersion()
    };

    await fs.writeJson(path.join(backupDir, 'backup-info.json'), backupInfo, { spaces: 2 });
  }

  async canRollback() {
    const history = await this.getVersionHistory();
    return history.previous && await this.hasBackup(history.previous);
  }

  async rollback() {
    const history = await this.getVersionHistory();
    const targetVersion = history.previous;

    if (!targetVersion) {
      throw new Error('No previous version to rollback to');
    }

    const backupDir = path.join(this.backupPath, targetVersion);
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup not found for version ${targetVersion}`);
    }

    // Backup current data (in case rollback fails)
    await this.backupCurrentData(history.current + '-rollback-backup');

    // Restore data
    await this.restoreBackup(targetVersion);

    // Update version history
    const currentVersion = history.current;
    history.current = targetVersion;
    history.previous = null;
    history.versions.push({
      version: targetVersion,
      installDate: new Date().toISOString(),
      dataVersion: await this.detectDataVersion(),
      compatible: true,
      rollbackFrom: currentVersion,
      isRollback: true
    });

    await fs.writeJson(this.versionHistoryFile, history, { spaces: 2 });

    return targetVersion;
  }

  async restoreBackup(version) {
    const backupDir = path.join(this.backupPath, version);
    const backupInfo = await fs.readJson(path.join(backupDir, 'backup-info.json'));

    for (const file of backupInfo.files) {
      const sourcePath = path.join(backupDir, file);
      const targetPath = path.join(this.userDataPath, file);

      if (await fs.pathExists(sourcePath)) {
        // Delete existing files/directories
        if (await fs.pathExists(targetPath)) {
          await fs.remove(targetPath);
        }
        
        // Restore backup
        await fs.copy(sourcePath, targetPath);
      }
    }
  }

  async getVersionHistory() {
    return await fs.readJson(this.versionHistoryFile);
  }

  async hasBackup(version) {
    const backupDir = path.join(this.backupPath, version);
    return await fs.pathExists(path.join(backupDir, 'backup-info.json'));
  }

  async checkCompatibility(oldVersion, newVersion) {
    // Simple compatibility check logic
    const oldMajor = parseInt(oldVersion.split('.')[0]);
    const newMajor = parseInt(newVersion.split('.')[0]);

    // Major version mismatch, potential incompatibility
    if (oldMajor !== newMajor) {
      return false;
    }

    return true;
  }

  async detectDataVersion() {
    // Detect data version from file structure
    const configPath = path.join(this.userDataPath, 'config.json');
    
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      return config.dataVersion || '1.0';
    }

    return '1.0';
  }

  // Clean up old backups
  async cleanupOldBackups(keepVersions = 5) {
    const history = await this.getVersionHistory();
    const allVersions = history.versions
      .sort((a, b) => new Date(b.installDate) - new Date(a.installDate))
      .map(v => v.version);

    const versionsToRemove = allVersions.slice(keepVersions);

    for (const version of versionsToRemove) {
      const backupDir = path.join(this.backupPath, version);
      if (await fs.pathExists(backupDir)) {
        await fs.remove(backupDir);
      }
    }
  }
}

module.exports = VersionManager;
```

### Handling Data Migration

```javascript
// dataMigration.js
const fs = require('fs-extra');
const path = require('path');

class DataMigration {
  constructor() {
    this.migrations = new Map();
    this.registerMigrations();
  }

  registerMigrations() {
    // Register migration logic per version
    this.migrations.set('1.0.0->2.0.0', this.migrateV1ToV2.bind(this));
    this.migrations.set('2.0.0->2.1.0', this.migrateV2ToV21.bind(this));
    this.migrations.set('2.1.0->3.0.0', this.migrateV21ToV3.bind(this));
  }

  async migrate(fromVersion, toVersion, userDataPath) {
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    
    if (!migrationPath.length) {
      throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
    }

    console.log(`Migration path: ${migrationPath.join(' -> ')}`);

    for (let i = 0; i < migrationPath.length - 1; i++) {
      const from = migrationPath[i];
      const to = migrationPath[i + 1];
      const migrationKey = `${from}->${to}`;

      if (this.migrations.has(migrationKey)) {
        console.log(`Running migration: ${migrationKey}`);
        await this.migrations.get(migrationKey)(userDataPath);
      }
    }
  }

  findMigrationPath(from, to) {
    // Simplified: assumes versions increase linearly
    const versions = ['1.0.0', '2.0.0', '2.1.0', '3.0.0'];
    const fromIndex = versions.indexOf(from);
    const toIndex = versions.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    if (fromIndex < toIndex) {
      return versions.slice(fromIndex, toIndex + 1);
    }

    return [];
  }

  async migrateV1ToV2(userDataPath) {
    // Migration logic for 1.0 -> 2.0
    const oldConfigPath = path.join(userDataPath, 'config.json');
    const newConfigPath = path.join(userDataPath, 'v2-config.json');

    if (await fs.pathExists(oldConfigPath)) {
      const oldConfig = await fs.readJson(oldConfigPath);
      
      // Transform configuration format
      const newConfig = {
        version: '2.0',
        dataVersion: '2.0',
        settings: {
          ui: oldConfig.ui || {},
          advanced: oldConfig.advanced || {},
          // Add new fields
          notifications: {
            enabled: true,
            types: ['update', 'error']
          }
        }
      };

      await fs.writeJson(newConfigPath, newConfig, { spaces: 2 });
      await fs.rename(oldConfigPath, path.join(userDataPath, 'config-v1-backup.json'));
      await fs.rename(newConfigPath, oldConfigPath);
    }
  }

  async migrateV2ToV21(userDataPath) {
    // Migration logic for 2.0 -> 2.1 (Minor update)
    const configPath = path.join(userDataPath, 'config.json');

    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      
      // Add config for new features
      if (!config.settings.experimental) {
        config.settings.experimental = {
          enabled: false,
          features: []
        };
      }

      config.dataVersion = '2.1';
      await fs.writeJson(configPath, config, { spaces: 2 });
    }
  }

  async migrateV21ToV3(userDataPath) {
    // Migration logic for 2.1 -> 3.0 (Major update)
    const configPath = path.join(userDataPath, 'config.json');
    const dbPath = path.join(userDataPath, 'data.db');

    // Major config structure changes
    if (await fs.pathExists(configPath)) {
      const oldConfig = await fs.readJson(configPath);
      
      const newConfig = {
        version: '3.0',
        dataVersion: '3.0',
        core: {
          engine: oldConfig.settings?.advanced?.engine || 'default',
          performance: oldConfig.settings?.advanced?.performance || 'balanced'
        },
        interface: oldConfig.settings?.ui || {},
        features: {
          notifications: oldConfig.settings?.notifications || {},
          experimental: oldConfig.settings?.experimental || {}
        }
      };

      await fs.writeJson(configPath, newConfig, { spaces: 2 });
    }

    // Database schema migration
    if (await fs.pathExists(dbPath)) {
      // A proper DB migration tool should be used here
      console.log('Database schema migration required for v3.0');
      // await migrateDatabase(dbPath);
    }
  }
}

module.exports = DataMigration;
```

---

## Production Best Practices

### The Release Pipeline

```javascript
// release.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class ReleaseManager {
  constructor() {
    this.packageJson = require('./package.json');
    this.currentVersion = this.packageJson.version;
  }

  async release(type = 'patch') {
    console.log(`Starting ${type} release from ${this.currentVersion}`);

    // 1. Check workspace status
    await this.checkWorkspaceClean();

    // 2. Run tests
    await this.runTests();

    // 3. Update version number
    const newVersion = await this.updateVersion(type);

    // 4. Generate changelog
    await this.generateChangelog(newVersion);

    // 5. Build application
    await this.build();

    // 6. Code signing verification
    await this.verifySignatures();

    // 7. Commit changes
    await this.commitChanges(newVersion);

    // 8. Create Git tag
    await this.createTag(newVersion);

    // 9. Publish release
    await this.publish();

    // 10. Push to remote
    await this.pushToRemote(newVersion);

    console.log(`Release ${newVersion} completed successfully!`);
    return newVersion;
  }

  async checkWorkspaceClean() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        throw new Error('Working directory is not clean. Please commit or stash changes.');
      }
    } catch (error) {
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }

  async runTests() {
    console.log('Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
    } catch (error) {
      throw new Error('Tests failed. Please fix issues before releasing.');
    }
  }

  async updateVersion(type) {
    console.log(`Updating version (${type})...`);
    
    const output = execSync(`npm version ${type} --no-git-tag-version`, { encoding: 'utf8' });
    const newVersion = output.trim().replace('v', '');
    
    console.log(`Version updated to ${newVersion}`);
    return newVersion;
  }

  async generateChangelog(version) {
    console.log('Generating changelog...');
    
    // Generate changelog using git log
    const sinceTag = this.getLastTag();
    const gitLog = sinceTag 
      ? execSync(`git log ${sinceTag}..HEAD --oneline`, { encoding: 'utf8' })
      : execSync('git log --oneline', { encoding: 'utf8' });

    const changes = gitLog
      .split('\n')
      .filter(line => line.trim())
      .map(line => `- ${line.split(' ').slice(1).join(' ')}`)
      .join('\n');

    const changelogEntry = `## [${version}] - ${new Date().toISOString().split('T')[0]}

${changes}

`;

    // Update CHANGELOG.md
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (await fs.pathExists(changelogPath)) {
      const existingChangelog = await fs.readFile(changelogPath, 'utf8');
      await fs.writeFile(changelogPath, changelogEntry + existingChangelog);
    } else {
      await fs.writeFile(changelogPath, `# Changelog\n\n${changelogEntry}`);
    }
  }

  getLastTag() {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  async build() {
    console.log('Building application...');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async verifySignatures() {
    console.log('Verifying signatures...');
    
    // Verify build artifacts are signed
    const distPath = path.join(process.cwd(), 'dist');
    if (!await fs.pathExists(distPath)) {
      throw new Error('Build output not found');
    }

    // Custom signature validation logic goes here
    console.log('Signature verification passed');
  }

  async commitChanges(version) {
    console.log('Committing changes...');
    
    execSync('git add -A');
    execSync(`git commit -m "chore: release v${version}"`);
  }

  async createTag(version) {
    console.log(`Creating tag v${version}...`);
    
    execSync(`git tag -a v${version} -m "Release v${version}"`);
  }

  async publish() {
    console.log('Publishing to distribution channels...');
    
    try {
      // Publish to GitHub Releases
      execSync('npm run electron:publish', { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Publish failed: ${error.message}`);
    }
  }

  async pushToRemote(version) {
    console.log('Pushing to remote...');
    
    execSync('git push origin main');
    execSync(`git push origin v${version}`);
  }
}

// Usage example
if (require.main === module) {
  const releaseType = process.argv[2] || 'patch';
  const releaseManager = new ReleaseManager();
  
  releaseManager.release(releaseType)
    .catch(error => {
      console.error('Release failed:', error.message);
      process.exit(1);
    });
}
```

### Monitoring and Analytics

```javascript
// analytics.js
const { net, app } = require('electron');
const Store = require('electron-store');

class UpdateAnalytics {
  constructor() {
    this.store = new Store({
      name: 'update-analytics',
      defaults: {
        updateHistory: [],
        userBehavior: {
          autoUpdateEnabled: null,
          averageInstallTime: null,
          skipRate: 0,
          deferRate: 0
        }
      }
    });
  }

  recordUpdateCheck(result) {
    const record = {
      timestamp: new Date().toISOString(),
      currentVersion: app.getVersion(),
      availableVersion: result?.updateInfo?.version,
      hasUpdate: !!result?.updateInfo,
      checkDuration: result?.checkDuration,
      source: result?.source || 'auto' // auto, manual, startup
    };

    this.addToHistory('updateCheck', record);
  }

  recordUpdateDownload(updateInfo, downloadStats) {
    const record = {
      timestamp: new Date().toISOString(),
      version: updateInfo.version,
      size: updateInfo.files[0]?.size,
      downloadTime: downloadStats.duration,
      averageSpeed: downloadStats.averageSpeed,
      success: downloadStats.success,
      error: downloadStats.error
    };

    this.addToHistory('updateDownload', record);
  }

  recordUpdateInstall(updateInfo, installStats) {
    const record = {
      timestamp: new Date().toISOString(),
      fromVersion: app.getVersion(),
      toVersion: updateInfo.version,
      installTime: installStats.duration,
      success: installStats.success,
      error: installStats.error,
      userInitiated: installStats.userInitiated
    };

    this.addToHistory('updateInstall', record);

    // Update user behavior statistics
    this.updateBehaviorStats();
  }

  recordUserAction(action, context = {}) {
    const actions = ['skip', 'defer', 'download', 'install', 'cancel'];
    
    if (actions.includes(action)) {
      const record = {
        timestamp: new Date().toISOString(),
        action,
        version: context.version,
        context
      };

      this.addToHistory('userAction', record);
    }
  }

  addToHistory(type, record) {
    const history = this.store.get('updateHistory', []);
    history.push({ type, ...record });

    // Retain recent 100 records
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.store.set('updateHistory', history);
  }

  updateBehaviorStats() {
    const history = this.store.get('updateHistory', []);
    const userActions = history.filter(h => h.type === 'userAction');
    const installs = history.filter(h => h.type === 'updateInstall');

    const totalActions = userActions.length;
    const skipActions = userActions.filter(a => a.action === 'skip').length;
    const deferActions = userActions.filter(a => a.action === 'defer').length;

    const avgInstallTime = installs.length > 0
      ? installs.reduce((sum, i) => sum + (i.installTime || 0), 0) / installs.length
      : 0;

    this.store.set('userBehavior', {
      autoUpdateEnabled: this.store.get('update-preferences.autoDownload', false),
      averageInstallTime: avgInstallTime,
      skipRate: totalActions > 0 ? skipActions / totalActions : 0,
      deferRate: totalActions > 0 ? deferActions / totalActions : 0,
      totalUpdates: installs.length,
      successRate: installs.length > 0 
        ? installs.filter(i => i.success).length / installs.length
        : 0
    });
  }

  getAnalytics() {
    return {
      history: this.store.get('updateHistory', []),
      behavior: this.store.get('userBehavior', {}),
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const history = this.store.get('updateHistory', []);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentHistory = history.filter(h => 
      new Date(h.timestamp) >= thirtyDaysAgo
    );

    const updateChecks = recentHistory.filter(h => h.type === 'updateCheck');
    const downloads = recentHistory.filter(h => h.type === 'updateDownload');
    const installs = recentHistory.filter(h => h.type === 'updateInstall');

    return {
      period: '30 days',
      updateChecks: updateChecks.length,
      updatesFound: updateChecks.filter(c => c.hasUpdate).length,
      downloads: downloads.length,
      successfulDownloads: downloads.filter(d => d.success).length,
      installs: installs.length,
      successfulInstalls: installs.filter(i => i.success).length,
      averageDownloadSpeed: downloads.length > 0
        ? downloads.reduce((sum, d) => sum + (d.averageSpeed || 0), 0) / downloads.length
        : 0,
      averageInstallTime: installs.length > 0
        ? installs.reduce((sum, i) => sum + (i.installTime || 0), 0) / installs.length
        : 0
    };
  }

  // Send anonymous telemetry (optional)
  async sendAnonymousStats() {
    if (!this.store.get('analytics.enabled', false)) {
      return;
    }

    const stats = {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      behavior: this.store.get('userBehavior', {}),
      summary: this.generateSummary()
    };

    try {
      // Send to analytics server (replace with actual endpoint)
      const request = net.request({
        method: 'POST',
        url: 'https://analytics.yourapp.com/update-stats',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      request.write(JSON.stringify(stats));
      request.end();

    } catch (error) {
      console.warn('Failed to send analytics:', error.message);
    }
  }
}

module.exports = UpdateAnalytics;
```

---

## Wrapping Up

Version management for Electron apps isn’t just a technical exercise — it’s user experience design. From versioning conventions to update strategies, from user notifications to data migration, every link in the chain shapes how much users trust your product.

**Core principles**:

1. **Transparent but not intrusive**: let users know what’s changing, but never force-interrupt their workflow
2. **Progressive enhancement**: prioritize bug fixes; make feature updates optional and reversible
3. **Data safety first**: a failed update must never lose user data
4. **Rollback-ready and observable**: recover fast when things break, and use data to understand user habits

On the technical side, electron-updater plus smart update policies plus a solid backup mechanism covers most scenarios. The real differentiator, though, is **understanding the rhythm of your users’ work** — when to notify, how to notify, and how much control to hand over.

Getting version management right is, at its core, getting product lifecycle management right.

---

**Related reading**:

- [Cracking Open the Electron safeStorage Black Box: AES-128-CBC, a Hardcoded IV, and the Things Nobody Tells You](https://chenguangliang.com/en/posts/blog169_electron-credential-storage-security/) - Secure storage mechanisms relevant to version management
- [A Lightweight Electron Alternative: A Deep Dive into electrobun](https://chenguangliang.com/en/posts/blog071_electrobun-electron-alternative/) - Comparing technology choices within the Electron ecosystem
- [Flutter Desktop vs Electron: What Migration Patterns in 2026 Tell Us About Choosing a Desktop Framework](https://chenguangliang.com/en/posts/blog172_flutter-vs-electron-desktop/) - A comparative analysis of desktop application tech stacks
