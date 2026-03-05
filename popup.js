// 获取当前标签页
async function getCurrentTab() {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// 更新统计信息
async function updateStats() {
  const tab = await getCurrentTab();
  
  // 从storage获取所有高亮
  chrome.storage.local.get(['highlights'], (result) => {
    const highlights = result.highlights || [];
    const currentUrlHighlights = highlights.filter(h => h.url === tab.url);
    
    document.getElementById('stats').innerHTML = `
      当前页面高亮：${currentUrlHighlights.length} 个<br>
      总计高亮：${highlights.length} 个
    `;
  });
}

// 清除当前页面高亮
document.getElementById('clearCurrent').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  
  chrome.tabs.sendMessage(tab.id, { action: 'removeAllHighlights' }, (response) => {
    if (chrome.runtime.lastError) {
      // 页面可能还没加载content script
      console.log('请刷新页面后再试');
      alert('请刷新页面后再试');
    } else {
      updateStats();
    }
  });
});

// 清除所有页面高亮
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('确定要清除所有页面的高亮吗？此操作不可恢复。')) {
    chrome.runtime.sendMessage({ action: 'clearAllHighlights' }, (response) => {
      if (response && response.success) {
        updateStats();
      }
    });
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', updateStats);