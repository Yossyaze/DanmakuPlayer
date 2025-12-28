const TARGET_URL_BASE = "http://localhost:5174/?import=";
const APP_ORIGIN = "http://localhost:5174/";

// Create Context Menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "open-in-danmaku-player",
        title: "DanmakuPlayerで開く",
        contexts: ["link", "page"]
    });
});

// Helper to open URL
async function openInPlayer(url) {
    if (!url || (!url.startsWith("http") && !url.startsWith("https"))) return;

    // 1. Check if App is already open
    const tabs = await chrome.tabs.query({ url: APP_ORIGIN + "*" });

    if (tabs.length > 0) {
        // 2. Reuse existing tab
        const tab = tabs[0];
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });

        // 3. Send message to content script
        chrome.tabs.sendMessage(tab.id, { type: 'IMPORT_URL', url: url });
    } else {
        // 4. Open new tab if none exists
        const target = TARGET_URL_BASE + encodeURIComponent(url);
        chrome.tabs.create({ url: target });
    }
}

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-in-danmaku-player") {
        const targetUrl = info.linkUrl || info.pageUrl;
        openInPlayer(targetUrl);
    }
});

// Toolbar Icon Click Handler
chrome.action.onClicked.addListener((tab) => {
    if (tab.url) {
        openInPlayer(tab.url);
    }
});
