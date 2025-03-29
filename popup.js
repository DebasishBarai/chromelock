document.addEventListener('DOMContentLoaded', () => {
  const setupContainer = document.getElementById('setup-container');
  const statusContainer = document.getElementById('status-container');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const savePasswordButton = document.getElementById('save-password');
  const passwordError = document.getElementById('password-error');
  const enabledToggle = document.getElementById('enabled-toggle');
  const changePasswordButton = document.getElementById('change-password');
  const openOptionsLink = document.getElementById('open-options');
  
  // Check if extension is already initialized
  chrome.storage.local.get(['initialized', 'enabled'], (data) => {
    if (data.initialized) {
      // Show status interface
      statusContainer.style.display = 'block';
      setupContainer.style.display = 'none';
      
      // Set toggle status
      enabledToggle.checked = data.enabled !== false;
    } else {
      // Show setup interface
      setupContainer.style.display = 'block';
      statusContainer.style.display = 'none';
    }
  });
  
  // Save password button click
  savePasswordButton.addEventListener('click', () => {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate password
    if (!password) {
      showError('Please enter a password');
      return;
    }
    
    if (password.length < 4) {
      showError('Password must be at least 4 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    // Hash and save password
    hashPassword(password).then(hash => {
      chrome.storage.local.set({
        passwordHash: hash,
        initialized: true,
        enabled: true
      }, () => {
        // Show success status and update UI
        statusContainer.style.display = 'block';
        setupContainer.style.display = 'none';
        enabledToggle.checked = true;
      });
    });
  });
  
  // Enable/disable toggle
  enabledToggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enabledToggle.checked });
  });
  
  // Change password button click
  changePasswordButton.addEventListener('click', () => {
    // Open options page and focus on change password section
    chrome.runtime.openOptionsPage();
  });
  
  // Open options page
  openOptionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  // Helper function to show error
  function showError(message) {
    passwordError.textContent = message;
    passwordError.style.display = 'block';
  }
  
  // Helper function to hash password
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}); 