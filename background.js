// ExtPay - Payment integration
importScripts('ExtPay.js');
const extpay = ExtPay('clipvault');
extpay.startBackground();

// ClipVault - Background Service Worker
const DEFAULTS = {
  maxItems: 200,
  autoClean: 30, // days
  showNotification: false,
  theme: 'dark'
};

// ===== Init =====
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  if (!settings) await chrome.storage.sync.set({ settings: DEFAULTS });

  // Context menu
  chrome.contextMenus.create({
    id: 'save-to-clipvault',
    title: '📋 保存到 ClipVault',
    contexts: ['selection']
  });

  // Init storage
  const { clips } = await chrome.storage.local.get('clips');
  if (!clips) await chrome.storage.local.set({ clips: [] });
});

// ===== Context Menu =====
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'save-to-clipvault' && info.selectionText) {
    await saveClip(info.selectionText.trim(), 'selection');
  }
});

// ===== Message Routing =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'SAVE_CLIP':
      saveClip(request.text, request.source).then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'GET_CLIPS':
      getClips(request.query).then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'DELETE_CLIP':
      deleteClip(request.id).then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'PIN_CLIP':
      pinClip(request.id).then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'CLEAR_ALL':
      clearAll().then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'GET_SETTINGS':
      chrome.storage.sync.get('settings').then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ settings: request.settings }).then(() => sendResponse({ success: true }));
      return true;
    case 'GET_STATS':
      getStats().then(sendResponse);
      return true;
  case 'GET_PAID_STATUS':
    extpay.getUser().then(sendResponse);
    return true;
  case 'OPEN_PAYMENT':
    extpay.openPaymentPage();
    sendResponse({ success: true });
    return false;
  case 'OPEN_LOGIN':
    extpay.openLoginPage();
    sendResponse({ success: true });
    return false;

  }
});

// ===== Core Functions =====
async function saveClip(text, source = 'manual') {
  const { settings } = await chrome.storage.sync.get('settings');
  const maxItems = (settings || DEFAULTS).maxItems || 200;

  const { clips = [] } = await chrome.storage.local.get('clips');

  // Deduplicate: remove identical clip
  const filtered = clips.filter(c => c.text !== text);

  const clip = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    text: text.substring(0, 5000),
    preview: text.substring(0, 150),
    length: text.length,
    source,
    pinned: false,
    createdAt: Date.now()
  };

  const updated = [clip, ...filtered].slice(0, maxItems);
  await chrome.storage.local.set({ clips: updated, lastUpdate: Date.now() });
  return { success: true, clip, total: updated.length };
}

async function getClips(query = '') {
  const { clips = [] } = await chrome.storage.local.get('clips');
  if (!query) {
    return { clips: clips.slice(0, 100) };
  }
  const q = query.toLowerCase();
  const filtered = clips.filter(c =>
    c.text.toLowerCase().includes(q) ||
    c.preview.toLowerCase().includes(q)
  ).slice(0, 50);
  return { clips: filtered, query };
}

async function deleteClip(id) {
  const { clips = [] } = await chrome.storage.local.get('clips');
  await chrome.storage.local.set({ clips: clips.filter(c => c.id !== id) });
  return { success: true };
}

async function pinClip(id) {
  const { clips = [] } = await chrome.storage.local.get('clips');
  const updated = clips.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
  // Move pinned to top
  updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
  await chrome.storage.local.set({ clips: updated });
  return { success: true };
}

async function clearAll() {
  await chrome.storage.local.set({ clips: [] });
  return { success: true };
}

async function getStats() {
  const { clips = [] } = await chrome.storage.local.get('clips');
  return {
    total: clips.length,
    pinned: clips.filter(c => c.pinned).length,
    avgLength: clips.length ? Math.round(clips.reduce((s, c) => s + c.length, 0) / clips.length) : 0
  };
}
