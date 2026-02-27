/**
 * Runs in the context of the job page (injected via chrome.scripting.executeScript).
 * Must be completely self-contained: no external references (Chrome only serializes this one function).
 */
export function scrapeJobPage(): {
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  error?: string;
} {
  function getText(el: Element | null): string {
    if (!el) return '';
    const h = el as HTMLElement;
    return (h.innerText != null ? h.innerText : (el.textContent || '')).trim();
  }

  const url = window.location.href;
  let title = '',
    company = '',
    location = '',
    description = '',
    source = '';

  try {
    if (url.includes('linkedin.com')) {
      source = 'LinkedIn';
      title =
        document.querySelector(
          '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold, [data-tracking-control-name="public_jobs_topcard-title"]'
        )?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() ||
        '';
      company =
        document.querySelector(
          '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a, [data-tracking-control-name="public_jobs_topcard-org"]'
        )?.textContent?.trim() ||
        '';
      location =
        document.querySelector(
          '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, [data-tracking-control-name="public_jobs_topcard-location"]'
        )?.textContent?.trim() ||
        '';
      const descSelectors = [
        '.jobs-description__content',
        '.jobs-description-content',
        '.jobs-box__html-content',
        '#job-details',
        '[data-job-details]',
        '.jobs-description',
        'section.jobs-description-content__container',
        '.jobs-description-content__container',
        'div[class*="jobs-description"]',
        'article .jobs-box__html-content',
      ];
      for (const sel of descSelectors) {
        const t = getText(document.querySelector(sel));
        if (t) {
          description = t;
          break;
        }
      }
      if (!description) {
        const main = document.querySelector('main, [role="main"], #main');
        if (main) description = getText(main).substring(0, 15000);
      }
    } else if (url.includes('naukri.com')) {
      source = 'Naukri';
      title =
        document.querySelector('h1.title, h1[itemprop="title"], .jd-header-title')?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() ||
        '';
      company =
        document.querySelector('.jd-header-comp-name a, .company-name, [itemprop="hiringOrganization"]')?.textContent?.trim() ||
        '';
      location =
        document.querySelector('.loc, .location, [itemprop="jobLocation"]')?.textContent?.trim() ||
        '';
      const descEl = document.querySelector('.job-description, #jobDescriptionText, .description, [class*="job-desc"]');
      description = getText(descEl) || getText(document.querySelector('.detail-desc')) || '';
    } else if (url.includes('indeed.com')) {
      source = 'Indeed';
      title =
        document.querySelector('.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() ||
        '';
      company =
        document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() ||
        '';
      location =
        document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-InlineCompanyRating-companyHeader + div')?.textContent?.trim() ||
        '';
      const descEl = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
      description = getText(descEl) || '';
    } else if (url.includes('greenhouse.io')) {
      source = 'Greenhouse';
      title = document.querySelector('.app-title, h1.heading')?.textContent?.trim() || '';
      company = document.querySelector('.company-name, span.company-name')?.textContent?.trim() || '';
      location = document.querySelector('.location, .body--metadata')?.textContent?.trim() || '';
      const descEl = document.querySelector('#content, .content');
      description = getText(descEl) || '';
    } else if (url.includes('lever.co')) {
      source = 'Lever';
      title = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
      company = '';
      location =
        document.querySelector('.posting-categories .sort-by-time, .location')?.textContent?.trim() || '';
      const sections = document.querySelectorAll('.posting-page .section-wrapper');
      description = Array.from(sections)
        .map((s) => getText(s))
        .join('\n\n')
        .trim();
    } else if (url.includes('myworkdayjobs.com')) {
      source = 'Workday';
      title =
        document.querySelector('[data-automation-id="jobPostingHeader"], h2')?.textContent?.trim() || '';
      company = document.querySelector('[data-automation-id="company"]')?.textContent?.trim() || '';
      location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim() || '';
      const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');
      description = getText(descEl) || '';
    } else if (url.includes('glassdoor.com')) {
      source = 'Glassdoor';
      title = document.querySelector('[data-test="job-title"], .e1tk4kwz4')?.textContent?.trim() || '';
      company = document.querySelector('[data-test="employer-name"], .e1tk4kwz1')?.textContent?.trim() || '';
      location = document.querySelector('[data-test="location"]')?.textContent?.trim() || '';
      const descEl = document.querySelector('.jobDescriptionContent, [data-test="jobDescriptionContent"]');
      description = getText(descEl) || '';
    } else {
      source = 'Unknown';
      title = document.querySelector('h1')?.textContent?.trim() || document.title;
      description = getText(document.body).substring(0, 5000);
      return {
        title,
        company,
        location,
        description,
        source,
        error: 'Unsupported site. Extracted page text — you may want to clean it up.',
      };
    }

    if (!description) {
      return { title, company, location, description: '', source, error: 'Could not find job description on this page.' };
    }
    return { title, company, location, description, source };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { title: '', company: '', location: '', description: '', source: '', error: 'Scraping failed: ' + err.message };
  }
}
