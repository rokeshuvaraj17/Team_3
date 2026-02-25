// =========================================
// JobFlow Extension — Background Service Worker
// =========================================

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_SCRAPED') {
    // Store the scraped job data so popup can access it
    chrome.storage.local.set({
      jobDescription: message.data.description || '',
      jobMeta: {
        title: message.data.title || '',
        company: message.data.company || '',
        location: message.data.location || '',
        source: message.data.source || '',
      }
    });
    sendResponse({ success: true });
  }
  return true;
});

// Optional: Set up context menu for right-click scraping
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobFlow extension installed.');
});
