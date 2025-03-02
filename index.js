document.addEventListener('DOMContentLoaded', function() {
  const linksTextarea = document.getElementById('links');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fileInput = document.getElementById('fileInput');
  const downloadCheckbox = document.getElementById('checkbox');
  const temporaryRadio = document.getElementById('temporary');
  const cacheRadio = document.getElementById('cache');
  const messagesContainer = document.getElementById('messages');

  // Initialize the messages container
  function addMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Load saved URLs from storage
  chrome.storage.local.get(['URLs', 'downloadCheckbox', 'temporaryRemoval'], function(data) {
    if (data.URLs) {
      linksTextarea.value = data.URLs;
    }
    if (data.downloadCheckbox !== undefined) {
      downloadCheckbox.checked = data.downloadCheckbox;
    }
    if (data.temporaryRemoval !== undefined) {
      temporaryRadio.checked = data.temporaryRemoval;
      cacheRadio.checked = !data.temporaryRemoval;
    }
  });

  // Handle file upload
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      linksTextarea.value = content;
      addMessage(`File loaded: ${file.name} (${countValidUrls(content)} URLs)`, 'success');
    };
    reader.onerror = function() {
      addMessage('Error reading file', 'error');
    };
    reader.readAsText(file);
  });

  // Count valid URLs in the content
  function countValidUrls(content) {
    if (!content) return 0;
    const urls = content.split('\n');
    return urls.filter(url => url.trim().length > 0 && (url.includes('http://') || url.includes('https://'))).length;
  }

  // Start button click handler
  startBtn.addEventListener('click', function() {
    const urls = linksTextarea.value;
    const isTemporary = temporaryRadio.checked;
    
    if (!urls || !urls.includes('http')) {
      addMessage('Please enter at least one valid URL', 'error');
      return;
    }

    // Count URLs for user feedback
    const urlCount = countValidUrls(urls);
    if (urlCount > 1000) {
      addMessage('Warning: For optimal performance, we recommend processing up to 1000 URLs at a time', 'warning');
    }

    // Calculate chunks
    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url.length > 2);
    const totalChunks = Math.ceil(urlList.length / 100);
    
    // Save data to local storage
    chrome.storage.local.set({
      'URLs': urls,
      'downloadCheckbox': downloadCheckbox.checked,
      'temporaryRemoval': isTemporary,
      'currentChunkIndex': 0,
      'totalChunks': totalChunks,
      'submittedLinksAll': [],
      'failedLinksAll': []
    }, function() {
      if (chrome.runtime.lastError) {
        addMessage(`Error: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      
      // First check if we're already on the Google Search Console removals page
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const isOnRemovalsPage = currentTab && 
                                 currentTab.url && 
                                 (currentTab.url.includes('search.google.com/search-console/removals') || 
                                  currentTab.url.includes('search.google.com/search-console/removal-requests'));
        
        if (isOnRemovalsPage) {
          // We're already on the removals page, use this tab
          addMessage(`Starting process for ${urlCount} URLs (${totalChunks} chunks)`, 'info');
          addMessage('Processing on current tab...', 'success');
          
          // Execute the script in the current tab
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['linksresubmission.js']
          });
        } else {
          // Show a popup warning instead of messages in the container
          showWarningPopup(urlCount, totalChunks);
        }
      });
    });
  });

  // Function to show a warning popup
  function showWarningPopup(urlCount, totalChunks) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'warning-popup';
    
    // Create popup content
    popup.innerHTML = `
      <div class="popup-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h3>Not on Removals Page</h3>
        <button class="close-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="popup-body">
        <p>You need to be on the Google Search Console removals page to process URLs.</p>
        <p class="popup-info">Your ${urlCount} URLs (${totalChunks} chunks) have been saved and are ready to process.</p>
        <div class="popup-steps">
          <div class="step"><span>1</span> Navigate to Search Console > Removals</div>
          <div class="step"><span>2</span> Select your property</div>
          <div class="step"><span>3</span> Click "Start Process" again</div>
        </div>
      </div>
      <div class="popup-footer">
        <button class="secondary-button close-popup-btn">Close</button>
        <button class="primary-button open-page-btn">Open Removals Page</button>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners
    const closeButton = popup.querySelector('.close-button');
    const closePopupBtn = popup.querySelector('.close-popup-btn');
    const openPageBtn = popup.querySelector('.open-page-btn');
    
    function closePopup() {
      document.body.removeChild(overlay);
      document.body.removeChild(popup);
    }
    
    closeButton.addEventListener('click', closePopup);
    closePopupBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);
    
    openPageBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://search.google.com/search-console/removals' });
      closePopup();
    });
  }

  // Stop button click handler
  stopBtn.addEventListener('click', function() {
    // Reset the chunking process
    chrome.storage.local.set({
      'currentChunkIndex': 0
    }, function() {
      addMessage('Process stopped. You can restart from the beginning.', 'warning');
    });
  });

  // Handle drag and drop for file upload
  const dropArea = document.querySelector('.file-upload');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropArea.classList.add('highlight');
  }
  
  function unhighlight() {
    dropArea.classList.remove('highlight');
  }
  
  dropArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
      fileInput.files = files;
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  }

  // Add initial message
  addMessage('Ready to process URLs. Click "Start Process" to begin.', 'info');
});

