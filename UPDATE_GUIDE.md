# Auto-Update System Guide

TeachersPet includes a built-in auto-update system powered by `electron-updater` and GitHub Releases.

## Features

- **Automatic update checks** on app startup (production only)
- **Manual "Check for Updates"** button in Settings
- **Download progress** tracking with visual progress bar
- **One-click installation** - just click "Restart & Install"
- **Secure updates** - all updates are served from GitHub Releases

## For Users

### Checking for Updates

1. Open Settings (gear icon in header)
2. Navigate to the **UPDATES** tab
3. Click **"CHECK FOR UPDATES"**
4. If an update is available, click **"DOWNLOAD UPDATE"**
5. Once downloaded, click **"RESTART & INSTALL"**

The app will automatically restart and install the update.

### Automatic Update Checks

The app automatically checks for updates 3 seconds after startup (production builds only). If an update is available, you'll see a notification. You can download and install it from the Settings > Updates tab.

## For Developers

### Setup Instructions

#### 1. Update package.json

Replace `YOUR_GITHUB_USERNAME` in `package.json` with your actual GitHub username:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_ACTUAL_USERNAME",
  "repo": "TeachersPet"
}
```

#### 2. Configure Repository

The repository must be **public** or you need to set up a `GH_TOKEN` with access to private repos.

#### 3. Publishing Releases

To publish a new version:

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor, or major
   ```
   This creates a new git tag (e.g., `v1.0.1`)

2. **Push the tag to GitHub:**
   ```bash
   git push origin v1.0.1
   ```

3. **GitHub Actions automatically:**
   - Builds the app
   - Creates a GitHub Release with the version tag
   - Uploads the Windows installer (.exe) and update files
   - Publishes the release (making it available to users)

#### 4. Manual Release (Alternative)

If you prefer manual control:

1. Build and package locally:
   ```bash
   npm run build
   npm run package
   ```

2. Create a new Release on GitHub:
   - Go to your repository > Releases > "Create a new release"
   - Create a new tag (e.g., `v1.0.1`)
   - Upload files from `release/` folder:
     - `TeachersPet Setup 1.0.1.exe` (installer)
     - `latest.yml` (update manifest)
   - Publish the release

### Update Workflow Explained

1. **User launches app** → App checks GitHub for `latest.yml`
2. **Compare versions** → If remote version > local version, update available
3. **User clicks Download** → Downloads update files from GitHub Release
4. **User clicks Install** → App quits, installer runs, updates, and restarts

### File Structure

After building with `npm run package`, you'll get:

```
release/
├── TeachersPet Setup 1.0.0.exe      # Full installer (publish this)
├── latest.yml                        # Update manifest (publish this)
└── win-unpacked/                     # Unpacked app files (don't publish)
```

### Update Manifest (latest.yml)

This file tells the app about available updates:

```yaml
version: 1.0.1
files:
  - url: TeachersPet-Setup-1.0.1.exe
    sha512: [checksum]
    size: [bytes]
path: TeachersPet-Setup-1.0.1.exe
sha512: [checksum]
releaseDate: '2024-01-15T12:00:00.000Z'
```

## Troubleshooting

### Updates not working in development

Auto-update only works in production builds. Use `npm run package` to create a production build and test updates.

### "Update check failed" error

- Ensure the GitHub repository is accessible
- Check that `package.json` has correct `owner` and `repo`
- Verify there's at least one published release with `latest.yml`

### Download fails

- Check your internet connection
- Verify the release assets are uploaded correctly
- Ensure GitHub Actions has proper permissions

### App won't restart after update

This is normal - the installer runs independently. The user should see the installer complete and can manually launch the app.

## Security Notes

- All updates are served over HTTPS from GitHub
- File integrity is verified using SHA512 checksums
- No code signing is configured by default (Windows may show SmartScreen warning)
- To eliminate warnings, purchase a code signing certificate and configure it in `package.json`

## Advanced Configuration

### Code Signing (Optional)

To avoid Windows SmartScreen warnings, sign your app:

1. Obtain a code signing certificate
2. Add to `package.json`:
   ```json
   "win": {
     "target": "nsis",
     "publisherName": "CheckSomeBytes",
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "password"
   }
   ```

### Custom Update Server

To use a different update server instead of GitHub:

```json
"publish": {
  "provider": "generic",
  "url": "https://your-update-server.com/releases"
}
```

### Auto-download Updates

To automatically download updates without user interaction:

In `src/main/main.ts`, change:
```typescript
autoUpdater.autoDownload = true;
```

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

## Resources

- [electron-updater docs](https://www.electron.build/auto-update)
- [electron-builder docs](https://www.electron.build/)
- [GitHub Actions docs](https://docs.github.com/en/actions)
