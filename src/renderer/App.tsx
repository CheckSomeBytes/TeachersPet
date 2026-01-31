import React, { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import Layout from './components/Layout/Layout';
import Notifications from './components/common/Notifications';
import SettingsModal from './components/Settings/SettingsModal';
import ValidationModal from './components/common/ValidationModal';
import './App.css';

function App() {
  const { loadConfig, isLoading, isBreakAlertActive, getCurrentProfile } = useAppStore();
  const currentProfile = getCurrentProfile();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply theme CSS variables
  useEffect(() => {
    // Use break alert theme if active, otherwise use normal theme
    const theme = isBreakAlertActive && currentProfile.settings.breakAlertTheme
      ? currentProfile.settings.breakAlertTheme
      : currentProfile.settings.theme;
    const root = document.documentElement;

    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-danger', theme.colors.danger);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--font-family', theme.fontFamily);
  }, [currentProfile.settings.theme, currentProfile.settings.breakAlertTheme, isBreakAlertActive]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">LOADING...</div>
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Layout />
      <Notifications />
      <SettingsModal />
      <ValidationModal />
    </div>
  );
}

export default App;
