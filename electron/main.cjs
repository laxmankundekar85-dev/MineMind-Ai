const { app, BrowserWindow, session } = require('electron');
const http = require('node:http');
const path = require('node:path');

// Load environment variables so GEMINI_API_KEY and others are present in Electron
try {
  require('dotenv').config();
} catch {}

// Ensure speech and audio media flags are enabled
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');
app.commandLine.appendSwitch('enable-media-stream');

if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

const PORT = Number(process.env.PORT || 3000);
let mainWindow;

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Local server did not start within ${timeoutMs / 1000} seconds.`));
          return;
        }
        setTimeout(check, 250);
      });
    };

    check();
  });
}

async function startLocalServer() {
  const serverPath = path.join(app.getAppPath(), 'dist', 'server.cjs');
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);
  process.env.MINEMIND_DIST_PATH = path.join(app.getAppPath(), 'dist');
  require(serverPath);
  await waitForServer(`http://localhost:${PORT}`);
}

async function createWindow() {
  await startLocalServer();

  // Configure session permission handlers to auto-grant microphone and media capture
  const allowedPermissions = ['media', 'microphone', 'audioCapture', 'speechRecognition', 'notifications'];
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return allowedPermissions.includes(permission);
  });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + ' Electron/44.1.1 MineMindDesktop');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript('window.IS_ELECTRON_DESKTOP = true;').catch(() => {});
  });

  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    });
  } catch {}

  await mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
