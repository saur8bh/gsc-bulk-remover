async function linksResubmission() {
    try {
        const { URLs, downloadCheckbox, temporaryRemoval } = await new Promise((resolve, reject) => {
            chrome.storage.sync.get(["URLs", "downloadCheckbox", "temporaryRemoval"], (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(data);
                }
            });
        });

        if (!URLs || !URLs.includes("http")) {
            alert("Please, insert at least one link.");
            return;
        }

        const urls = URLs.split("\n");
        const urlListTrimmed = urls.map(element => element.trim()).filter(element => element.length > 2);
        const submittedLinks = [];
        const failedLinks = [];

        async function removeUrlJs(index, urlList, nextButton = false, submitButtonFound = false) {
            if (index < urlList.length) {
                await clickNextButton(nextButton, temporaryRemoval);
                setTimeout(async() => {
                    await urlToSubmissionBar(urlList, index, temporaryRemoval);
                    setTimeout(async() => {
                        await submissionNextButton();
                        setTimeout(async() => {
                            submitButtonFound = await submitRequest(submitButtonFound);
                            setTimeout(async() => {
                                await checkOutcome(urlList, index, submitButtonFound);
                                setTimeout(async() => {
                                    await removeUrlJs(index + 1, urlList, nextButton = false);
                                }, 1500);
                            }, 2000)
                        }, 500);
                    }, 500);

                }, 1500)
            } else {
                alert(`Total submitted: ${submittedLinks.length}\nTotal failed: ${failedLinks.length}`);
                if (downloadCheckbox) {
                    await downloadResults();
                }
            }
        }

        async function clickNextButton(nextButton, temporaryRemoval) {
            console.log("next button");
            console.log(temporaryRemoval);
            if (!nextButton) {
                document.querySelector('.RveJvd.snByac').click();
                if (!temporaryRemoval) {
                    setTimeout(async () => {
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

        async function urlToSubmissionBar(urlList, index, temporaryRemoval) {
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

        async function submissionNextButton() {
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

        async function submitRequest(submitButtonFound) {
            let closeButtonFound = false;
            const submitButton = document.querySelectorAll('.CwaK9 .RveJvd.snByac');

            for (let k = 0; k < submitButton.length; k++) {
                console.log(submitButton)
                console.log(k, closeButtonFound)
                if (submitButton[k].textContent.toLowerCase() == 'submit request') {
                    submitButton[k].click();
                    console.log("breaking out")
                    return true;
                } else {
                    closeButtonFound = submitButton[k].textContent.toLowerCase() == 'close' ? true : false;
                    if (closeButtonFound) {
                        break;
                    }
                }
            }
        }

        async function checkOutcome(urlList, index, submitButtonFound) {
            if (document.querySelectorAll('.PNenzf').length > 0) {
                failedLinks.push(urlList[index]);
                console.log(`Failed, ${urlList[index]} already exists as a submitted request, duplicates are not permitted.`)
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

        async function downloadResults() {
            const submittedLinksFormatted = submittedLinks.join('\n');
            const failedLinksFormatted = failedLinks.join('\n');
            const txtContent = `Submitted links: \n${submittedLinksFormatted}\n\nFailed links: \n${failedLinksFormatted}`
            const encodedUri = encodeURI(`data:text/plain;charset=utf-8,${txtContent}`);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'results.txt');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        async function reload() {
            location.reload();
        }

        await removeUrlJs(0, urlListTrimmed);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

linksResubmission();
 