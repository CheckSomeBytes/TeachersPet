import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import './AddItemForm.css';

interface AddPollFormProps {
  dayId: string;
  sectionId: string;
  onClose: () => void;
}

function AddPollForm({ dayId, sectionId, onClose }: AddPollFormProps) {
  const { addPoll } = useAppStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    addPoll(dayId, sectionId, title.trim(), content.trim());
    onClose();
  };

  return (
    <div className="add-item-form">
      <div className="add-item-fields">
        <input
          type="text"
          className="input"
          placeholder="Poll title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          autoFocus
        />
        <textarea
          className="textarea"
          placeholder="Poll content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
      </div>
      <div className="add-item-actions">
        <button className="btn btn--small btn--success" onClick={handleSubmit}>
          ADD
        </button>
        <button className="btn btn--small btn--secondary" onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

export default AddPollForm;
