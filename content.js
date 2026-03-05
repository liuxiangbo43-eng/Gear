// 存储所有高亮元素
let highlights = [];

// 从storage加载已保存的高亮
chrome.storage.local.get(['highlights'], function(result) {
  if (result.highlights) {
    highlights = result.highlights;
    restoreHighlights();
  }
});

// 监听鼠标松开事件，获取选中文本
document.addEventListener('mouseup', function() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    // 如果有选中文本，显示一个浮动按钮
    showHighlightButton(selection);
  }
});

// 显示高亮按钮
function showHighlightButton(selection) {
  // 移除已有的按钮
  const existingBtn = document.getElementById('highlight-btn');
  if (existingBtn) existingBtn.remove();
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const btn = document.createElement('div');
  btn.id = 'highlight-btn';
  btn.textContent = '✨ 高亮';
  btn.style.cssText = `
    position: absolute;
    left: ${rect.left + window.scrollX}px;
    top: ${rect.top + window.scrollY - 30}px;
    background: #ffd700;
    color: #000;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  btn.addEventListener('click', function() {
    highlightSelection(selection);
    btn.remove();
  });
  
  document.body.appendChild(btn);
  
  // 点击其他地方时移除按钮
  setTimeout(() => {
    document.addEventListener('click', function removeBtn(e) {
      if (e.target.id !== 'highlight-btn') {
        const btn = document.getElementById('highlight-btn');
        if (btn) btn.remove();
        document.removeEventListener('click', removeBtn);
      }
    });
  }, 100);
}

// 高亮选中文本
function highlightSelection(selection) {
  if (!selection || selection.isCollapsed) return;
  
  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.className = 'custom-highlight';
  span.style.backgroundColor = '#ffeb3b';
  span.style.color = '#000';
  span.style.cursor = 'pointer';
  span.title = '点击移除高亮';
  
  // 添加点击移除功能
  span.addEventListener('click', function(e) {
    e.stopPropagation();
    removeHighlight(this);
  });
  
  // 包裹选中文本
  range.surroundContents(span);
  
  // 保存高亮信息
  const highlightInfo = {
    id: Date.now() + Math.random(),
    text: span.textContent,
    url: window.location.href,
    xpath: getXPath(span)
  };
  
  highlights.push(highlightInfo);
  chrome.storage.local.set({ highlights: highlights });
  
  // 清除选区
  selection.removeAllRanges();
}

// 移除高亮
function removeHighlight(element) {
  const parent = element.parentNode;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
  
  // 从storage中移除
  highlights = highlights.filter(h => h.id !== element.highlightId);
  chrome.storage.local.set({ highlights: highlights });
}

// 获取元素的XPath
function getXPath(element) {
  if (element.id) return '//*[@id="' + element.id + '"]';
  if (element === document.body) return '/html/body';
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// 恢复高亮
function restoreHighlights() {
  const currentUrl = window.location.href;
  const pageHighlights = highlights.filter(h => h.url === currentUrl);
  
  pageHighlights.forEach(h => {
    try {
      const element = document.evaluate(
        h.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      
      if (element && element.nodeType === 3) { // 文本节点
        const span = document.createElement('span');
        span.className = 'custom-highlight';
        span.style.backgroundColor = '#ffeb3b';
        span.style.color = '#000';
        span.style.cursor = 'pointer';
        span.title = '点击移除高亮';
        span.highlightId = h.id;
        
        span.addEventListener('click', function(e) {
          e.stopPropagation();
          removeHighlight(this);
        });
        
        element.parentNode.replaceChild(span, element);
        span.appendChild(element);
      }
    } catch (e) {
      console.log('恢复高亮失败:', e);
    }
  });
}