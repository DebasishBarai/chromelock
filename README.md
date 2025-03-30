# ChromeLock Extension

A Chrome extension that adds password protection to your browser. When enabled, ChromeLock will prompt for a password whenever the browser is opened. If the wrong password is entered too many times, the browser will automatically close.

## Features

- Password protection when Chrome starts
- Secure password storage using SHA-256 hashing
- Option to enable/disable password protection
- Change password functionality
- Auto-close Chrome after 3 failed password attempts
- Vector-based SVG icons for crisp display at any resolution

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store
2. Search for "ChromeLock"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" at the top-right
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and visible in your toolbar

## Usage

### Initial Setup

1. After installation, click on the ChromeLock icon in the toolbar
2. Set your desired password
3. Click "Save and Enable"

### Changing Settings

1. Click on the ChromeLock icon in the toolbar
2. Toggle the "Password Protection" switch to enable/disable the lock
3. Click "Change Password" or "Advanced Settings" to access more options

### Password Requirements

- Passwords must be at least 4 characters long
- Current password is required to change to a new password

## Security Notes

- This extension uses local storage with SHA-256 hashing for password storage
- For best security, use a strong, unique password
- The extension cannot protect against all security threats

## Technical Notes

- The extension uses SVG icons instead of PNG for better scaling and smaller file size
- Designed to work with Chrome's Manifest V3

## License

MIT License 