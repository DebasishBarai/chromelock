document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  const unlockButton = document.getElementById('unlock');
  const errorMessage = document.getElementById('error-message');
  const attemptsLeft = document.getElementById('attempts-left');
  
  // Flag to track whether we should prevent navigation or not
  let preventNavigation = true;
  
  // Listen for storage changes to detect when we're deliberately closing
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.deliberateClose && changes.deliberateClose.newValue === true) {
      // Disable navigation prevention
      preventNavigation = false;
      // Remove the beforeunload event listener
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  });
  
  // Check if browser should be locked
  chrome.storage.local.get(['initialized', 'enabled', 'failedAttempts'], (data) => {
    if (!data.initialized || data.enabled === false) {
      // If the extension hasn't been initialized or is disabled, 
      // redirect to the options page
      preventNavigation = false;
      window.location.href = 'options.html';
      return;
    }
    
    // Check if we've already reached max attempts
    const failedAttempts = data.failedAttempts || 0;
    if (failedAttempts >= 3) {
      showError('Too many failed attempts. Chrome will now close.');
      attemptsLeft.style.display = 'none';
      
      // Disable navigation prevention and close browser
      preventNavigation = false;
      
      // Send close browser message
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'closeBrowser' });
      }, 1500);
    }
  });
  
  // Handler function for beforeunload
  const beforeUnloadHandler = (e) => {
    // Only prevent navigation if the flag is true
    if (preventNavigation) {
      // Cancel the event
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    } else {
      // Remove the handler to allow navigation
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  };
  
  // Prevent user from leaving the page
  window.addEventListener('beforeunload', beforeUnloadHandler);
  
  // Handle unlock button click
  unlockButton.addEventListener('click', verifyPassword);
  
  // Also trigger verification when Enter key is pressed
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      verifyPassword();
    }
  });
  
  function verifyPassword() {
    const password = passwordInput.value;
    
    if (!password) {
      showError('Please enter your password');
      return;
    }
    
    // Disable the button to prevent multiple submissions
    unlockButton.disabled = true;
    
    // Send message to background script to verify password
    chrome.runtime.sendMessage(
      { action: 'verifyPassword', password },
      (response) => {
        // Re-enable the button
        unlockButton.disabled = false;
        
        if (chrome.runtime.lastError) {
          showError('An error occurred. Please try again.');
          return;
        }
        
        if (response.success) {
          // Password correct - disable navigation prevention
          preventNavigation = false;
          
          // Remove the beforeunload event listener
          window.removeEventListener('beforeunload', beforeUnloadHandler);
          
          // Hide error messages
          errorMessage.style.display = 'none';
          attemptsLeft.style.display = 'none';
          
          // The background script will close this tab
        } else {
          // Password incorrect
          passwordInput.value = '';
          
          if (response.attemptsLeft > 0) {
            showError('Incorrect password. Please try again.');
            attemptsLeft.textContent = `Attempts left: ${response.attemptsLeft}`;
            attemptsLeft.style.display = 'block';
          } else {
            showError('Too many failed attempts. Chrome will now close.');
            attemptsLeft.style.display = 'none';
            
            // Disable navigation prevention before closing
            preventNavigation = false;
            
            // Explicitly request browser to close
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: 'closeBrowser' });
            }, 1500);
          }
        }
      }
    );
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    passwordInput.classList.add('error');
  }
});

// Make it fullscreen
document.documentElement.requestFullscreen().catch((e) => {
  console.error('Error attempting to enable fullscreen:', e);
});

// Prevent F5 refresh and other escape keys
document.addEventListener('keydown', (e) => {
  // Prevent F5, Escape, Alt+F4
  if (e.key === 'F5' || e.key === 'Escape' || (e.altKey && e.key === 'F4')) {
    e.preventDefault();
    return false;
  }
  
  // Prevent Ctrl+R, Ctrl+Shift+R (refresh)
  if ((e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
    e.preventDefault();
    return false;
  }
}); 