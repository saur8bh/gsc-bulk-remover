const startBtn = document.getElementById("startBtn");
const downloadCheckbox = document.querySelector("#checkbox");
let temporaryRemoval = true;

function updateRemovalType() {
  const removalType = document.getElementsByName("removal-type");
  for (let i = 0; i < removalType.length; i++) {
    if (removalType[i].checked) {
      temporaryRemoval = removalType[i].value === 'temporary';
      break;
    }
  }
}

updateRemovalType();
const removalTypeRadios = document.getElementsByName("removal-type");
removalTypeRadios.forEach(radio => {
  radio.addEventListener('change', updateRemovalType);
});


document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);

startBtn.addEventListener("click", click);


let [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
})

document.getElementById('stopBtn').addEventListener('click', function() {
    chrome.tabs.reload(tab.id);
    alert("The process has been stopped.")
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
  
    const reader = new FileReader();
    reader.onload = function(fileLoadEvent) {
      const text = fileLoadEvent.target.result;
      const links = parseLinksFromText(text);
      document.querySelector("#links").value = links.join('\n');
    };
    reader.readAsText(file);
  }
  
  function parseLinksFromText(text) {
    const lines = text.split(/\r?\n|,/);
  
    const urlRegex = /(https?:\/\/[^\s]+)/;
  
    const urls = lines
      .map(line => line.trim())
      .filter(line => {
        const isUrl = urlRegex.test(line);
        if (!isUrl) {
          console.log('Not recognized as URL:', line);
        }
        return isUrl;
      })
      .map(line => line.match(urlRegex)[0]);
  
    console.log('Recognized URLs:', urls);
    return urls;
  }

  function click() {
    const URLs = document.querySelector("#links").value;
    const downloadCheckboxChecked = downloadCheckbox.checked;
    chrome.storage.sync.set({
        URLs: URLs,
        downloadCheckbox: downloadCheckboxChecked,
        temporaryRemoval: temporaryRemoval
    });

    chrome.scripting.executeScript({
        target: {
            tabId: tab.id
        },
        files: ["linksresubmission.js"]
    }, () => {
        console.log("Executed successfully.");
        linksResubmission(); // Call the linksResubmission function here
    });
}

