import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { DEFAULT_THEME, Theme, ThemeColors, PRESET_THEMES, TIMEZONES, ScheduledTime } from '../../../shared/types';
import './SettingsModal.css';

type SettingsTab = 'profiles' | 'days' | 'window' | 'links' | 'theme' | 'schedule' | 'data';

interface WindowInfo {
  title: string;
  processName: string;
}

function SettingsModal() {
  const {
    isSettingsOpen,
    toggleSettings,
    config,
    updateSettings,
    addNotification,
    addDay,
    updateDay,
    deleteDay,
    resetAllPolls,
    addScheduledTime,
    updateScheduledTime,
    deleteScheduledTime,
    getCurrentProfile,
    addProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
    duplicateProfile,
    settingsTab,
    setSettingsTab,
  } = useAppStore();

  const currentProfile = getCurrentProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>(settingsTab as SettingsTab || 'profiles');

  // Sync with store's settingsTab
  useEffect(() => {
    if (settingsTab && settingsTab !== activeTab) {
      setActiveTab(settingsTab as SettingsTab);
    }
  }, [settingsTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSettingsTab(tab);
  };
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [windowList, setWindowList] = useState<WindowInfo[]>([]);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState('');
  const [newScheduleLabel, setNewScheduleLabel] = useState('');
  const [newScheduleHour, setNewScheduleHour] = useState('12');
  const [newScheduleMinute, setNewScheduleMinute] = useState('00');
  const [newScheduleAmPm, setNewScheduleAmPm] = useState<'AM' | 'PM'>('AM');
  const [newScheduleDuration, setNewScheduleDuration] = useState('15');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingScheduleLabel, setEditingScheduleLabel] = useState('');
  const [editingScheduleHour, setEditingScheduleHour] = useState('12');
  const [editingScheduleMinute, setEditingScheduleMinute] = useState('00');
  const [editingScheduleAmPm, setEditingScheduleAmPm] = useState<'AM' | 'PM'>('AM');
  const [editingScheduleDuration, setEditingScheduleDuration] = useState('15');

  const { settings } = currentProfile;

  // Profile management state
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [duplicatingProfileId, setDuplicatingProfileId] = useState<string | null>(null);
  const [duplicateProfileName, setDuplicateProfileName] = useState('');

  // Convert 12-hour to 24-hour format (HH:MM)
  const to24Hour = (hour: string, minute: string, amPm: 'AM' | 'PM'): string => {
    let h = parseInt(hour);
    if (amPm === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  // Convert 24-hour format (HH:MM) to 12-hour components
  const to12Hour = (time: string): { hour: string; minute: string; amPm: 'AM' | 'PM' } => {
    const [h, m] = time.split(':').map(Number);
    let hour = h % 12;
    if (hour === 0) hour = 12;
    const amPm: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
    return { hour: hour.toString(), minute: m.toString().padStart(2, '0'), amPm };
  };

  // Format time for display (e.g., "9:30 AM")
  const formatTimeDisplay = (time: string): string => {
    const { hour, minute, amPm } = to12Hour(time);
    return `${hour}:${minute} ${amPm}`;
  };

  // Load window list when window tab is active
  useEffect(() => {
    if (isSettingsOpen && activeTab === 'window') {
      loadWindowList();
    }
  }, [isSettingsOpen, activeTab]);

  const loadWindowList = async () => {
    setIsLoadingWindows(true);
    try {
      const windows = await window.electronAPI.getWindowList();
      setWindowList(windows);
    } catch (error) {
      console.error('Failed to load windows:', error);
    }
    setIsLoadingWindows(false);
  };

  if (!isSettingsOpen) return null;

  const handleCheckAllLinks = async () => {
    setIsCheckingLinks(true);

    const urls: string[] = [];
    currentProfile.days.forEach((day) => {
      day.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.type === 'link') {
            urls.push(item.url);
          }
        });
      });
    });

    if (urls.length === 0) {
      addNotification('No links to check', 'info');
      setIsCheckingLinks(false);
      return;
    }

    try {
      const results = await window.electronAPI.checkAllLinks(urls);
      const broken = results.filter((r) => r.status !== 'ok');

      results.forEach((result) => {
        useAppStore.getState().updateLinkStatus(result.url, result.status);
      });

      if (broken.length === 0) {
        addNotification(`All ${urls.length} links are OK!`, 'success');
      } else {
        addNotification(`${broken.length} of ${urls.length} links have issues`, 'error');
      }
    } catch (error) {
      addNotification('Failed to check links', 'error');
    }

    setIsCheckingLinks(false);
  };

  const handleExport = async () => {
    const success = await window.electronAPI.exportConfig();
    if (success) {
      addNotification('Configuration exported!', 'success');
    }
  };

  const handleImport = async () => {
    const imported = await window.electronAPI.importConfig();
    if (imported) {
      addNotification('Configuration imported! Reloading...', 'success');
      setTimeout(() => {
        useAppStore.getState().loadConfig();
      }, 500);
    }
  };

  const updateThemeColor = (key: keyof ThemeColors, value: string) => {
    updateSettings({
      theme: {
        ...settings.theme,
        isCustom: true,
        colors: {
          ...settings.theme.colors,
          [key]: value,
        },
      },
    });
  };

  const resetTheme = () => {
    updateSettings({ theme: DEFAULT_THEME });
  };

  const selectWindow = (windowTitle: string) => {
    updateSettings({
      windowTarget: {
        ...settings.windowTarget,
        pattern: windowTitle,
        matchMode: 'contains',
      },
    });
    addNotification(`Window pattern set to: ${windowTitle}`, 'success');
  };

  return (
    <div className="settings-overlay" onClick={toggleSettings}>
      <div className="settings-modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">SETTINGS</h2>
          <button className="btn btn--small btn--danger" onClick={toggleSettings}>
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profiles' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('profiles')}
          >
            PROFILES
          </button>
          <button
            className={`settings-tab ${activeTab === 'days' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('days')}
          >
            DAYS
          </button>
          <button
            className={`settings-tab ${activeTab === 'window' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('window')}
          >
            WINDOW
          </button>
          <button
            className={`settings-tab ${activeTab === 'links' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('links')}
          >
            LINKS
          </button>
          <button
            className={`settings-tab ${activeTab === 'theme' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('theme')}
          >
            THEME
          </button>
          <button
            className={`settings-tab ${activeTab === 'schedule' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('schedule')}
          >
            SCHEDULE
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'settings-tab--active' : ''}`}
            onClick={() => handleTabChange('data')}
          >
            DATA
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profiles' && (
            <div className="settings-section">
              <h3 className="settings-section-title">CURRENT PROFILE</h3>
              <div className="settings-current-profile">
                <span className="settings-current-profile-name">{currentProfile.name}</span>
              </div>

              <h3 className="settings-section-title">CREATE NEW PROFILE</h3>
              <div className="settings-add-day-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Profile name..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProfileName.trim()) {
                      addProfile(newProfileName.trim());
                      setNewProfileName('');
                    }
                  }}
                />
                <button
                  className="btn btn--small btn--success"
                  onClick={() => {
                    if (newProfileName.trim()) {
                      addProfile(newProfileName.trim());
                      setNewProfileName('');
                    }
                  }}
                >
                  + NEW
                </button>
              </div>

              <h3 className="settings-section-title">ALL PROFILES</h3>
              <div className="settings-day-list">
                {config.profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`settings-day-item ${profile.id === config.currentProfileId ? 'settings-day-item--active' : ''}`}
                  >
                    {editingProfileId === profile.id ? (
                      <div className="settings-day-edit-row">
                        <input
                          type="text"
                          className="input"
                          value={editingProfileName}
                          onChange={(e) => setEditingProfileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingProfileName.trim()) {
                              renameProfile(profile.id, editingProfileName.trim());
                              setEditingProfileId(null);
                            }
                            if (e.key === 'Escape') setEditingProfileId(null);
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn--small btn--success"
                          onClick={() => {
                            if (editingProfileName.trim()) {
                              renameProfile(profile.id, editingProfileName.trim());
                              setEditingProfileId(null);
                            }
                          }}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn--small btn--secondary"
                          onClick={() => setEditingProfileId(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : duplicatingProfileId === profile.id ? (
                      <div className="settings-day-edit-row">
                        <input
                          type="text"
                          className="input"
                          placeholder="New profile name..."
                          value={duplicateProfileName}
                          onChange={(e) => setDuplicateProfileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && duplicateProfileName.trim()) {
                              duplicateProfile(profile.id, duplicateProfileName.trim());
                              setDuplicatingProfileId(null);
                              setDuplicateProfileName('');
                            }
                            if (e.key === 'Escape') {
                              setDuplicatingProfileId(null);
                              setDuplicateProfileName('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn--small btn--success"
                          onClick={() => {
                            if (duplicateProfileName.trim()) {
                              duplicateProfile(profile.id, duplicateProfileName.trim());
                              setDuplicatingProfileId(null);
                              setDuplicateProfileName('');
                            }
                          }}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn--small btn--secondary"
                          onClick={() => {
                            setDuplicatingProfileId(null);
                            setDuplicateProfileName('');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="settings-day-name settings-profile-name"
                          onClick={() => {
                            if (profile.id !== config.currentProfileId) {
                              switchProfile(profile.id);
                            }
                          }}
                          title={profile.id === config.currentProfileId ? 'Current profile' : 'Click to switch'}
                        >
                          {profile.name}
                          {profile.id === config.currentProfileId && (
                            <span className="settings-profile-current"> (ACTIVE)</span>
                          )}
                        </span>
                        <div className="settings-day-actions">
                          <button
                            className="btn btn--small btn--secondary"
                            onClick={() => {
                              setDuplicatingProfileId(profile.id);
                              setDuplicateProfileName(`${profile.name} Copy`);
                            }}
                            title="Duplicate profile"
                          >
                            ⧉
                          </button>
                          <button
                            className="btn btn--small btn--secondary"
                            onClick={() => {
                              setEditingProfileId(profile.id);
                              setEditingProfileName(profile.name);
                            }}
                            title="Rename profile"
                          >
                            ✎
                          </button>
                          <button
                            className="btn btn--small btn--danger"
                            onClick={() => {
                              if (config.profiles.length <= 1) {
                                addNotification('Cannot delete the last profile', 'error');
                                return;
                              }
                              if (confirm(`Delete profile "${profile.name}" and all its data?`)) {
                                deleteProfile(profile.id);
                              }
                            }}
                            title="Delete profile"
                            disabled={config.profiles.length <= 1}
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <p className="settings-help">
                Each profile stores its own days, sections, links, notes, polls, theme, and all other settings.
                Click a profile name to switch to it.
              </p>
            </div>
          )}

          {activeTab === 'days' && (
            <div className="settings-section">
              <h3 className="settings-section-title">ADD NEW DAY</h3>
              <div className="settings-add-day-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Day name..."
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDayName.trim()) {
                      addDay(newDayName.trim());
                      setNewDayName('');
                    }
                  }}
                />
                <button
                  className="btn btn--small btn--success"
                  onClick={() => {
                    if (newDayName.trim()) {
                      addDay(newDayName.trim());
                      setNewDayName('');
                    }
                  }}
                >
                  + ADD
                </button>
              </div>

              <h3 className="settings-section-title">EXISTING DAYS</h3>
              <div className="settings-day-list">
                {[...currentProfile.days]
                  .sort((a, b) => a.order - b.order)
                  .map((day) => (
                    <div key={day.id} className="settings-day-item">
                      {editingDayId === day.id ? (
                        <div className="settings-day-edit-row">
                          <input
                            type="text"
                            className="input"
                            value={editingDayName}
                            onChange={(e) => setEditingDayName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingDayName.trim()) {
                                updateDay(day.id, { name: editingDayName.trim() });
                                setEditingDayId(null);
                              }
                              if (e.key === 'Escape') setEditingDayId(null);
                            }}
                            autoFocus
                          />
                          <button
                            className="btn btn--small btn--success"
                            onClick={() => {
                              if (editingDayName.trim()) {
                                updateDay(day.id, { name: editingDayName.trim() });
                                setEditingDayId(null);
                              }
                            }}
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn--small btn--secondary"
                            onClick={() => setEditingDayId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="settings-day-name">{day.name}</span>
                          <div className="settings-day-lab-fields">
                            <label className="settings-day-lab-label">Day#</label>
                            <input
                              type="number"
                              className="input settings-day-lab-input"
                              value={day.dayNumber ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateDay(day.id, { dayNumber: val ? parseInt(val) : undefined });
                              }}
                              min="1"
                              placeholder=""
                            />
                            <label className="settings-day-lab-label">Labs</label>
                            <input
                              type="number"
                              className="input settings-day-lab-input"
                              value={day.labCount ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateDay(day.id, { labCount: val ? parseInt(val) : undefined });
                              }}
                              min="0"
                              placeholder=""
                            />
                          </div>
                          <div className="settings-day-actions">
                            <button
                              className="btn btn--small btn--secondary"
                              onClick={() => {
                                setEditingDayId(day.id);
                                setEditingDayName(day.name);
                              }}
                            >
                              ✎
                            </button>
                            <button
                              className="btn btn--small btn--danger"
                              onClick={() => {
                                if (confirm(`Delete "${day.name}" and all its contents?`)) {
                                  deleteDay(day.id);
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                {currentProfile.days.length === 0 && (
                  <p className="settings-help">No days created yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'window' && (
            <div className="settings-section">
              <h3 className="settings-section-title">WINDOW TARGET</h3>
              <p className="settings-help">
                Select a window or type a pattern to match when pasting.
              </p>

              <div className="settings-field">
                <label className="settings-label">CURRENT PATTERN</label>
                <div className="settings-pattern-row">
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Zoom Meeting, Slack, etc."
                    value={settings.windowTarget.pattern}
                    onChange={(e) =>
                      updateSettings({
                        windowTarget: {
                          ...settings.windowTarget,
                          pattern: e.target.value,
                        },
                      })
                    }
                  />
                  <select
                    className="select settings-match-mode"
                    value={settings.windowTarget.matchMode}
                    onChange={(e) =>
                      updateSettings({
                        windowTarget: {
                          ...settings.windowTarget,
                          matchMode: e.target.value as 'exact' | 'contains' | 'regex',
                        },
                      })
                    }
                  >
                    <option value="contains">Contains</option>
                    <option value="exact">Exact</option>
                    <option value="regex">Regex</option>
                  </select>
                </div>
              </div>

              <div className="settings-field">
                <div className="settings-label-row">
                  <label className="settings-label">SELECT FROM OPEN WINDOWS</label>
                  <button
                    className="btn btn--small btn--secondary"
                    onClick={loadWindowList}
                    disabled={isLoadingWindows}
                  >
                    {isLoadingWindows ? '...' : '↻'}
                  </button>
                </div>
                <div className="settings-window-list">
                  {windowList.length === 0 ? (
                    <div className="settings-window-empty">
                      {isLoadingWindows ? 'Loading...' : 'No windows found'}
                    </div>
                  ) : (
                    windowList.map((win, index) => (
                      <button
                        key={index}
                        className={`settings-window-item ${
                          settings.windowTarget.pattern &&
                          win.title.includes(settings.windowTarget.pattern)
                            ? 'settings-window-item--selected'
                            : ''
                        }`}
                        onClick={() => selectWindow(win.title)}
                        title={win.title}
                      >
                        <span className="settings-window-process">{win.processName}</span>
                        <span className="settings-window-title">{win.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.windowTarget.pressEnterAfterPaste || false}
                    onChange={(e) =>
                      updateSettings({
                        windowTarget: {
                          ...settings.windowTarget,
                          pressEnterAfterPaste: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Press Enter after pasting URLs and Notes</span>
                </label>
              </div>

              <h3 className="settings-section-title">TIMEZONE</h3>

              <div className="settings-field">
                <label className="settings-label">SELECT TIMEZONE</label>
                <select
                  className="select"
                  value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onChange={(e) => updateSettings({ timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="settings-section">
              <h3 className="settings-section-title">LINK HEALTH</h3>

              <div className="settings-field">
                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.checkLinksOnStartup}
                    onChange={(e) =>
                      updateSettings({ checkLinksOnStartup: e.target.checked })
                    }
                  />
                  <span>Check all links on startup</span>
                </label>
              </div>

              <button
                className="btn"
                onClick={handleCheckAllLinks}
                disabled={isCheckingLinks}
              >
                {isCheckingLinks ? 'CHECKING...' : 'CHECK ALL LINKS NOW'}
              </button>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="settings-section">
              <h3 className="settings-section-title">PRESET THEMES</h3>

              <div className="settings-theme-presets">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    className={`settings-theme-preset ${
                      settings.theme.name === preset.name && !settings.theme.isCustom
                        ? 'settings-theme-preset--active'
                        : ''
                    }`}
                    onClick={() => updateSettings({ theme: preset })}
                  >
                    <div className="settings-theme-preview">
                      <div
                        className="settings-theme-color"
                        style={{ backgroundColor: preset.colors.background }}
                      />
                      <div
                        className="settings-theme-color"
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <div
                        className="settings-theme-color"
                        style={{ backgroundColor: preset.colors.secondary }}
                      />
                      <div
                        className="settings-theme-color"
                        style={{ backgroundColor: preset.colors.accent }}
                      />
                    </div>
                    <span className="settings-theme-name">{preset.name}</span>
                  </button>
                ))}
              </div>

              <h3 className="settings-section-title">CUSTOMIZE COLORS</h3>

              <div className="settings-colors">
                {Object.entries(settings.theme.colors).map(([key, value]) => (
                  <div key={key} className="settings-color-field">
                    <label className="settings-label">{key.toUpperCase()}</label>
                    <div className="settings-color-input">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          updateThemeColor(key as keyof ThemeColors, e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="input"
                        value={value}
                        onChange={(e) =>
                          updateThemeColor(key as keyof ThemeColors, e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="settings-field">
                <label className="settings-label">FONT FAMILY</label>
                <select
                  className="select"
                  value={settings.theme.fontFamily}
                  onChange={(e) =>
                    updateSettings({
                      theme: {
                        ...settings.theme,
                        isCustom: true,
                        fontFamily: e.target.value,
                      },
                    })
                  }
                >
                  <option value='"Press Start 2P", monospace'>Press Start 2P (8-bit)</option>
                  <option value='"Courier New", monospace'>Courier New</option>
                  <option value='monospace'>System Monospace</option>
                  <option value='sans-serif'>System Sans-Serif</option>
                </select>
              </div>

              <button className="btn btn--secondary" onClick={resetTheme}>
                RESET TO DEFAULT
              </button>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="settings-section">
              <h3 className="settings-section-title">SCHEDULED TIMES</h3>
              <p className="settings-help">
                Add times to track (e.g., breaks, lunch). A countdown will show in the header.
              </p>

              <div className="settings-schedule-add-row">
                <input
                  type="text"
                  className="input settings-schedule-label-input"
                  placeholder="Label (e.g., Break)"
                  value={newScheduleLabel}
                  onChange={(e) => setNewScheduleLabel(e.target.value)}
                />
                <div className="settings-time-picker">
                  <select
                    className="select settings-time-select"
                    value={newScheduleHour}
                    onChange={(e) => setNewScheduleHour(e.target.value)}
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h.toString()}>{h}</option>
                    ))}
                  </select>
                  <span className="settings-time-colon">:</span>
                  <select
                    className="select settings-time-select"
                    value={newScheduleMinute}
                    onChange={(e) => setNewScheduleMinute(e.target.value)}
                  >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="select settings-time-select"
                    value={newScheduleAmPm}
                    onChange={(e) => setNewScheduleAmPm(e.target.value as 'AM' | 'PM')}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <div className="settings-duration-picker">
                  <input
                    type="number"
                    className="input settings-duration-input"
                    value={newScheduleDuration}
                    onChange={(e) => setNewScheduleDuration(e.target.value)}
                    min="1"
                    max="120"
                  />
                  <span className="settings-duration-label">min</span>
                </div>
                <button
                  className="btn btn--small btn--success"
                  onClick={() => {
                    if (newScheduleLabel.trim()) {
                      const time24 = to24Hour(newScheduleHour, newScheduleMinute, newScheduleAmPm);
                      addScheduledTime(newScheduleLabel.trim(), time24, parseInt(newScheduleDuration) || 15);
                      setNewScheduleLabel('');
                      setNewScheduleHour('12');
                      setNewScheduleMinute('00');
                      setNewScheduleAmPm('AM');
                      setNewScheduleDuration('15');
                    }
                  }}
                >
                  + ADD
                </button>
              </div>

              <div className="settings-day-list">
                {(settings.scheduledTimes || [])
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((st) => (
                    <div key={st.id} className="settings-day-item">
                      {editingScheduleId === st.id ? (
                        <div className="settings-schedule-edit-row">
                          <input
                            type="text"
                            className="input settings-schedule-label-input"
                            value={editingScheduleLabel}
                            onChange={(e) => setEditingScheduleLabel(e.target.value)}
                            autoFocus
                          />
                          <div className="settings-time-picker">
                            <select
                              className="select settings-time-select"
                              value={editingScheduleHour}
                              onChange={(e) => setEditingScheduleHour(e.target.value)}
                            >
                              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                                <option key={h} value={h.toString()}>{h}</option>
                              ))}
                            </select>
                            <span className="settings-time-colon">:</span>
                            <select
                              className="select settings-time-select"
                              value={editingScheduleMinute}
                              onChange={(e) => setEditingScheduleMinute(e.target.value)}
                            >
                              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              className="select settings-time-select"
                              value={editingScheduleAmPm}
                              onChange={(e) => setEditingScheduleAmPm(e.target.value as 'AM' | 'PM')}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <div className="settings-duration-picker">
                            <input
                              type="number"
                              className="input settings-duration-input"
                              value={editingScheduleDuration}
                              onChange={(e) => setEditingScheduleDuration(e.target.value)}
                              min="1"
                              max="120"
                            />
                            <span className="settings-duration-label">min</span>
                          </div>
                          <button
                            className="btn btn--small btn--success"
                            onClick={() => {
                              if (editingScheduleLabel.trim()) {
                                const time24 = to24Hour(editingScheduleHour, editingScheduleMinute, editingScheduleAmPm);
                                updateScheduledTime(st.id, {
                                  label: editingScheduleLabel.trim(),
                                  time: time24,
                                  duration: parseInt(editingScheduleDuration) || 15,
                                });
                                setEditingScheduleId(null);
                              }
                            }}
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn--small btn--secondary"
                            onClick={() => setEditingScheduleId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <label className="settings-checkbox">
                            <input
                              type="checkbox"
                              checked={st.enabled}
                              onChange={(e) =>
                                updateScheduledTime(st.id, { enabled: e.target.checked })
                              }
                            />
                            <span className="settings-schedule-info">
                              <span className="settings-schedule-time">{formatTimeDisplay(st.time)}</span>
                              <span className="settings-schedule-label">{st.label}</span>
                              <span className="settings-schedule-duration">({st.duration || 15} min)</span>
                            </span>
                          </label>
                          <div className="settings-day-actions">
                            <button
                              className="btn btn--small btn--secondary"
                              onClick={() => {
                                const { hour, minute, amPm } = to12Hour(st.time);
                                setEditingScheduleId(st.id);
                                setEditingScheduleLabel(st.label);
                                setEditingScheduleHour(hour);
                                setEditingScheduleMinute(minute);
                                setEditingScheduleAmPm(amPm);
                                setEditingScheduleDuration((st.duration || 15).toString());
                              }}
                            >
                              ✎
                            </button>
                            <button
                              className="btn btn--small btn--danger"
                              onClick={() => {
                                if (confirm(`Delete "${st.label}" at ${formatTimeDisplay(st.time)}?`)) {
                                  deleteScheduledTime(st.id);
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                {(settings.scheduledTimes || []).length === 0 && (
                  <p className="settings-help">No scheduled times yet.</p>
                )}
              </div>

              <h3 className="settings-section-title">BREAK ALERT</h3>
              <p className="settings-help">
                Change the theme when approaching a scheduled time.
              </p>

              <div className="settings-field">
                <label className="settings-label">ALERT MINUTES BEFORE</label>
                <input
                  type="number"
                  className="input settings-number-input"
                  min={1}
                  max={30}
                  value={settings.breakAlertMinutes || 5}
                  onChange={(e) =>
                    updateSettings({ breakAlertMinutes: parseInt(e.target.value) || 5 })
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">ALERT THEME</label>
                <div className="settings-theme-presets settings-theme-presets--small">
                  <button
                    className={`settings-theme-preset ${
                      !settings.breakAlertTheme ? 'settings-theme-preset--active' : ''
                    }`}
                    onClick={() => updateSettings({ breakAlertTheme: null })}
                  >
                    <span className="settings-theme-name">None</span>
                  </button>
                  {PRESET_THEMES.map((preset) => (
                    <button
                      key={preset.name}
                      className={`settings-theme-preset ${
                        settings.breakAlertTheme?.name === preset.name
                          ? 'settings-theme-preset--active'
                          : ''
                      }`}
                      onClick={() => updateSettings({ breakAlertTheme: preset })}
                    >
                      <div className="settings-theme-preview">
                        <div
                          className="settings-theme-color"
                          style={{ backgroundColor: preset.colors.background }}
                        />
                        <div
                          className="settings-theme-color"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <div
                          className="settings-theme-color"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                      <span className="settings-theme-name">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="settings-section">
              <h3 className="settings-section-title">IMPORT / EXPORT</h3>

              <div className="settings-actions">
                <button className="btn" onClick={handleExport}>
                  EXPORT CONFIG
                </button>
                <button className="btn btn--secondary" onClick={handleImport}>
                  IMPORT CONFIG
                </button>
              </div>

              <p className="settings-help">
                Export your days, sections, links, and settings to a JSON file
                for backup or sharing.
              </p>

              <h3 className="settings-section-title">POLLS</h3>

              <div className="settings-actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    if (confirm('Reset all polls to "new" status?')) {
                      resetAllPolls();
                      addNotification('All polls reset', 'success');
                    }
                  }}
                >
                  RESET ALL POLLS
                </button>
              </div>

              <p className="settings-help">
                Reset all polls across all sections to "new" status, removing the "sent" mark.
              </p>

              <h3 className="settings-section-title">LAB POLL TEMPLATE</h3>

              <div className="settings-field">
                <label className="settings-label">TEMPLATE</label>
                <textarea
                  className="textarea settings-lab-template"
                  value={settings.labPollTemplate || ''}
                  onChange={(e) =>
                    updateSettings({ labPollTemplate: e.target.value })
                  }
                  placeholder="Enter lab poll template..."
                  rows={4}
                />
              </div>

              <p className="settings-help">
                Use <code>&lt;LAB_NUMBER&gt;</code> as the placeholder for the lab number.
                This template is used when sending lab polls from the header button.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
