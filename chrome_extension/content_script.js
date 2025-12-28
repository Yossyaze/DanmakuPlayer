// Connect Extension Background <-> Web App
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'IMPORT_URL') {
        console.log("DanmakuPlayer Content Script received:", message.url);
        // Dispatch event to the page window
        window.postMessage({ type: 'DANMAKU_IMPORT', url: message.url }, '*');
    }
});
