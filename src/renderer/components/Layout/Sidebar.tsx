import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

function Sidebar({ isOpen }: SidebarProps) {
  const { selectedDayId, selectDay, addDay, updateDay, deleteDay, getCurrentProfile } = useAppStore();
  const currentProfile = getCurrentProfile();
  const [isAdding, setIsAdding] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddDay = () => {
    if (newDayName.trim()) {
      addDay(newDayName.trim());
      setNewDayName('');
      setIsAdding(false);
    }
  };

  const handleEditDay = (dayId: string) => {
    if (editName.trim()) {
      updateDay(dayId, { name: editName.trim() });
      setEditingId(null);
    }
  };

  const startEditing = (dayId: string, currentName: string) => {
    setEditingId(dayId);
    setEditName(currentName);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-days">
        {currentProfile.days
          .sort((a, b) => a.order - b.order)
          .map((day) => (
            <div
              key={day.id}
              className={`sidebar-day ${selectedDayId === day.id ? 'sidebar-day--selected' : ''}`}
            >
              {editingId === day.id ? (
                <div className="sidebar-day-edit">
                  <input
                    type="text"
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditDay(day.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    className="btn btn--small btn--success"
                    onClick={() => handleEditDay(day.id)}
                  >
                    ✓
                  </button>
                  <button
                    className="btn btn--small btn--secondary"
                    onClick={() => setEditingId(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="sidebar-day-btn"
                    onClick={() => selectDay(day.id)}
                  >
                    {day.name}
                  </button>
                  <div className="sidebar-day-actions">
                    <button
                      className="sidebar-action-btn"
                      onClick={() => startEditing(day.id, day.name)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className="sidebar-action-btn sidebar-action-btn--danger"
                      onClick={() => {
                        if (confirm(`Delete "${day.name}"?`)) {
                          deleteDay(day.id);
                        }
                      }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      {isAdding ? (
        <div className="sidebar-add-form">
          <input
            type="text"
            className="input"
            placeholder="Day name..."
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddDay();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewDayName('');
              }
            }}
            autoFocus
          />
          <div className="sidebar-add-actions">
            <button className="btn btn--small btn--success" onClick={handleAddDay}>
              ADD
            </button>
            <button
              className="btn btn--small btn--secondary"
              onClick={() => {
                setIsAdding(false);
                setNewDayName('');
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button className="btn sidebar-add-btn" onClick={() => setIsAdding(true)}>
          + DAY
        </button>
      )}
    </aside>
  );
}

export default Sidebar;
