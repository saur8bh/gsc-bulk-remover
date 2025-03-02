// Add a listener for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "stopProcessing") {
    console.log("Stop processing requested");
    // Set the stop flag in storage
    chrome.storage.local.set({ 'stopRequested': true });
    sendResponse({ status: "Stopping process" });
  }
  return true; // Keep the message channel open for async response
});

function linksResubmission() {
    console.log("Starting URL removal process");
    
    // Get data from storage
    chrome.storage.local.get([
        "URLs", 
        "downloadCheckbox", 
        "temporaryRemoval", 
        "currentChunkIndex", 
        "totalChunks", 
        "submittedLinksAll", 
        "failedLinksAll", 
        "totalURLCount", 
        "processedURLCount", 
        "stopRequested"
    ], function(data) {
        // Check if stop was requested
        if (data.stopRequested) {
            console.log("Process was stopped by user. Exiting.");
            return;
        }

        const urls = data.URLs;
        const downloadResults = data.downloadCheckbox;
        const isTemporary = data.temporaryRemoval !== undefined ? data.temporaryRemoval : true;
        
        if (!urls || !urls.includes("http")) {
            alert("Please, insert at least one link.");
            return;
        }

        // Get the current chunk of URLs
        const allUrls = urls.split("\n");
        const allUrlsTrimmed = allUrls.map(element => element.trim()).filter(element => element.length > 2);
        
        // Get the current chunk index or default to 0
        const chunkIndex = data.currentChunkIndex || 0;
        // Calculate total chunks if not already set
        const chunksTotal = data.totalChunks || Math.ceil(allUrlsTrimmed.length / 100);
        
        // Get the current chunk of URLs (100 at a time)
        const startIndex = chunkIndex * 100;
        const endIndex = Math.min(startIndex + 100, allUrlsTrimmed.length);
        const urlListTrimmed = allUrlsTrimmed.slice(startIndex, endIndex);
        
        // Get previously processed links or initialize empty arrays
        const previousSubmittedLinks = data.submittedLinksAll || [];
        const previousFailedLinks = data.failedLinksAll || [];
        
        // Initialize arrays for current chunk
        const submittedLinks = [];
        const failedLinks = [];
        
        // Track processed URLs count
        let currentProcessedCount = data.processedURLCount || 0;

        // Display progress message
        const progressMessage = `Processing chunk ${chunkIndex + 1} of ${chunksTotal} (URLs ${startIndex + 1} to ${endIndex} of ${allUrlsTrimmed.length})`;
        console.log(progressMessage);

        function removeUrlJs(index, urlList, nextButton = false, submitButtonFound = false) {
            // Check if stop was requested before processing next URL
            chrome.storage.local.get(['stopRequested'], function(stopData) {
                if (stopData.stopRequested) {
                    console.log("Process stopped by user during URL processing.");
                    return;
                }
                
                if (index < urlList.length) {
                    clickNextButton(nextButton, isTemporary);
                    setTimeout(function() {
                        urlToSubmissionBar(urlList, index, isTemporary);
                        setTimeout(function() {
                            submissionNextButton();
                            setTimeout(function() {
                                submitButtonFound = submitRequest(submitButtonFound);
                                setTimeout(function() {
                                    checkOutcome(urlList, index, submitButtonFound);
                                    
                                    // Update processed count
                                    currentProcessedCount++;
                                    chrome.storage.local.set({
                                        processedURLCount: currentProcessedCount,
                                        lastUpdateTime: Date.now()
                                    });
                                    
                                    setTimeout(function() {
                                        removeUrlJs(index + 1, urlList, false);
                                    }, 1500);
                                }, 2000);
                            }, 500);
                        }, 500);
                    }, 1500);
                } else {
                    // Save the results of this chunk
                    const updatedSubmittedLinksAll = [...previousSubmittedLinks, ...submittedLinks];
                    const updatedFailedLinksAll = [...previousFailedLinks, ...failedLinks];
                    
                    chrome.storage.local.set({
                        submittedLinksAll: updatedSubmittedLinksAll,
                        failedLinksAll: updatedFailedLinksAll,
                        lastUpdateTime: Date.now()
                    }, function() {
                        // Check if there are more chunks to process
                        chrome.storage.local.get(['stopRequested'], function(stopData) {
                            if (stopData.stopRequested) {
                                console.log("Process stopped by user before moving to next chunk.");
                                return;
                            }
                            
                            if (chunkIndex + 1 < chunksTotal) {
                                // Update the chunk index and reload the page to process the next chunk
                                chrome.storage.local.set({
                                    currentChunkIndex: chunkIndex + 1,
                                    lastUpdateTime: Date.now()
                                }, function() {
                                    // Add completion message for this chunk
                                    const chunkCompleteMessage = `Completed chunk ${chunkIndex + 1} of ${chunksTotal}. Submitted: ${submittedLinks.length}, Failed: ${failedLinks.length}. Proceeding to next chunk...`;
                                    console.log(chunkCompleteMessage);
                                    
                                    // Reload the page after a short delay to process the next chunk
                                    setTimeout(function() {
                                        location.reload();
                                    }, 3000);
                                });
                            } else {
                                // All chunks processed, show final results
                                const finalMessage = `All URLs processed! Total submitted: ${updatedSubmittedLinksAll.length}, Total failed: ${updatedFailedLinksAll.length}`;
                                alert(finalMessage);
                                
                                // Reset the chunk index for future runs
                                chrome.storage.local.set({
                                    currentChunkIndex: 0,
                                    isProcessing: false,
                                    lastUpdateTime: Date.now()
                                }, function() {
                                    if (downloadResults) {
                                        downloadResultsFile(updatedSubmittedLinksAll, updatedFailedLinksAll);
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }

        function clickNextButton(nextButton, temporaryRemoval) {
            console.log("next button");
            console.log(temporaryRemoval);
            if (!nextButton) {
                document.querySelector('.RveJvd.snByac').click();
                if (!temporaryRemoval) {
                    setTimeout(function() {
                        const buttonsArray = document.getElementsByClassName('kx3Hed VZhFab');
                        const clearCacheButtonIndex = Array.from(buttonsArray).findIndex(button => button.textContent.trim() === 'Clear cached URL');
                        if (clearCacheButtonIndex !== -1) {
                            console.log("found the cache button");
                            buttonsArray[clearCacheButtonIndex].click();
                        } else {
                            console.log("Cache button not found, skipping cache removal.");
                        }
                    }, 500);
                }
            }
        }

        function urlToSubmissionBar(urlList, index, temporaryRemoval) {
            const urlBarLabelIndex = temporaryRemoval ? 0 : 1;
            const urlBarIndex = 0;
            const urlBarTextboxIndex = 1;
            const urlBarLabel = document.querySelectorAll('.Ufn6O.PPB5Hf')[urlBarLabelIndex];
            if (urlBarLabel) {
                const urlBar = urlBarLabel.childNodes[urlBarIndex].childNodes[urlBarTextboxIndex];
                if (urlBar) {
                    urlBar.value = urlList[index];
                }
            }
        }

        function submissionNextButton() {
            const nextButton = document.querySelectorAll('.RDPZE');
            const nextButtonSpan = 2;
            for (let j = 0; j < nextButton.length; j++) {
                if (nextButton[j].childNodes[nextButtonSpan]) {
                    nextButton[j].removeAttribute('aria-disabled');
                    nextButton[j].setAttribute('tabindex', 0);
                    nextButton[j].childNodes[nextButtonSpan].click();
                }
            }
        }

        function submitRequest(submitButtonFound) {
            let closeButtonFound = false;
            const submitButton = document.querySelectorAll('.CwaK9 .RveJvd.snByac');

            for (let k = 0; k < submitButton.length; k++) {
                console.log(submitButton);
                console.log(k, closeButtonFound);
                if (submitButton[k].textContent.toLowerCase() == 'submit request') {
                    submitButton[k].click();
                    console.log("breaking out");
                    return true;
                } else {
                    closeButtonFound = submitButton[k].textContent.toLowerCase() == 'close' ? true : false;
                    if (closeButtonFound) {
                        break;
                    }
                }
            }
            return false;
        }

        function checkOutcome(urlList, index, submitButtonFound) {
            if (document.querySelectorAll('.PNenzf').length > 0) {
                failedLinks.push(urlList[index]);
                console.log(`Failed, ${urlList[index]} already exists as a submitted request, duplicates are not permitted.`);
                const closeButton = document.querySelectorAll('.CwaK9 .RveJvd.snByac');
                for (let k = 0; k < closeButton.length; k++) {
                    if ((closeButton[k].childNodes[0] && (closeButton[k].childNodes[0].textContent).toLowerCase() == 'close')) {
                        closeButton[k].click();
                    }
                }
            } else if (!submitButtonFound) {
                failedLinks.push(urlList[index]);
                console.log('Failed');
                const closeButton = document.querySelectorAll('.CwaK9 .RveJvd.snByac');
                for (let k = 0; k < closeButton.length; k++) {
                    if ((closeButton[k].childNodes[0] && (closeButton[k].childNodes[0].textContent).toLowerCase() == 'close')) {
                        closeButton[k].click();
                    }
                }
            } else {
                submittedLinks.push(urlList[index]);
                console.log("Submitted");
            }
        }

        // Updated to handle all submitted and failed links
        function downloadResultsFile(submittedLinksAll, failedLinksAll) {
            const submittedLinksFormatted = submittedLinksAll.join('\n');
            const failedLinksFormatted = failedLinksAll.join('\n');
            const txtContent = `Submitted links: \n${submittedLinksFormatted}\n\nFailed links: \n${failedLinksFormatted}`;
            const encodedUri = encodeURI(`data:text/plain;charset=utf-8,${txtContent}`);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'results.txt');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Start processing the first URL
        removeUrlJs(0, urlListTrimmed);
    });
}

// Call the function to start processing
linksResubmission();
 