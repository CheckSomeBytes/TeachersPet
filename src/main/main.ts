import { app, BrowserWindow, ipcMain, shell, clipboard, dialog, Menu, net } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import {
  AppConfig,
  DEFAULT_CONFIG,
  IPC_CHANNELS,
  LinkCheckResult,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let countdownWindow: BrowserWindow | null = null;

// Get the data directory (same folder as the app)
function getDataPath(): string {
  const appPath = app.isPackaged
    ? join(app.getPath('exe'), '..')
    : join(__dirname, '..', '..');
  return join(appPath, 'data', 'config.json');
}

// Load configuration from disk
function loadConfig(): AppConfig {
  const configPath = getDataPath();
  try {
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8');
      return JSON.parse(data) as AppConfig;
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

// Save configuration to disk
function saveConfig(config: AppConfig): boolean {
  const configPath = getDataPath();
  try {
    const dir = join(configPath, '..');
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Fetch page title from URL using fetch + regex (faster and more reliable)
async function fetchPageTitle(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    let fetchUrl = url;
    if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
      fetchUrl = 'https://' + fetchUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return url;
    }

    const html = await response.text();

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Decode HTML entities and clean up
      const title = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      return title || url;
    }

    return url;
  } catch (error) {
    console.error('Error fetching title:', error);
    return url;
  }
}

// Get list of open windows (Windows only)
async function getWindowList(): Promise<{ title: string; processName: string }[]> {
  if (process.platform !== 'win32') {
    return [];
  }

  const { exec } = require('child_process');

  return new Promise((resolve) => {
    const psScript = `
      Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
      Select-Object ProcessName, MainWindowTitle |
      ConvertTo-Json
    `;

    exec(
      `powershell -Command "${psScript.replace(/\n/g, ' ')}"`,
      (error: Error | null, stdout: string) => {
        if (error) {
          resolve([]);
          return;
        }

        try {
          const result = JSON.parse(stdout);
          // Handle single result (not an array)
          const windows = Array.isArray(result) ? result : [result];
          resolve(
            windows.map((w: { ProcessName: string; MainWindowTitle: string }) => ({
              title: w.MainWindowTitle,
              processName: w.ProcessName,
            }))
          );
        } catch {
          resolve([]);
        }
      }
    );
  });
}

// Check if a link is accessible using Electron's net module (Chromium networking stack)
async function checkLink(url: string): Promise<LinkCheckResult> {
  const tryRequest = (method: 'HEAD' | 'GET'): Promise<LinkCheckResult> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        request.abort();
        resolve({ url, status: 'timeout' });
      }, 10000);

      const request = net.request({
        method,
        url,
        redirect: 'follow',
      });

      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
      request.setHeader('Accept-Language', 'en-US,en;q=0.5');

      request.on('response', (response) => {
        clearTimeout(timeout);
        const statusCode = response.statusCode;
        console.log(`[LinkCheck] ${method} ${url} -> ${statusCode}`);

        // Consume response data to avoid memory leaks
        response.on('data', () => {});
        response.on('end', () => {});

        if (statusCode >= 200 && statusCode < 400) {
          resolve({ url, status: 'ok', statusCode });
        } else if (statusCode === 403 || statusCode === 503) {
          resolve({ url, status: 'unchecked', statusCode });
        } else if (method === 'HEAD' && statusCode === 405) {
          resolve({ url, status: 'broken', statusCode });
        } else {
          resolve({ url, status: 'broken', statusCode });
        }
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`[LinkCheck] ${method} ${url} -> ERROR: ${error.message}`);
        resolve({ url, status: 'broken', error: error.message });
      });

      request.on('abort', () => {
        clearTimeout(timeout);
        resolve({ url, status: 'timeout' });
      });

      request.end();
    });
  };

  // Try HEAD first, fall back to GET if HEAD fails
  const headResult = await tryRequest('HEAD');
  if (headResult.status === 'ok' || headResult.status === 'unchecked') {
    return headResult;
  }

  // HEAD failed - try GET (some servers reject HEAD but accept GET)
  const getResult = await tryRequest('GET');

  // If GET also fails but we got a response with protection status, return unchecked
  if (getResult.status === 'broken' && getResult.statusCode &&
      (getResult.statusCode === 403 || getResult.statusCode === 503)) {
    return { url, status: 'unchecked', statusCode: getResult.statusCode };
  }

  return getResult;
}

// Open URL in Chrome (fallback to default browser)
async function openInChrome(url: string): Promise<void> {
  // Try to open with Chrome specifically on Windows
  const { exec } = require('child_process');

  if (process.platform === 'win32') {
    exec(`start chrome "${url}"`, (error: Error | null) => {
      if (error) {
        // Fallback to default browser
        shell.openExternal(url);
      }
    });
  } else {
    // On other platforms, just use default browser
    shell.openExternal(url);
  }
}

// Focus window and paste - this requires native modules
// For now, we'll implement a simplified version
async function focusAndPaste(
  pattern: string,
  matchMode: 'exact' | 'contains' | 'regex',
  textToPaste: string,
  pressEnter: boolean = false
): Promise<{ success: boolean; error?: string }> {
  // Copy to clipboard first
  clipboard.writeText(textToPaste);

  // On Windows, we can use PowerShell to find and focus windows
  if (process.platform === 'win32') {
    const { execFile } = require('child_process');

    return new Promise((resolve) => {
      // Escape single quotes in the pattern for PowerShell
      const escapedPattern = pattern.replace(/'/g, "''");

      // Build the match condition based on mode
      let matchCondition: string;
      switch (matchMode) {
        case 'exact':
          matchCondition = `$_.MainWindowTitle -eq '${escapedPattern}'`;
          break;
        case 'contains':
          matchCondition = `$_.MainWindowTitle -like '*${escapedPattern}*'`;
          break;
        case 'regex':
          matchCondition = `$_.MainWindowTitle -match '${escapedPattern}'`;
          break;
      }

      // Use a simpler approach: separate commands
      const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

$allWindows = Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle
Write-Host "DEBUG: Available windows:"
$allWindows | ForEach-Object { Write-Host "  - $($_.ProcessName): $($_.MainWindowTitle)" }
Write-Host "DEBUG: Looking for pattern '${escapedPattern}' with condition: ${matchCondition}"

$proc = Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and (${matchCondition}) } | Select-Object -First 1
if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
    Write-Host "DEBUG: Found window - $($proc.ProcessName): $($proc.MainWindowTitle)"
    [Win32Helper]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 300
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('^v')
    ${pressEnter ? `Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')` : ''}
    Write-Output 'SUCCESS'
} else {
    Write-Host "DEBUG: No matching window found"
    Write-Output 'NOTFOUND'
}
`;

      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error('PowerShell error:', error);
            console.error('stderr:', stderr);
            resolve({
              success: false,
              error: 'Failed to execute: ' + (error.message || 'Unknown error'),
            });
          } else if (stdout.includes('SUCCESS')) {
            console.log('PowerShell debug output:', stdout);
            resolve({ success: true });
          } else {
            console.log('PowerShell output:', stdout);
            console.log('Pattern used:', pattern);
            console.log('Match mode:', matchMode);
            resolve({
              success: false,
              error: 'Window not found matching pattern: ' + pattern,
            });
          }
        }
      );
    });
  }

  return { success: false, error: 'Platform not supported' };
}

function createWindow(): void {
  // Remove the application menu
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Set up IPC handlers
function setupIPC(): void {
  // Config operations
  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, () => {
    return loadConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, (_, config: AppConfig) => {
    return saveConfig(config);
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CONFIG, async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Configuration',
      defaultPath: 'sans-notes-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!result.canceled && result.filePath) {
      const config = loadConfig();
      writeFileSync(result.filePath, JSON.stringify(config, null, 2));
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONFIG, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Configuration',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths[0]) {
      try {
        const data = readFileSync(result.filePaths[0], 'utf-8');
        const config = JSON.parse(data) as AppConfig;
        saveConfig(config);
        return config;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Link operations
  ipcMain.handle(IPC_CHANNELS.FETCH_TITLE, async (_, url: string) => {
    return fetchPageTitle(url);
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_LINK, async (_, url: string) => {
    return checkLink(url);
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_ALL_LINKS, async (event, urls: string[]) => {
    const RATE_LIMIT_DELAY = 500; // ms between requests
    const results: LinkCheckResult[] = [];

    for (const url of urls) {
      const result = await checkLink(url);
      results.push(result);

      // Send result immediately to renderer
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.LINK_CHECK_RESULT, result);
      }

      // Rate limit: wait before next request
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    return results;
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_CHROME, async (_, url: string) => {
    await openInChrome(url);
    return true;
  });

  // Window operations
  ipcMain.handle(
    IPC_CHANNELS.FOCUS_AND_PASTE,
    async (
      _,
      pattern: string,
      matchMode: 'exact' | 'contains' | 'regex',
      textToPaste: string,
      pressEnter: boolean = false
    ) => {
      return focusAndPaste(pattern, matchMode, textToPaste, pressEnter);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_APP_PATH, () => {
    return app.isPackaged
      ? join(app.getPath('exe'), '..')
      : join(__dirname, '..', '..');
  });

  ipcMain.handle(IPC_CHANNELS.GET_WINDOWS, async () => {
    return getWindowList();
  });

  ipcMain.handle(
    IPC_CHANNELS.OPEN_COUNTDOWN_TIMER,
    async (
      _,
      totalMinutes: number,
      message: string,
      theme: {
        background: string;
        text: string;
        textMuted: string;
        accent: string;
        success: string;
        danger: string;
        fontFamily: string;
      }
    ) => {
      return openCountdownTimer(totalMinutes, message, theme);
    }
  );

  ipcMain.handle(IPC_CHANNELS.QUIT_APP, () => {
    app.quit();
  });
}

// Theme interface for countdown timer
interface TimerTheme {
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  success: string;
  danger: string;
  fontFamily: string;
}

// Open a countdown timer window
function openCountdownTimer(totalMinutes: number, message: string, theme: TimerTheme): boolean {
  try {
    // Close existing countdown window if open
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      countdownWindow.close();
    }

    countdownWindow = new BrowserWindow({
      width: 400,
      height: 250,
      alwaysOnTop: true,
      frame: false,
      resizable: true,
      backgroundColor: theme.background,
      title: 'Countdown Timer',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Create HTML content for the countdown timer
    const totalSeconds = totalMinutes * 60;
    const escapedMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Countdown Timer</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${theme.fontFamily};
      background: ${theme.background};
      color: ${theme.text};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 20px;
      text-align: center;
      position: relative;
      -webkit-app-region: drag;
    }
    button, input, .message-container {
      -webkit-app-region: no-drag;
    }
    .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: 2px solid transparent;
      color: ${theme.textMuted};
      font-family: ${theme.fontFamily};
      font-size: 10px;
      cursor: pointer;
      padding: 4px 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    body:hover .close-btn {
      opacity: 1;
    }
    .close-btn:hover {
      color: ${theme.danger};
      border-color: ${theme.danger};
    }
    .time-controls {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    body:hover .time-controls {
      opacity: 1;
    }
    .time-btn {
      background: ${theme.background};
      border: 2px solid ${theme.textMuted};
      color: ${theme.textMuted};
      font-family: ${theme.fontFamily};
      font-size: 16px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .time-btn:hover {
      border-color: ${theme.accent};
      color: ${theme.accent};
    }
    .message-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      max-width: 100%;
    }
    .message { font-size: 10px; color: ${theme.textMuted}; word-wrap: break-word; line-height: 1.6; }
    .message-edit-btn {
      background: ${theme.background};
      border: 2px solid ${theme.textMuted};
      color: ${theme.textMuted};
      font-family: ${theme.fontFamily};
      font-size: 10px;
      padding: 2px 6px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    .message-container:hover .message-edit-btn {
      opacity: 1;
    }
    .message-edit-btn:hover {
      border-color: ${theme.accent};
      color: ${theme.accent};
    }
    .message-input {
      font-family: ${theme.fontFamily};
      font-size: 10px;
      color: ${theme.text};
      background: ${theme.background};
      border: 2px solid ${theme.accent};
      padding: 8px;
      width: 300px;
      text-align: center;
    }
    .message-input:focus {
      outline: none;
    }
    .timer {
      font-size: 48px;
      font-weight: bold;
      color: ${theme.accent};
      font-family: ${theme.fontFamily};
    }
    .timer.warning { color: #ffd93d; }
    .timer.danger { color: ${theme.danger}; animation: pulse 1s ease-in-out infinite; }
    .timer.done { color: ${theme.success}; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <button class="close-btn" onclick="window.close()" title="Close">X</button>
  <div class="time-controls">
    <button class="time-btn" onclick="adjustTime(60)" title="Add 1 minute">+</button>
    <button class="time-btn" onclick="adjustTime(-60)" title="Remove 1 minute">−</button>
  </div>
  <div class="message-container" id="messageContainer">
    <div class="message" id="message">${escapedMessage}</div>
    <button class="message-edit-btn" onclick="editMessage()" title="Edit message">✎</button>
  </div>
  <div class="timer" id="timer">00:00</div>
  <script>
    var remaining = ${totalSeconds};
    var isEditing = false;
    function editMessage() {
      if (isEditing) return;
      isEditing = true;
      var container = document.getElementById('messageContainer');
      var messageEl = document.getElementById('message');
      var currentText = messageEl.textContent;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'message-input';
      input.value = currentText;
      messageEl.style.display = 'none';
      container.querySelector('.message-edit-btn').style.display = 'none';
      container.appendChild(input);
      input.focus();
      input.select();
      function saveEdit() {
        messageEl.textContent = input.value || currentText;
        messageEl.style.display = '';
        container.querySelector('.message-edit-btn').style.display = '';
        input.remove();
        isEditing = false;
      }
      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { input.value = currentText; input.blur(); }
      });
    }
    var timerRunning = true;
    function adjustTime(seconds) {
      remaining += seconds;
      if (remaining < 0) remaining = 0;
      var wasRunning = timerRunning;
      timerRunning = true;
      updateDisplay();
      if (!wasRunning && remaining > 0) {
        setTimeout(updateTimer, 1000);
      }
    }
    function updateDisplay() {
      var minutes = Math.floor(remaining / 60);
      var seconds = remaining % 60;
      var timerEl = document.getElementById('timer');
      timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
      timerEl.className = 'timer';
      if (remaining <= 0) {
        timerEl.classList.add('done');
        timerEl.textContent = '00:00';
        timerRunning = false;
        return;
      } else if (remaining <= 60) {
        timerEl.classList.add('danger');
      } else if (remaining <= 300) {
        timerEl.classList.add('warning');
      }
    }
    function updateTimer() {
      updateDisplay();
      if (timerRunning && remaining > 0) {
        remaining--;
        setTimeout(updateTimer, 1000);
      }
    }
    updateTimer();
  </script>
</body>
</html>`;

    // Write to a temp file and load it
    const tempPath = join(app.getPath('temp'), 'countdown-timer.html');
    writeFileSync(tempPath, htmlContent);
    countdownWindow.loadFile(tempPath);

    countdownWindow.on('closed', () => {
      countdownWindow = null;
    });

    return true;
  } catch (error) {
    console.error('Error opening countdown timer:', error);
    return false;
  }
}

// App lifecycle
app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
