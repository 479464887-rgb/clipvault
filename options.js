// ClipVault - Options
const DEFAULTS = { maxItems: 200, autoClean: 30, showNotification: false };

document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  const s = settings || DEFAULTS;

  document.getElementById('max-items').value = s.maxItems || 200;
  document.getElementById('auto-clean').value = s.autoClean || 30;

  // Load stats
  const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-pinned').textContent = stats.pinned;
  document.getElementById('stat-avg').textContent = stats.avgLength;

  document.getElementById('save').addEventListener('click', async () => {
    const btn = document.getElementById('save');
    btn.disabled = true;
    btn.textContent = '保存中...';

    const settings = {
      maxItems: parseInt(document.getElementById('max-items').value) || 200,
      autoClean: parseInt(document.getElementById('auto-clean').value) || 30
    };

    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });

    btn.disabled = false;
    btn.textContent = '保存设置';
    const el = document.getElementById('status');
    el.textContent = '✓ 已保存!';
    el.style.display = 'inline';
    setTimeout(() => el.style.display = 'none', 2000);
  });
});
