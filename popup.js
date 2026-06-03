// ClipVault - Popup
const list = document.getElementById('clip-list');
const search = document.getElementById('search');
const stats = document.getElementById('stats');

let clips = [];
let searchTimer = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadClips();
  await updateStats();

  // Search
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadClips, 200);
  });

  // Paste & Save button
  document.getElementById('btn-paste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        await chrome.runtime.sendMessage({ type: 'SAVE_CLIP', text: text.trim(), source: 'clipboard' });
        await loadClips();
        showTooltip('btn-paste', '已保存!');
      }
    } catch (e) {
      showTooltip('btn-paste', '无法读取剪贴板');
    }
  });

  // Manual Add button
  document.getElementById('btn-add').addEventListener('click', () => {
    const text = prompt('输入要保存的内容：');
    if (text?.trim()) {
      chrome.runtime.sendMessage({ type: 'SAVE_CLIP', text: text.trim(), source: 'manual' }).then(async () => {
        await loadClips();
      });
    }
  });

  // Clear all
  document.getElementById('btn-clear').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('确认删除所有剪贴记录？此操作不可恢复。')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_ALL' });
      await loadClips();
    }
  });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Keyboard: Escape to clear search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.value = '';
      loadClips();
    }
  });
});

// ===== Load & Render =====
async function loadClips() {
  const query = search.value.trim();
  const resp = await chrome.runtime.sendMessage({ type: 'GET_CLIPS', query });
  clips = resp.clips || [];
  render();
}

function render() {
  if (!clips.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="emoji">📋</div>
        <p>暂无剪贴记录</p>
        <p style="font-size:11px;color:#484f58;margin-top:4px">选中文字右键保存，或点击"粘贴保存"</p>
      </div>`;
    return;
  }

  list.innerHTML = clips.map(c => {
    const time = formatTime(c.createdAt);
    const pinned = c.pinned ? ' active' : '';
    const pinIcon = c.pinned ? '📌' : '📌';
    return `
      <div class="clip${c.pinned ? ' pinned' : ''}" data-id="${c.id}">
        <div class="clip-header">
          <div class="clip-meta">
            <span>${c.source === 'selection' ? '✂️' : c.source === 'clipboard' ? '📋' : '✏️'}</span>
            <span>${time}</span>
            <span>${c.length}字</span>
          </div>
          <div style="display:flex;gap:8px">
            <span class="clip-pin${pinned}" data-action="pin" data-id="${c.id}">${pinIcon}</span>
            <span style="cursor:pointer;color:#8b949e;font-size:12px" data-action="delete" data-id="${c.id}">✕</span>
          </div>
        </div>
        <div class="clip-text">${escapeHtml(c.preview)}${c.text.length > 150 ? '...' : ''}</div>
      </div>`;
  }).join('');

  // Click handlers
  list.querySelectorAll('.clip').forEach(el => {
    const id = el.dataset.id;
    el.addEventListener('click', async (e) => {
      // Don't copy if clicking action buttons
      if (e.target.dataset.action) return;
      const clip = clips.find(c => c.id === id);
      if (clip) {
        await navigator.clipboard.writeText(clip.text);
        showTooltip(el, '已复制!');
      }
    });
  });

  // Pin handler
  list.querySelectorAll('[data-action="pin"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      await chrome.runtime.sendMessage({ type: 'PIN_CLIP', id });
      await loadClips();
    });
  });

  // Delete handler
  list.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      await chrome.runtime.sendMessage({ type: 'DELETE_CLIP', id });
      await loadClips();
    });
  });
}

async function updateStats() {
  const resp = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  stats.textContent = `${resp.total} 条记录 · ${resp.pinned} 条置顶`;
}

// ===== Helpers =====
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showTooltip(el, msg) {
  const target = typeof el === 'string' ? document.getElementById(el) : el;
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.textContent = msg;
  tip.style.cssText = `
    position:absolute;top:-28px;right:0;
    background:#238636;color:#fff;padding:2px 8px;
    border-radius:4px;font-size:11px;pointer-events:none;
    animation:fadeOut 1.5s ease forwards;
    z-index:999;
  `;
  target.style.position = target.style.position || 'relative';
  target.appendChild(tip);
  setTimeout(() => tip.remove(), 1500);
}
