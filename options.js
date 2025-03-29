document.addEventListener('DOMContentLoaded', () => {
  const notInitialized = document.getElementById('not-initialized');
  const settingsContainer = document.getElementById('settings-container');
  const enabledToggle = document.getElementById('enabled-toggle');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const changePasswordButton = document.getElementById('change-password');
  const passwordError = document.getElementById('password-error');
  const passwordSuccess = document.getElementById('password-success');
  
  // Check if extension is initialized
  chrome.storage.local.get(['initialized', 'enabled'], (data) => {
    if (data.initialized) {
      // Show settings
      notInitialized.style.display = 'none';
      settingsContainer.style.display = 'block';
      
      // Set toggle state
      enabledToggle.checked = data.enabled !== false;
    } else {
      // Show not initialized message
      notInitialized.style.display = 'block';
      settingsContainer.style.display = 'none';
    }
  });
  
  // Enable/disable toggle
  enabledToggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enabledToggle.checked });
  });
  
  // Change password button click
  changePasswordButton.addEventListener('click', async () => {
    // Reset UI states
    hideError();
    hideSuccess();
    
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('All fields are required');
      return;
    }
    
    if (newPassword.length < 4) {
      showError('Password must be at least 4 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }
    
    try {
      // Verify current password
      const data = await chrome.storage.local.get('passwordHash');
      const currentHash = await hashPassword(currentPassword);
      
      if (currentHash !== data.passwordHash) {
        showError('Current password is incorrect');
        return;
      }
      
      // Save new password
      const newHash = await hashPassword(newPassword);
      await chrome.storage.local.set({ passwordHash: newHash });
      
      // Show success and clear inputs
      showSuccess();
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      
    } catch (error) {
      showError('An error occurred. Please try again.');
      console.error('Error changing password:', error);
    }
  });
  
  // Helper function to show error
  function showError(message) {
    passwordError.textContent = message;
    passwordError.style.display = 'block';
    passwordSuccess.style.display = 'none';
  }
  
  // Helper function to hide error
  function hideError() {
    passwordError.style.display = 'none';
  }
  
  // Helper function to show success
  function showSuccess() {
    passwordSuccess.style.display = 'block';
    passwordError.style.display = 'none';
  }
  
  // Helper function to hide success
  function hideSuccess() {
    passwordSuccess.style.display = 'none';
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