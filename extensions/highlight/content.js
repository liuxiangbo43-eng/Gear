// 存储所有高亮元素
let highlights = [];

// 可选颜色
const COLORS = [
  { name: '黄色', bg: '#ffeb3b', text: '#000' },
  { name: '绿色', bg: '#a5d6a7', text: '#000' },
  { name: '蓝色', bg: '#90caf9', text: '#000' },
  { name: '粉色', bg: '#f48fb1', text: '#000' },
  { name: '橙色', bg: '#ffcc80', text: '#000' },
  { name: '紫色', bg: '#ce93d8', text: '#000' }
];

// 默认颜色
let currentColor = COLORS[0];

// 从storage加载已保存的高亮和设置
chrome.storage.local.get(['highlights', 'defaultColor'], function(result) {
  if (result.highlights) {
    highlights = result.highlights;
    restoreHighlights();
  }
  if (result.defaultColor) {
    currentColor = COLORS.find(c => c.name === result.defaultColor) || COLORS[0];
  }
});

// 监听鼠标松开事件，获取选中文本
document.addEventListener('mouseup', function() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    showHighlightButton(selection);
  }
});

// 显示高亮按钮（带颜色选择）
function showHighlightButton(selection) {
  const existingBtn = document.getElementById('highlight-btn');
  if (existingBtn) existingBtn.remove();
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const btn = document.createElement('div');
  btn.id = 'highlight-btn';
  btn.innerHTML = '✨ 高亮 <span style="font-size:10px">▼</span>';
  btn.style.cssText = `
    position: absolute;
    left: ${rect.left + window.scrollX}px;
    top: ${rect.top + window.scrollY - 35}px;
    background: #ffd700;
    color: #000;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  // 颜色选择面板
  const colorPanel = document.createElement('div');
  colorPanel.id = 'highlight-color-panel';
  colorPanel.style.cssText = `
    display: none;
    position: absolute;
    top: 28px;
    left: 0;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    width: 120px;
  `;
  
  COLORS.forEach(color => {
    const colorBtn = document.createElement('div');
    colorBtn.style.cssText = `
      width: 24px;
      height: 24px;
      background: ${color.bg};
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid ${color.bg === currentColor.bg ? '#333' : 'transparent'};
    `;
    colorBtn.title = color.name;
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentColor = color;
      highlightSelection(selection, currentColor);
      btn.remove();
    });
    colorPanel.appendChild(colorBtn);
  });
  
  btn.appendChild(colorPanel);
  
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const panel = btn.querySelector('#highlight-color-panel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'flex';
  });
  
  document.body.appendChild(btn);
  
  setTimeout(() => {
    document.addEventListener('click', function removeBtn(e) {
      if (!e.target.closest('#highlight-btn')) {
        const btn = document.getElementById('highlight-btn');
        if (btn) btn.remove();
        document.removeEventListener('click', removeBtn);
      }
    });
  }, 100);
}

// 高亮选中文本
function highlightSelection(selection, color = currentColor) {
  if (!selection || selection.isCollapsed) return;
  
  const range = selection.getRangeAt(0);
  
  // 检查选区是否跨越多个元素
  if (!range.commonAncestorContainer) return;
  
  const span = document.createElement('span');
  span.className = 'custom-highlight';
  span.style.backgroundColor = color.bg;
  span.style.color = color.text;
  span.style.borderRadius = '2px';
  span.style.cursor = 'pointer';
  span.title = '点击移除高亮';
  span.dataset.colorName = color.name;
  
  span.addEventListener('click', function(e) {
    e.stopPropagation();
    removeHighlight(this);
  });
  
  try {
    range.surroundContents(span);
  } catch (e) {
    // 选区跨越多个元素，使用更复杂的方法
    return;
  }
  
  // 保存高亮信息，使用更稳定的定位方式
  const highlightInfo = {
    id: Date.now() + Math.random(),
    text: span.textContent,
    url: window.location.href,
    colorName: color.name,
    // 使用文本路径定位
    textPath: getTextPath(span),
    offset: getOffsetInParent(span)
  };
  
  highlights.push(highlightInfo);
  chrome.storage.local.set({ highlights: highlights });
  
  selection.removeAllRanges();
}

// 获取文本路径（从容器文本中找位置）
function getTextPath(element) {
  const parent = element.parentNode;
  const text = parent.textContent;
  const elementText = element.textContent;
  const index = text.indexOf(elementText);
  return { parentXPath: getXPath(parent), index: index, length: elementText.length };
}

// 获取元素在父元素中的偏移
function getOffsetInParent(element) {
  const parent = element.parentNode;
  let offset = 0;
  for (let i = 0; i < parent.childNodes.length; i++) {
    if (parent.childNodes[i] === element) break;
    if (parent.childNodes[i].nodeType === Node.TEXT_NODE) {
      offset += parent.childNodes[i].textContent.length;
    }
  }
  return offset;
}

// 获取元素的XPath
function getXPath(element) {
  if (element.id) return '//*[@id="' + element.id + '"]';
  if (element === document.body) return '/html/body';
  if (!element.parentNode) return '';
  
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
  return '';
}

// 移除高亮
function removeHighlight(element) {
  const parent = element.parentNode;
  const id = parseFloat(element.dataset.highlightId);
  
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
  
  highlights = highlights.filter(h => h.id !== id);
  chrome.storage.local.set({ highlights: highlights });
}

// 恢复高亮
function restoreHighlights() {
  const currentUrl = window.location.href;
  const pageHighlights = highlights.filter(h => h.url === currentUrl);
  
  pageHighlights.forEach(h => {
    try {
      let element = null;
      
      // 优先使用文本路径恢复
      if (h.textPath) {
        const parent = document.evaluate(
          h.textPath.parentXPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        
        if (parent && parent.childNodes) {
          let textIndex = 0;
          for (let i = 0; i < parent.childNodes.length; i++) {
            if (parent.childNodes[i].nodeType === Node.TEXT_NODE) {
              if (textIndex + parent.childNodes[i].textContent.length > h.textPath.index) {
                // 找到目标文本节点
                const range = document.createRange();
                const startOffset = h.textPath.index - textIndex;
                const endOffset = startOffset + h.textPath.length;
                range.setStart(parent.childNodes[i], startOffset);
                range.setEnd(parent.childNodes[i], endOffset);
                
                const span = document.createElement('span');
                span.className = 'custom-highlight';
                span.dataset.highlightId = h.id;
                span.dataset.colorName = h.colorName || '黄色';
                
                const color = COLORS.find(c => c.name === (h.colorName || '黄色')) || COLORS[0];
                span.style.backgroundColor = color.bg;
                span.style.color = color.text;
                span.style.borderRadius = '2px';
                span.style.cursor = 'pointer';
                span.title = '点击移除高亮';
                
                span.addEventListener('click', function(e) {
                  e.stopPropagation();
                  removeHighlight(this);
                });
                
                try {
                  range.surroundContents(span);
                } catch (e) {
                  console.log('恢复高亮失败:', e);
                }
                break;
              }
              textIndex += parent.childNodes[i].textContent.length;
            }
          }
        }
      }
    } catch (e) {
      console.log('恢复高亮失败:', e);
    }
  });
}

// 监听来自 background/popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'removeAllHighlights') {
    // 移除当前页面所有高亮
    document.querySelectorAll('.custom-highlight').forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });
    
    // 从 storage 中移除当前页面的高亮
    const currentUrl = window.location.href;
    highlights = highlights.filter(h => h.url !== currentUrl);
    chrome.storage.local.set({ highlights: highlights });
    
    sendResponse({ success: true });
  }
  
  if (request.action === 'highlightSelection') {
    // 快捷键触发高亮
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      highlightSelection(selection);
    }
  }
});
