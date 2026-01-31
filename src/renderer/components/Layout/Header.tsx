import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { TIMEZONES, ScheduledTime } from '../../../shared/types';
import './Header.css';

// Format minutes as "X hr Y min" or "X min" depending on duration
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  }
  return `${minutes} min`;
}

function Header() {
  const {
    toggleSettings,
    selectedDayId,
    goToPreviousDay,
    goToNextDay,
    isEditMode,
    toggleEditMode,
    addNotification,
    updateSettings,
    isBreakAlertActive,
    setBreakAlertActive,
    getCurrentProfile,
    openSettingsToTab,
  } = useAppStore();

  const currentProfile = getCurrentProfile();

  const [showLabPopup, setShowLabPopup] = useState(false);
  const [labNumber, setLabNumber] = useState('');
  const [isCustomLabNumber, setIsCustomLabNumber] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Time estimate popup state
  const [showTimeEstimatePopup, setShowTimeEstimatePopup] = useState(false);
  const [estimateIncludeLab, setEstimateIncludeLab] = useState(false);
  const [estimateLabNumber, setEstimateLabNumber] = useState('');
  const [isCustomEstimateLabNumber, setIsCustomEstimateLabNumber] = useState(false);
  const [estimateLabTime, setEstimateLabTime] = useState('30');
  const [estimateBreakId, setEstimateBreakId] = useState<string>('');

  const timezone = currentProfile.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const scheduledTimes = currentProfile.settings.scheduledTimes || [];
  const breakAlertMinutes = currentProfile.settings.breakAlertMinutes || 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current time in the selected timezone
  const getCurrentTimeInTimezone = () => {
    const timeStr = currentTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Convert HH:MM time string to seconds since midnight
  const timeToSeconds = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  };

  // Find the next scheduled time
  const getNextScheduledTime = (): { time: ScheduledTime; secondsUntil: number } | null => {
    const enabledTimes = scheduledTimes.filter((st) => st.enabled);
    if (enabledTimes.length === 0) return null;

    const currentSeconds = getCurrentTimeInTimezone();
    let closest: { time: ScheduledTime; secondsUntil: number } | null = null;

    for (const st of enabledTimes) {
      const targetSeconds = timeToSeconds(st.time);
      let diff = targetSeconds - currentSeconds;

      // If the time has passed today, it's for tomorrow (add 24 hours)
      if (diff < 0) {
        diff += 24 * 3600;
      }

      if (closest === null || diff < closest.secondsUntil) {
        closest = { time: st, secondsUntil: diff };
      }
    }

    return closest;
  };

  const nextScheduled = useMemo(() => getNextScheduledTime(), [currentTime, scheduledTimes, timezone]);

  // Check if we should show break alert theme
  useEffect(() => {
    if (nextScheduled && currentProfile.settings.breakAlertTheme) {
      const minutesUntil = nextScheduled.secondsUntil / 60;
      const shouldBeActive = minutesUntil <= breakAlertMinutes && minutesUntil > 0;

      if (shouldBeActive !== isBreakAlertActive) {
        setBreakAlertActive(shouldBeActive);
      }
    } else if (isBreakAlertActive) {
      setBreakAlertActive(false);
    }
  }, [nextScheduled, breakAlertMinutes, currentProfile.settings.breakAlertTheme, isBreakAlertActive, setBreakAlertActive]);

  // Format countdown as MM:SS or HH:MM:SS
  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimezoneAbbr = (tz: string) => {
    // Get the timezone abbreviation (e.g., "EST", "PST")
    const abbr = new Date().toLocaleTimeString('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).split(' ').pop() || tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return abbr;
  };

  const sortedDays = [...currentProfile.days].sort((a, b) => a.order - b.order);
  const currentIndex = sortedDays.findIndex((d) => d.id === selectedDayId);
  const currentDay = sortedDays[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sortedDays.length - 1;

  // Get enabled scheduled times for the break dropdown
  const enabledScheduledTimes = scheduledTimes.filter((st) => st.enabled);

  // Calculate return time based on lab time and optional break
  const calculateReturnTime = (): { time: string; message: string; timerMessage: string; totalMinutes: number } => {
    const labMinutes = estimateIncludeLab ? (parseInt(estimateLabTime) || 30) : 0;
    const selectedBreak = enabledScheduledTimes.find((st) => st.id === estimateBreakId);

    // Get current time in timezone
    const now = new Date();
    const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    let totalMinutes = labMinutes;
    const parts: string[] = [];

    if (estimateIncludeLab) {
      const labInfo = estimateLabNumber.trim() ? `Lab ${estimateLabNumber.trim()}` : 'Lab';
      parts.push(`${labInfo} (${formatDuration(labMinutes)})`);
    }

    if (selectedBreak) {
      totalMinutes += selectedBreak.duration || 15;
      parts.push(`${selectedBreak.label} (${formatDuration(selectedBreak.duration || 15)})`);
    }

    const returnDate = new Date(nowInTz.getTime() + totalMinutes * 60 * 1000);
    const returnTimeStr = returnDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const timerMessage = totalMinutes > 0
      ? parts.join(' + ')
      : 'Timer';

    const message = totalMinutes > 0
      ? `${parts.join(' + ')} - Back at approximately ${returnTimeStr}`
      : 'Please select lab time or a break';

    return { time: returnTimeStr, message, timerMessage, totalMinutes };
  };

  const handleSendTimeEstimate = async () => {
    const { totalMinutes } = calculateReturnTime();

    if (totalMinutes <= 0) {
      addNotification('Please select lab time or a break', 'error');
      return;
    }

    const { windowTarget } = currentProfile.settings;

    if (!windowTarget.pattern) {
      addNotification('No window pattern configured. Go to Settings.', 'error');
      return;
    }

    const { message } = calculateReturnTime();

    const result = await window.electronAPI.focusAndPaste(
      windowTarget.pattern,
      windowTarget.matchMode,
      message
    );

    if (result.success) {
      addNotification('Time estimate sent!', 'success');
    } else {
      addNotification(result.error || 'Failed to send time estimate', 'error');
    }
  };

  const handleOpenCountdownTimer = async () => {
    const { totalMinutes, timerMessage } = calculateReturnTime();

    if (totalMinutes <= 0) {
      addNotification('Please select lab time or a break', 'error');
      return;
    }

    const theme = currentProfile.settings.theme;
    await window.electronAPI.openCountdownTimer(totalMinutes, timerMessage, {
      background: theme.colors.background,
      text: theme.colors.text,
      textMuted: theme.colors.textMuted,
      accent: theme.colors.accent,
      success: theme.colors.success,
      danger: theme.colors.danger,
      fontFamily: theme.fontFamily,
    });
    addNotification('Countdown timer opened!', 'success');
  };

  const handleSendAndOpenTimer = async () => {
    const { totalMinutes, message, timerMessage } = calculateReturnTime();

    if (totalMinutes <= 0) {
      addNotification('Please select lab time or a break', 'error');
      return;
    }

    const { windowTarget } = currentProfile.settings;

    if (!windowTarget.pattern) {
      addNotification('No window pattern configured. Go to Settings.', 'error');
      return;
    }

    // Focus window, paste, and press Enter
    const result = await window.electronAPI.focusAndPaste(
      windowTarget.pattern,
      windowTarget.matchMode,
      message,
      true // Press Enter after pasting
    );

    if (result.success) {
      // Close the popup
      setShowTimeEstimatePopup(false);

      // Open the countdown timer
      const theme = currentProfile.settings.theme;
      await window.electronAPI.openCountdownTimer(totalMinutes, timerMessage, {
        background: theme.colors.background,
        text: theme.colors.text,
        textMuted: theme.colors.textMuted,
        accent: theme.colors.accent,
        success: theme.colors.success,
        danger: theme.colors.danger,
        fontFamily: theme.fontFamily,
      });

      addNotification('Time estimate sent and timer opened!', 'success');
    } else {
      addNotification(result.error || 'Failed to send time estimate', 'error');
    }
  };

  const handleSendLabPoll = async () => {
    if (!labNumber.trim()) {
      addNotification('Please enter a lab number', 'error');
      return;
    }

    const { windowTarget, labPollTemplate } = currentProfile.settings;

    if (!windowTarget.pattern) {
      addNotification('No window pattern configured. Go to Settings.', 'error');
      return;
    }

    const pollText = (labPollTemplate || '').replace(/<LAB_NUMBER>/g, labNumber.trim());

    const result = await window.electronAPI.focusAndPaste(
      windowTarget.pattern,
      windowTarget.matchMode,
      pollText
    );

    if (result.success) {
      addNotification(`Lab ${labNumber} poll sent!`, 'success');
      setShowLabPopup(false);
      setLabNumber('');
    } else {
      addNotification(result.error || 'Failed to send lab poll', 'error');
    }
  };

  const handleQuickLabPoll = async (labNum: string) => {
    const { windowTarget, labPollTemplate } = currentProfile.settings;

    if (!windowTarget.pattern) {
      addNotification('No window pattern configured. Go to Settings.', 'error');
      return;
    }

    const pollText = (labPollTemplate || '').replace(/<LAB_NUMBER>/g, labNum);

    const result = await window.electronAPI.focusAndPaste(
      windowTarget.pattern,
      windowTarget.matchMode,
      pollText
    );

    if (result.success) {
      addNotification(`Lab ${labNum} poll sent!`, 'success');
    } else {
      addNotification(result.error || 'Failed to send lab poll', 'error');
    }
  };

  return (
    <>
    <header className="header">
      <div className="header-left">
        <h1
          className="header-title header-title--clickable"
          onClick={() => openSettingsToTab('profiles')}
          title="Click to manage profiles"
        >
          {currentProfile.name.toUpperCase()}
        </h1>
      </div>

      <div className="header-center">
        <button
          className="header-nav-btn"
          onClick={goToPreviousDay}
          disabled={!hasPrevious}
          title="Previous day"
        >
          ◀
        </button>
        <span className="header-day-name">
          {currentDay ? currentDay.name : 'NO DAYS'}
        </span>
        <button
          className="header-nav-btn"
          onClick={goToNextDay}
          disabled={!hasNext}
          title="Next day"
        >
          ▶
        </button>
      </div>

      <div className="header-right">
        <div
          className={`header-mode-toggle ${isEditMode ? 'header-mode-toggle--edit' : ''}`}
          onClick={toggleEditMode}
          title={isEditMode ? 'Switch to Read mode' : 'Switch to Edit mode'}
        >
          <span className={`header-mode-label ${!isEditMode ? 'header-mode-label--active' : ''}`}>READ</span>
          <div className="header-mode-track">
            <div className="header-mode-thumb" />
          </div>
          <span className={`header-mode-label ${isEditMode ? 'header-mode-label--active' : ''}`}>EDIT</span>
        </div>
        <button
          className="header-settings-btn btn btn--small"
          onClick={toggleSettings}
          title="Settings"
        >
          *
        </button>
        <button
          className="btn btn--small btn--danger"
          onClick={() => window.electronAPI.quitApp()}
          title="Exit"
        >
          ✕
        </button>
      </div>

      {/* Lab Poll Popup */}
      {showLabPopup && (
        <div className="lab-popup-overlay" onClick={() => setShowLabPopup(false)}>
          <div className="lab-popup" onClick={(e) => e.stopPropagation()}>
            <div className="lab-popup-header">
              <span className="lab-popup-title">LAB POLL</span>
              <button
                className="btn btn--small btn--danger"
                onClick={() => setShowLabPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="lab-popup-content">
              <div className="lab-label-row">
                <label className="lab-popup-label">LAB NUMBER</label>
                <label className="lab-popup-label">CUSTOM</label>
              </div>
              <div className="lab-number-row">
                {currentDay?.dayNumber && currentDay?.labCount && currentDay.labCount > 0 && (
                  <div className="lab-buttons-row">
                    {Array.from({ length: currentDay.labCount }, (_, i) => {
                      const label = `${currentDay.dayNumber}.${i + 1}`;
                      return (
                        <button
                          key={label}
                          className={`btn btn--small lab-btn ${labNumber === label && !isCustomLabNumber ? 'lab-btn--active' : ''}`}
                          onClick={() => { setLabNumber(label); setIsCustomLabNumber(false); }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  className={`input lab-popup-input-small ${isCustomLabNumber ? 'lab-popup-input-small--active' : ''}`}
                  placeholder="..."
                  value={isCustomLabNumber ? labNumber : ''}
                  onChange={(e) => { setLabNumber(e.target.value); setIsCustomLabNumber(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendLabPoll();
                    if (e.key === 'Escape') setShowLabPopup(false);
                  }}
                  autoFocus
                />
              </div>
              <div className="lab-popup-preview">
                <label className="lab-popup-label">PREVIEW</label>
                <div className="lab-popup-preview-text">
                  {(currentProfile.settings.labPollTemplate || '').replace(
                    /<LAB_NUMBER>/g,
                    labNumber || '<LAB_NUMBER>'
                  )}
                </div>
              </div>
            </div>
            <div className="lab-popup-actions">
              <button
                className="btn btn--success"
                onClick={handleSendLabPoll}
              >
                SEND LAB POLL
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => setShowLabPopup(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </header>

      <div className={`sub-header ${isBreakAlertActive ? 'sub-header--alert' : ''}`}>
        <div className="header-timezone">
          <span className="header-timezone-time">{formatTime(currentTime)}</span>
          <div className="header-timezone-selector">
            <select
              className="header-timezone-select"
              value={timezone}
              onChange={(e) => updateSettings({ timezone: e.target.value })}
              title={timezone.replace(/_/g, ' ')}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <span className="header-timezone-abbr">{getTimezoneAbbr(timezone)}</span>
          </div>
        </div>

        {nextScheduled && (
          <div className={`header-countdown ${isBreakAlertActive ? 'header-countdown--alert' : ''}`}>
            <span className="header-countdown-label">{nextScheduled.time.label}</span>
            <span className="header-countdown-time">{formatCountdown(nextScheduled.secondsUntil)}</span>
          </div>
        )}

        <button
          className="header-time-btn btn btn--small"
          onClick={() => setShowTimeEstimatePopup(true)}
          title="Send Time Estimate"
        >
          ⏱
        </button>
        <button
          className="header-lab-btn btn btn--small"
          onClick={() => setShowLabPopup(true)}
          title="Send Lab Poll"
        >
          🧪
        </button>
      </div>

      {/* Lab Bar */}
      {currentDay?.dayNumber && currentDay?.labCount && currentDay.labCount > 0 && (
        <div className="lab-bar">
          <span className="lab-bar-label">LABS</span>
          <div className="lab-bar-buttons">
            {Array.from({ length: currentDay.labCount }, (_, i) => {
              const label = `${currentDay.dayNumber}.${i + 1}`;
              // Check if this lab is assigned to any section
              const assignedSection = currentDay.sections.find(s => s.assignedLab === label);
              const isAssigned = !!assignedSection;
              return (
                <button
                  key={label}
                  className={`btn btn--small lab-bar-btn ${isAssigned ? 'lab-bar-btn--assigned' : ''}`}
                  onClick={() => handleQuickLabPoll(label)}
                  draggable={isEditMode}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/lab-assign', JSON.stringify({ labNumber: label }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title={isEditMode ? `Drag to assign Lab ${label} to a section, or click to send poll` : `Send Lab ${label} poll`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Estimate Popup */}
      {showTimeEstimatePopup && (
        <div className="lab-popup-overlay" onClick={() => setShowTimeEstimatePopup(false)}>
          <div className="lab-popup" onClick={(e) => e.stopPropagation()}>
            <div className="lab-popup-header">
              <span className="lab-popup-title">TIME ESTIMATE</span>
              <button
                className="btn btn--small btn--danger"
                onClick={() => setShowTimeEstimatePopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="lab-popup-content">
              <div className="time-estimate-field">
                <label className="lab-popup-label">BREAK / LUNCH (OPTIONAL)</label>
                <select
                  className="select"
                  value={estimateBreakId}
                  onChange={(e) => setEstimateBreakId(e.target.value)}
                >
                  <option value="">No break</option>
                  {enabledScheduledTimes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label} ({formatDuration(st.duration || 15)})
                    </option>
                  ))}
                </select>
              </div>
              <label className="time-estimate-checkbox">
                <input
                  type="checkbox"
                  checked={estimateIncludeLab}
                  onChange={(e) => setEstimateIncludeLab(e.target.checked)}
                />
                <span>Include Lab Time</span>
              </label>
              {estimateIncludeLab && (
                <>
                  <div className="lab-label-row">
                    <label className="lab-popup-label">LAB NUMBER</label>
                    <label className="lab-popup-label">CUSTOM</label>
                  </div>
                  <div className="lab-number-row">
                    {currentDay?.dayNumber && currentDay?.labCount && currentDay.labCount > 0 && (
                      <div className="lab-buttons-row">
                        {Array.from({ length: currentDay.labCount }, (_, i) => {
                          const label = `${currentDay.dayNumber}.${i + 1}`;
                          return (
                            <button
                              key={label}
                              className={`btn btn--small lab-btn ${estimateLabNumber === label && !isCustomEstimateLabNumber ? 'lab-btn--active' : ''}`}
                              onClick={() => { setEstimateLabNumber(label); setIsCustomEstimateLabNumber(false); }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      className={`input lab-popup-input-small ${isCustomEstimateLabNumber ? 'lab-popup-input-small--active' : ''}`}
                      placeholder="..."
                      value={isCustomEstimateLabNumber ? estimateLabNumber : ''}
                      onChange={(e) => { setEstimateLabNumber(e.target.value); setIsCustomEstimateLabNumber(true); }}
                    />
                  </div>
                  <div className="time-estimate-lab-time">
                    <label className="lab-popup-label">LAB TIME (MIN)</label>
                    <input
                      type="number"
                      className="input lab-popup-input-small"
                      value={estimateLabTime}
                      onChange={(e) => setEstimateLabTime(e.target.value)}
                      min="1"
                      max="180"
                    />
                  </div>
                </>
              )}
              <div className="lab-popup-preview">
                <label className="lab-popup-label">PREVIEW</label>
                <div className="lab-popup-preview-text">
                  {calculateReturnTime().message}
                </div>
              </div>
            </div>
            <div className="lab-popup-actions">
              <button
                className="btn btn--accent btn--full-width"
                onClick={handleSendAndOpenTimer}
                title="Send estimate, press Enter, and open timer"
              >
                SEND & OPEN TIMER
              </button>
              <button
                className="btn btn--primary btn--half-width"
                onClick={handleOpenCountdownTimer}
                title="Open a shareable countdown timer window"
              >
                OPEN TIMER
              </button>
              <button
                className="btn btn--success btn--half-width"
                onClick={handleSendTimeEstimate}
                title="Send estimate to target window"
              >
                SEND ESTIMATE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
