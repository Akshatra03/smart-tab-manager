// urlNormalizer.js
// Cleans a URL so two tabs pointing to the same page
// are correctly identified as duplicates.

const STRIP_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid'
];

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    // Remove tracking parameters
    STRIP_PARAMS.forEach(param => url.searchParams.delete(param));

    // Remove trailing slash from pathname
    url.pathname = url.pathname.replace(/\/$/, '') || '/';

    // Remove fragment — e.g. #section1 doesn't change the page content
    url.hash = '';

    return url.toString().toLowerCase();
  } catch {
    // If URL is somehow invalid, return it lowercased as-is
    return rawUrl.toLowerCase();
  }
}