// ClipVault — Background Service Worker
'use strict';

// ExtPay initialization
importScripts('ExtPay.js');
try {
  const extpay = ExtPay('clipvault');
  extpay.startBackground();
} catch(e) {
  console.error('ClipVault: ExtPay init failed', e);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ClipVault installed');
});
