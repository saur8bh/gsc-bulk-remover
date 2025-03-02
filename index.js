document.addEventListener('DOMContentLoaded', function() {
  const linksTextarea = document.getElementById('links');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fileInput = document.getElementById('fileInput');
  const downloadCheckbox = document.getElementById('checkbox');
  const temporaryRadio = document.getElementById('temporary');
  const cacheRadio = document.getElementById('cache');
  const messagesContainer = document.getElementById('messages');
  const progressSection = document.getElementById('progress-section');
  
  // Progress UI elements
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const processedCount = document.getElementById('processed-count');
  const timeElapsed = document.getElementById('time-elapsed');
  const timeRemaining = document.getElementById('time-remaining');
  const currentChunk = document.getElementById('current-chunk');
  
  // Progress tracking variables
  let startTime = null;
  let progressInterval = null;
  let totalURLs = 0;
  let processedURLs = 0;
  
  // Initialize the messages container
  function addMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Format time in HH:MM:SS
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }
  
  // Update progress UI
  function updateProgressUI() {
    if (!startTime) return;
    
    // Get current progress data
    chrome.storage.local.get([
      'currentChunkIndex', 
      'totalChunks', 
      'submittedLinksAll', 
      'failedLinksAll',
      'totalURLCount',
      'processedURLCount',
      'lastUpdateTime',
      'isProcessing'
    ], function(data) {
      // Check if process has been explicitly stopped
      if (data.isProcessing === false) {
        clearInterval(progressInterval);
        progressInterval = null;
        progressSection.style.display = 'none';
        return;
      }
      
      const currentChunkIndex = data.currentChunkIndex || 0;
      const totalChunks = data.totalChunks || 1;
      const submittedLinksAll = data.submittedLinksAll || [];
      const failedLinksAll = data.failedLinksAll || [];
      const totalURLCount = data.totalURLCount || totalURLs;
      const processedURLCount = data.processedURLCount || 0;
      
      // Check if the process is stale (no updates in the last 30 seconds)
      const currentTime = Date.now();
      const lastUpdateTime = data.lastUpdateTime || startTime;
      const timeSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // in seconds
      
      if (timeSinceLastUpdate > 30 && processedURLCount > 0) {
        // Process appears to be stale after starting (likely due to page refresh)
        chrome.storage.local.set({
          'isProcessing': false
        }, function() {
          addMessage('Process appears to have stopped unexpectedly. Please restart if needed.', 'warning');
          clearInterval(progressInterval);
          progressInterval = null;
          progressSection.style.display = 'none';
        });
        return;
      }
      
      // Update lastUpdateTime to track when progress was last updated
      chrome.storage.local.set({ 'lastUpdateTime': Date.now() });
      
      // Calculate progress percentage
      const progress = Math.min(100, Math.round((processedURLCount / totalURLCount) * 100) || 0);
      
      // Calculate time metrics
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const avgTimePerURL = processedURLCount > 0 ? elapsedSeconds / processedURLCount : 0;
      const remainingURLs = totalURLCount - processedURLCount;
      const estimatedRemainingSeconds = avgTimePerURL > 0 ? Math.floor(remainingURLs * avgTimePerURL) : 0;
      
      // Update UI elements
      progressBar.style.width = `${progress}%`;
      progressPercentage.textContent = `${progress}%`;
      processedCount.textContent = `${processedURLCount}/${totalURLCount}`;
      timeElapsed.textContent = formatTime(elapsedSeconds);
      timeRemaining.textContent = progress < 100 ? formatTime(estimatedRemainingSeconds) : '00:00:00';
      currentChunk.textContent = `${currentChunkIndex + 1}/${totalChunks}`;
      
      // Add message for submitted/failed counts
      if (processedURLCount > 0 && processedURLCount % 10 === 0) {
        addMessage(`Progress update: Submitted: ${submittedLinksAll.length}, Failed: ${failedLinksAll.length}`, 'info');
      }
      
      // If process is complete, stop the interval
      if (progress >= 100) {
        clearInterval(progressInterval);
        progressInterval = null;
        chrome.storage.local.set({ 'isProcessing': false });
        addMessage(`Process completed in ${formatTime(elapsedSeconds)}`, 'success');
        addMessage(`Final results: Submitted: ${submittedLinksAll.length}, Failed: ${failedLinksAll.length}`, 'success');
      }
    });
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
    totalURLs = urlCount; // Store for progress tracking
    
    if (urlCount > 1000) {
      addMessage('Warning: For optimal performance, we recommend processing up to 1000 URLs at a time', 'warning');
    }

    // Calculate chunks
    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url.length > 2);
    const totalChunks = Math.ceil(urlList.length / 100);
    
    // Reset progress tracking
    startTime = Date.now();
    processedURLs = 0;
    
    // Clear any existing interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    // Show progress section
    progressSection.style.display = 'block';
    
    // Start progress update interval
    progressInterval = setInterval(updateProgressUI, 1000);
    
    // Save data to local storage
    chrome.storage.local.set({
      'URLs': urls,
      'downloadCheckbox': downloadCheckbox.checked,
      'temporaryRemoval': isTemporary,
      'currentChunkIndex': 0,
      'totalChunks': totalChunks,
      'submittedLinksAll': [],
      'failedLinksAll': [],
      'totalURLCount': urlCount,
      'processedURLCount': 0,
      'startTime': startTime,
      'lastUpdateTime': startTime,
      'isProcessing': true,
      'stopRequested': false
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
    // First, send a message to the active tab to stop processing
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stopProcessing" }, function(response) {
          // Handle potential error if content script is not loaded
          if (chrome.runtime.lastError) {
            console.log("Could not communicate with content script: ", chrome.runtime.lastError.message);
          }
        });
      }
    });
    
    // Reset the chunking process and clear all progress data
    chrome.storage.local.set({
      'currentChunkIndex': 0,
      'processedURLCount': 0,
      'startTime': null,
      'lastUpdateTime': null,
      'isProcessing': false,
      'stopRequested': true
    }, function() {
      addMessage('Process stopped. You can restart from the beginning.', 'warning');
      
      // Stop progress tracking
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // Reset progress UI
      progressBar.style.width = '0%';
      progressPercentage.textContent = '0%';
      timeRemaining.textContent = '--:--:--';
      progressSection.style.display = 'none';
      
      // Reset tracking variables
      startTime = null;
      processedURLs = 0;
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

  // Check if a process is already running and update UI accordingly
  chrome.storage.local.get([
    'currentChunkIndex', 
    'totalChunks', 
    'totalURLCount',
    'startTime',
    'processedURLCount',
    'lastUpdateTime',
    'isProcessing'
  ], function(data) {
    // If process was explicitly stopped or marked as not processing, don't resume
    if (data.isProcessing === false) {
      progressSection.style.display = 'none';
      return;
    }
    
    if (data.currentChunkIndex !== undefined && 
        data.totalChunks !== undefined && 
        data.currentChunkIndex < data.totalChunks &&
        data.startTime) {
      
      // Check if the process is stale (no updates in the last 30 seconds)
      const currentTime = Date.now();
      const lastUpdateTime = data.lastUpdateTime || data.startTime;
      const timeSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // in seconds
      
      if (timeSinceLastUpdate > 30) { // 30 seconds threshold
        // Process appears to be stale, reset it
        chrome.storage.local.set({
          'currentChunkIndex': 0,
          'processedURLCount': 0,
          'startTime': null,
          'isProcessing': false
        }, function() {
          addMessage('Previous process appears to be inactive. Progress has been reset.', 'warning');
          progressSection.style.display = 'none';
        });
      } else {
        // Process is still active or recently active, restore progress tracking
        startTime = data.startTime;
        totalURLs = data.totalURLCount;
        progressSection.style.display = 'block';
        
        // Start progress update interval
        progressInterval = setInterval(updateProgressUI, 1000);
        
        addMessage(`Resuming process: Chunk ${data.currentChunkIndex + 1} of ${data.totalChunks}`, 'info');
        updateProgressUI();
      }
    }
  });

  // Add initial message
  addMessage('Ready to process URLs. Click "Start Process" to begin.', 'info');
});

