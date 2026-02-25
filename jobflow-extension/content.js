// =========================================
// JobFlow Extension — Content Script
// =========================================
// This script runs on supported job sites and adds a floating
// "Save to JobFlow" button for quick scraping.

(function () {
  // Avoid double injection
  if (document.getElementById('jobflow-fab')) return;

  // Create floating action button
  const fab = document.createElement('button');
  fab.id = 'jobflow-fab';
  fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
    <span>Save to JobFlow</span>
  `;
  fab.title = 'Scrape this job and save to JobFlow';
  document.body.appendChild(fab);

  // Click handler
  fab.addEventListener('click', () => {
    // Open the extension popup (this just sends data to storage)
    const url = window.location.href;
    let title = '', company = '', location = '', description = '', source = '';

    if (url.includes('linkedin.com')) {
      source = 'LinkedIn';
      title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold, h1')?.textContent?.trim() || '';
      company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a')?.textContent?.trim() || '';
      location = document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() || '';
      const descSelectors = ['.jobs-description__content', '.jobs-description-content', '.jobs-box__html-content', '#job-details', 'div[class*="jobs-description"]'];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) { description = el.innerText.trim(); break; }
      }
      if (!description) {
        const main = document.querySelector('main, [role="main"]');
        if (main) description = main.innerText.trim().substring(0, 15000);
      }
    } else if (url.includes('naukri.com')) {
      source = 'Naukri';
      title = document.querySelector('h1.title, h1[itemprop="title"], .jd-header-title, h1')?.textContent?.trim() || '';
      company = document.querySelector('.jd-header-comp-name a, .company-name')?.textContent?.trim() || '';
      location = document.querySelector('.loc, .location')?.textContent?.trim() || '';
      const descEl = document.querySelector('.job-description, #jobDescriptionText, .detail-desc, [class*="job-desc"]');
      description = descEl?.innerText?.trim() || '';
    } else if (url.includes('indeed.com')) {
      source = 'Indeed';
      title = document.querySelector('.jobsearch-JobInfoHeader-title, h1')?.textContent?.trim() || '';
      company = document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
      location = document.querySelector('[data-testid="inlineHeader-companyLocation"]')?.textContent?.trim() || '';
      description = document.querySelector('#jobDescriptionText')?.innerText?.trim() || '';
    } else if (url.includes('greenhouse.io')) {
      source = 'Greenhouse';
      title = document.querySelector('.app-title, h1')?.textContent?.trim() || '';
      company = document.querySelector('.company-name')?.textContent?.trim() || '';
      location = document.querySelector('.location')?.textContent?.trim() || '';
      description = document.querySelector('#content')?.innerText?.trim() || '';
    } else if (url.includes('lever.co')) {
      source = 'Lever';
      title = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
      location = document.querySelector('.posting-categories .sort-by-time')?.textContent?.trim() || '';
      const sections = document.querySelectorAll('.posting-page .section-wrapper');
      description = Array.from(sections).map(s => s.innerText).join('\n\n').trim();
    } else if (url.includes('myworkdayjobs.com')) {
      source = 'Workday';
      title = document.querySelector('[data-automation-id="jobPostingHeader"], h2')?.textContent?.trim() || '';
      description = document.querySelector('[data-automation-id="jobPostingDescription"]')?.innerText?.trim() || '';
    }

    // Send to background/storage
    chrome.runtime.sendMessage({
      type: 'JOB_SCRAPED',
      data: { title, company, location, description, source, url }
    }, (response) => {
      // Show confirmation
      fab.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>Saved!</span>
      `;
      fab.classList.add('jobflow-fab-success');
      setTimeout(() => {
        fab.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="2" y="3" width="20" height="18" rx="3"/>
            <path d="M8 7h8M8 11h8M8 15h5"/>
          </svg>
          <span>Save to JobFlow</span>
        `;
        fab.classList.remove('jobflow-fab-success');
      }, 2000);
    });
  });
})();
