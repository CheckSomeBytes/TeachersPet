import React from 'react';
import { useAppStore } from '../../stores/appStore';
import DayView from '../Day/DayView';
import './MainContent.css';

function MainContent() {
  const { selectedDayId, getCurrentProfile } = useAppStore();
  const currentProfile = getCurrentProfile();
  const selectedDay = currentProfile.days.find((d) => d.id === selectedDayId);

  if (!selectedDay) {
    return (
      <main className="main-content">
        <div className="main-content-empty">
          <div className="empty-icon">📋</div>
          <p>SELECT OR CREATE A DAY TO GET STARTED</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <DayView day={selectedDay} />
    </main>
  );
}

export default MainContent;
