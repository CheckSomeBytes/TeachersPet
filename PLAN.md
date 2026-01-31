# SANS Notes - Implementation Plan

## Overview
A Windows desktop app (Electron + React) for managing and sharing links with students during class sessions. Features an 8-bit theme, compact UI, and smart link management.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron |
| Frontend | React + TypeScript |
| Styling | CSS Modules or Styled Components (for 8-bit theming) |
| State Management | Zustand or React Context |
| Storage | JSON file (same folder as app) |
| Build Tool | Vite |
| Window Management | `node-window-manager` or `ffi-napi` with Windows API |

---

## Architecture

```
sansNotes/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── links.ts         # Link operations
│   │   │   ├── windows.ts       # Window focus/paste
│   │   │   └── storage.ts       # File I/O
│   │   └── services/
│   │       ├── linkChecker.ts   # Broken link detection
│   │       ├── titleFetcher.ts  # Fetch page titles
│   │       └── windowManager.ts # Window operations
│   │
│   ├── renderer/                # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── HamburgerMenu.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MainContent.tsx
│   │   │   ├── Day/
│   │   │   │   ├── DayView.tsx
│   │   │   │   ├── Section.tsx
│   │   │   │   └── SectionForm.tsx
│   │   │   ├── Link/
│   │   │   │   ├── LinkItem.tsx
│   │   │   │   ├── LinkForm.tsx
│   │   │   │   └── LinkActions.tsx
│   │   │   ├── Note/
│   │   │   │   ├── NoteItem.tsx      # Note with paste button only
│   │   │   │   ├── NoteForm.tsx      # Create/edit note
│   │   │   │   └── NoteEditor.tsx    # Textarea for content
│   │   │   ├── Settings/
│   │   │   │   ├── SettingsModal.tsx
│   │   │   │   ├── WindowConfig.tsx
│   │   │   │   ├── ThemeEditor.tsx
│   │   │   │   └── LinkChecker.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Notification.tsx
│   │   ├── hooks/
│   │   │   ├── useLinks.ts
│   │   │   ├── useDays.ts
│   │   │   └── useSettings.ts
│   │   ├── stores/
│   │   │   └── appStore.ts
│   │   ├── themes/
│   │   │   ├── 8bit-default.css
│   │   │   └── theme-variables.css
│   │   └── types/
│   │       └── index.ts
│   │
│   └── shared/                  # Shared types/utils
│       └── types.ts
│
├── data/                        # Local storage (created at runtime)
│   └── config.json
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Data Model

```typescript
// config.json structure
interface AppConfig {
  settings: Settings;
  days: Day[];
}

interface Settings {
  windowTarget: WindowTarget;
  checkLinksOnStartup: boolean;
  theme: Theme;
}

interface WindowTarget {
  matchMode: 'exact' | 'contains' | 'regex';
  pattern: string;  // e.g., "Zoom Meeting" or ".*Zoom.*"
}

interface Theme {
  name: string;
  isCustom: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
  fontFamily: string;  // e.g., "Press Start 2P" for 8-bit
}

interface Day {
  id: string;
  name: string;       // e.g., "Day 1", "Day 2"
  order: number;
  sections: Section[];
}

interface Section {
  id: string;
  name: string;
  order: number;
  links: Link[];
}

interface Link {
  id: string;
  url: string;
  title: string;      // Auto-fetched, user-editable
  customTitle?: string; // User override
  order: number;
  lastChecked?: Date;
  status?: 'ok' | 'broken' | 'timeout' | 'unchecked';
}

interface Note {
  id: string;
  title: string;      // Display name for the note
  content: string;    // Text content to paste
  order: number;
}

// Section can contain both links and notes
interface Section {
  id: string;
  name: string;
  order: number;
  links: Link[];
  notes: Note[];      // NEW: pasteable text notes
}
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Structure
1. Initialize Electron + React + TypeScript project with Vite
2. Set up project structure and build configuration
3. Create main process entry point
4. Set up IPC communication scaffolding
5. Create basic window with compact styling

**Deliverable:** Running Electron app with basic window

---

### Phase 2: Data Layer & Storage
1. Implement JSON file storage service
2. Create data models and TypeScript interfaces
3. Build IPC handlers for CRUD operations
4. Implement import/export functionality (JSON format)
5. Add file watcher for external changes (optional)

**Deliverable:** Working data persistence

---

### Phase 3: Core UI - Navigation & Days
1. Build hamburger menu component
2. Create sidebar with day list
3. Implement day creation/editing/deletion
4. Add drag-and-drop reordering for days
5. Apply compact styling (minimal padding)

**Deliverable:** Day management UI

---

### Phase 4: Sections & Links Management
1. Build section components with collapsible UI
2. Implement section CRUD operations
3. Create link item component with action buttons
4. Build link creation form
5. Implement auto-fetch for page titles using Electron's `webContents`
6. Add inline title editing
7. Implement drag-and-drop reordering

**Deliverable:** Full link management

---

### Phase 4b: Notes Management
1. Create note item component (paste button only, no browser button)
2. Build note creation/edit form with textarea
3. Add content preview (hover tooltip or expandable)
4. Notes share sections with links, can be intermixed
5. Drag-and-drop reordering (notes can be reordered among links)

**Deliverable:** Full content management (links + notes)

---

### Phase 5: Link Actions
1. **Open in Chrome:**
   - Use `shell.openExternal()` with Chrome as preferred browser
   - Fallback to default browser if Chrome not found

2. **Focus Window & Paste:**
   - Implement window enumeration using `node-window-manager` or native bindings
   - Build window matching logic (exact, contains, regex)
   - Use `robotjs` or native API for:
     - Finding window by title pattern
     - Bringing window to foreground
     - Simulating Ctrl+V paste
   - Show notification if window not found

**Deliverable:** Working link action buttons

---

### Phase 6: Settings & Configuration
1. Build settings modal/panel
2. Create window target configuration UI
   - Match mode selector (exact/contains/regex)
   - Pattern input with test button
3. Add "check links on startup" toggle
4. Implement global settings persistence

**Deliverable:** Configurable app settings

---

### Phase 7: Link Health Checker
1. Build link checking service
   - HTTP HEAD requests with timeout (10s default)
   - Detect 4xx, 5xx errors
   - Handle timeouts as broken
2. Create broken links report UI
3. Implement "check all links" action
4. Add startup check based on setting
5. Visual indicators for link status in UI

**Deliverable:** Link health monitoring

---

### Phase 8: 8-Bit Theme System
1. Set up CSS custom properties for theming
2. Create default 8-bit theme
   - Pixel font (Press Start 2P or similar)
   - Retro color palette
   - Pixelated borders/shadows
   - Chunky buttons
3. Build theme editor UI
   - Color pickers for each theme color
   - Font selector
   - Live preview
4. Implement theme persistence
5. Add theme import/export

**Deliverable:** Full theming system

---

### Phase 9: Polish & Packaging
1. Add keyboard shortcuts
2. Implement notifications/toasts
3. Add loading states and error handling
4. Window size/position persistence
5. Build installers (electron-builder)
6. Create app icon (8-bit style)

**Deliverable:** Production-ready app

---

## Key Technical Decisions

### Window Focus & Paste Implementation
```typescript
// Using node-window-manager for cross-platform window management
import { windowManager } from 'node-window-manager';

async function focusAndPaste(pattern: string, matchMode: string, url: string) {
  const windows = windowManager.getWindows();

  const target = windows.find(w => {
    const title = w.getTitle();
    switch (matchMode) {
      case 'exact': return title === pattern;
      case 'contains': return title.includes(pattern);
      case 'regex': return new RegExp(pattern).test(title);
    }
  });

  if (!target) {
    // Show notification via IPC
    return { success: false, error: 'Window not found' };
  }

  // Copy URL to clipboard
  clipboard.writeText(url);

  // Focus window
  target.bringToTop();

  // Small delay for focus
  await sleep(100);

  // Simulate Ctrl+V using robotjs
  robot.keyTap('v', 'control');

  return { success: true };
}
```

### Title Fetching
```typescript
// Use Electron's BrowserWindow to fetch titles
async function fetchPageTitle(url: string): Promise<string> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({ show: false });
    win.loadURL(url);

    win.webContents.once('did-finish-load', () => {
      const title = win.getTitle();
      win.close();
      resolve(title || url);
    });

    // Timeout fallback
    setTimeout(() => {
      win.close();
      resolve(url);
    }, 5000);
  });
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "zustand": "^4.x",
    "uuid": "^9.x",
    "node-window-manager": "^2.x",
    "robotjs": "^0.6.x"
  },
  "devDependencies": {
    "electron": "^28.x",
    "electron-builder": "^24.x",
    "electron-vite": "^2.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "@types/react": "^18.x"
  }
}
```

---

## UI Mockup (Compact Layout)

```
┌─────────────────────────────────────────────────┐
│ ☰ │ SANS Notes              │ ⚙️ Settings      │
├───┴─────────────────────────────────────────────┤
│ ┌─────────┐                                     │
│ │ Day 1   │  ═══ Morning Session ═══            │
│ │ Day 2 ◄─│  ┌─────────────────────────────────┐│
│ │ Day 3   │  │ 🔗 Wireshark Docs    [🌐][📋]  ││
│ │ Day 4   │  │ 🔗 PCAP Samples      [🌐][📋]  ││
│ │ Day 5   │  └─────────────────────────────────┘│
│ │         │  + Add Link                         │
│ │ + Day   │                                     │
│ └─────────┘  ═══ Lab Resources ═══              │
│              ┌─────────────────────────────────┐│
│              │ 🔗 Lab Environment   [🌐][📋]  ││
│              │ ⚠️ VM Downloads      [🌐][📋]  ││
│              └─────────────────────────────────┘│
│              + Add Section                      │
└─────────────────────────────────────────────────┘
```

Legend:
- `[🌐]` = Open in Chrome
- `[📋]` = Focus window & paste
- `⚠️` = Broken link indicator

### Notes Example
```
═══ Commands ═══
┌─────────────────────────────────────┐
│ 📝 Wireshark filter        [📋]   │  ← Note (paste only)
│ 📝 tcpdump command         [📋]   │
│ 🔗 Wireshark Docs    [🌐] [📋]   │  ← Link (both buttons)
└─────────────────────────────────────┘
```

Notes display a preview of their content on hover or expand.

---

## Estimated Order of Work

1. **Phase 1** - Project Setup
2. **Phase 2** - Data Layer
3. **Phase 3** - Navigation UI
4. **Phase 4** - Sections & Links
5. **Phase 5** - Link Actions
6. **Phase 6** - Settings
7. **Phase 7** - Link Checker
8. **Phase 8** - Theming
9. **Phase 9** - Polish

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Tech Stack | Electron + React |
| Window Matching | All modes (exact, contains, regex) |
| Storage Location | Same folder as app |
| Import/Export | Yes |
| Window Not Found | Show notification |
| Broken Link Detection | 4xx, 5xx errors + timeouts |
