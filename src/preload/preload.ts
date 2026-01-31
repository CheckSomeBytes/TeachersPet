import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, IPC_CHANNELS, LinkCheckResult } from '../shared/types';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Config operations
  loadConfig: (): Promise<AppConfig> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG);
  },

  saveConfig: (config: AppConfig): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, config);
  },

  exportConfig: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CONFIG);
  },

  importConfig: (): Promise<AppConfig | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CONFIG);
  },

  // Link operations
  fetchTitle: (url: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FETCH_TITLE, url);
  },

  checkLink: (url: string): Promise<LinkCheckResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_LINK, url);
  },

  checkAllLinks: (urls: string[]): Promise<LinkCheckResult[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_ALL_LINKS, urls);
  },

  onLinkCheckResult: (callback: (result: LinkCheckResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: LinkCheckResult) => callback(result);
    ipcRenderer.on(IPC_CHANNELS.LINK_CHECK_RESULT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LINK_CHECK_RESULT, handler);
  },

  openInChrome: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_IN_CHROME, url);
  },

  // Window operations
  focusAndPaste: (
    pattern: string,
    matchMode: 'exact' | 'contains' | 'regex',
    textToPaste: string,
    pressEnter: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(
      IPC_CHANNELS.FOCUS_AND_PASTE,
      pattern,
      matchMode,
      textToPaste,
      pressEnter
    );
  },

  getAppPath: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_PATH);
  },

  getWindowList: (): Promise<{ title: string; processName: string }[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_WINDOWS);
  },

  openCountdownTimer: (
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
  ): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_COUNTDOWN_TIMER, totalMinutes, message, theme);
  },

  quitApp: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.QUIT_APP);
  },
});

// Type declaration for the renderer
declare global {
  interface Window {
    electronAPI: {
      loadConfig: () => Promise<AppConfig>;
      saveConfig: (config: AppConfig) => Promise<boolean>;
      exportConfig: () => Promise<boolean>;
      importConfig: () => Promise<AppConfig | null>;
      fetchTitle: (url: string) => Promise<string>;
      checkLink: (url: string) => Promise<LinkCheckResult>;
      checkAllLinks: (urls: string[]) => Promise<LinkCheckResult[]>;
      onLinkCheckResult: (callback: (result: LinkCheckResult) => void) => () => void;
      openInChrome: (url: string) => Promise<boolean>;
      focusAndPaste: (
        pattern: string,
        matchMode: 'exact' | 'contains' | 'regex',
        textToPaste: string,
        pressEnter?: boolean
      ) => Promise<{ success: boolean; error?: string }>;
      getAppPath: () => Promise<string>;
      getWindowList: () => Promise<{ title: string; processName: string }[]>;
      openCountdownTimer: (
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
      ) => Promise<boolean>;
      quitApp: () => Promise<void>;
    };
  }
}
