// 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'highlight-selection',
    title: '高亮选中文本',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'remove-all-highlights',
    title: '移除当前页面所有高亮',
    contexts: ['page']
  });
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'highlight-selection') {
    // 向content script发送高亮消息
    chrome.tabs.sendMessage(tab.id, { action: 'highlightSelection' });
  }
  
  if (info.menuItemId === 'remove-all-highlights') {
    chrome.tabs.sendMessage(tab.id, { action: 'removeAllHighlights' });
  }
});

// 监听快捷键（可选）
chrome.commands.onCommand.addListener((command) => {
  if (command === 'highlight-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'highlightSelection' });
    });
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getHighlights') {
    chrome.storage.local.get(['highlights'], (result) => {
      sendResponse(result.highlights || []);
    });
    return true; // 异步响应
  }
  
  if (request.action === 'clearAllHighlights') {
    chrome.storage.local.set({ highlights: [] }, () => {
      // 通知所有标签页移除高亮
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'removeAllHighlights' }).catch(() => {});
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});