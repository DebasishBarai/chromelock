// Track failed password attempts
let failedAttempts = 0;
const MAX_ATTEMPTS = 3;
let isLocked = false;

// Check if extension is initialized and if password protection is enabled
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['initialized', 'enabled']);

  // If extension is not initialized yet, don't show lock screen
  // The first-time setup will be handled by the popup
  if (!data.initialized) {
    return;
  }

  // If password protection is enabled, show lock screen
  if (data.enabled !== false) {
    // Reset attempts on browser startup
    isLocked = true
    await resetFailedAttempts();
    showLockScreen();
  }
});

// Also check when Chrome is already running and extension is loaded/reloaded
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First time installation - set default values
    await chrome.storage.local.set({
      initialized: false,
      enabled: true,
      failedAttempts: 0,
      isLocked: false
    });
  } else if (details.reason === 'update' || details.reason === 'browser_update') {
    // Check if we need to show lock screen on update
    const data = await chrome.storage.local.get(['initialized', 'enabled']);
    if (data.initialized && data.enabled !== false) {
      await resetFailedAttempts();
      showLockScreen();
    }
  }
});

// Function to show the lock screen
function showLockScreen() {
  chrome.tabs.create({
    url: 'lockscreen.html',
    pinned: true
  }, (tab) => {
    // Store the lockscreen tab id so we can close it later
    chrome.storage.local.set({ lockScreenTabId: tab.id, isLocked: true });
  });
}

// Function to close the browser
function closeBrowser() {
  // Try multiple methods to close Chrome

  // First, we'll update our storage to indicate we're closing deliberately
  chrome.storage.local.set({ deliberateClose: true }, () => {
    // Method 1: Use chrome.tabs to open a special URL
    chrome.tabs.create({ url: "chrome://quit" });

    // Method 2: Close all windows
    setTimeout(() => {
      chrome.windows.getAll({}, function(windows) {
        for (let i = 0; i < windows.length; i++) {
          chrome.windows.remove(windows[i].id);
        }
      });
    }, 100);
  });
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'verifyPassword') {
    verifyPassword(message.password, sendResponse);
    return true; // Required for async response
  } else if (message.action === 'logFailedAttempt') {
    logFailedAttempt();
    sendResponse({ success: true });
  } else if (message.action === 'resetFailedAttempts') {
    resetFailedAttempts();
    sendResponse({ success: true });
  } else if (message.action === 'closeBrowser') {
    closeBrowser();
    sendResponse({ success: true });
  } else if (message.action === 'getFailedAttempts') {
    chrome.storage.local.get('failedAttempts', (data) => {
      sendResponse({ count: data.failedAttempts || 0 });
    });
    return true; // Required for async response
  }
});

// Verify password against stored hash
async function verifyPassword(password, sendResponse) {
  try {
    const syncData = await chrome.storage.sync.get(['passwordHash']);
    const data = await chrome.storage.local.get(['failedAttempts']);
    failedAttempts = data.failedAttempts || 0;

    // Simple hash comparison for now - in a real extension you'd use more secure methods
    const inputHash = await hashPassword(password);
    const isMatch = syncData.passwordHash === inputHash;

    if (isMatch) {
      await resetFailedAttempts();

      // First send the success response
      sendResponse({ success: true });

      // Then close the lock screen tab after a short delay
      // to ensure the response is processed first
      setTimeout(async () => {
        try {
          const lockScreenData = await chrome.storage.local.get('lockScreenTabId');
          if (lockScreenData.lockScreenTabId) {
            chrome.tabs.remove(lockScreenData.lockScreenTabId);
          }
        } catch (error) {
          console.error('Error closing lock screen tab:', error);
        }
      }, 200);
    } else {
      const result = await logFailedAttempt();
      sendResponse({
        success: false,
        attemptsLeft: result.attemptsLeft,
        shouldClose: result.attemptsLeft <= 0
      });

      // If max attempts reached, close browser after a short delay
      if (result.attemptsLeft <= 0) {
        setTimeout(closeBrowser, 1500);
      }
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    sendResponse({ success: false, error: 'An error occurred' });
  }
}

// Log a failed password attempt
async function logFailedAttempt() {
  // Get current failed attempts from storage
  const data = await chrome.storage.local.get('failedAttempts');
  failedAttempts = (data.failedAttempts || 0) + 1;

  // Update storage
  await chrome.storage.local.set({ failedAttempts });

  const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

  return { attemptsLeft };
}

// Reset failed attempts counter
async function resetFailedAttempts() {
  failedAttempts = 0;
  await chrome.storage.local.set({ failedAttempts: 0 });
}

// Simple password hashing function
// Note: In a production environment, use a more secure method
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

chrome.tabs.onCreated.addListener(async function(tab) {
  const data = await chrome.storage.local.get('isLocked');
  isLocked = data.isLocked;
  if (!isLocked) return; // Exit if not locked

  // For tabs that already have a URL
  if (tab.url && !tab.url.includes('lockscreen.html')) {
    chrome.tabs.remove(tab.id);
  } else {
    // For tabs that don't have a URL yet or are loading
    setTimeout(() => {
      chrome.tabs.get(tab.id, function(updatedTab) {
        // Check if tab still exists and now has a URL
        if (updatedTab && updatedTab.url && !updatedTab.url.includes('lockscreen.html')) {
          chrome.tabs.remove(tab.id);
        }
      });
    }, 500); // Give the tab time to load
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  const data = await chrome.storage.local.get('isLocked');
  isLocked = data.isLocked;
  if (!isLocked) return; // Exit if not locked


  const tabId = details.tabId;
  const url = details.url;

  // Check if the URL does NOT contain "lockscreen"
  if (!url.includes("lockscreen.html")) {

    // Redirect back to the current page
    chrome.tabs.update(tabId, { url: "lockscreen.html" });  // Redirect to a safe page
  }
}, { url: [{ urlMatches: ".*" }] });
