// Looks at a tab's title and URL and returns a human-readable label.
// Rule-based now — easy to swap for AI later.

const RULES = [
  {
    context: "Development work",
    test: ({ url, title }) =>
      /github|stackoverflow|localhost|vercel|netlify|codepen|replit/i.test(url) ||
      /code|debug|deploy|api|error|pull request/i.test(title)
  },
  {
    context: "Study / learning",
    test: ({ url, title }) =>
      /wikipedia|coursera|udemy|khanacademy|medium|docs\./i.test(url) ||
      /tutorial|guide|how to|learn|course|explained/i.test(title)
  },
  {
    context: "Shopping",
    test: ({ url, title }) =>
      /amazon|flipkart|myntra|ebay|shopify|cart|checkout/i.test(url) ||
      /buy|price|deal|discount|order/i.test(title)
  },
  {
    context: "News / reading",
    test: ({ url, title }) =>
      /news|bbc|cnn|reddit|hackernews|times|hindu|ndtv/i.test(url) ||
      /breaking|latest|report|opinion/i.test(title)
  },
  {
    context: "Social media",
    test: ({ url }) =>
      /twitter|x\.com|facebook|instagram|linkedin|threads/i.test(url)
  },
  {
    context: "Entertainment",
    test: ({ url, title }) =>
      /youtube|netflix|hotstar|spotify|twitch|prime/i.test(url) ||
      /watch|episode|season|movie|music/i.test(title)
  },
  {
    context: "Email / communication",
    test: ({ url }) =>
      /mail\.google|outlook|yahoo.*mail|slack|discord|teams/i.test(url)
  }
];

export function getContext({ title, url, domain }) {
  for (const rule of RULES) {
    if (rule.test({ title, url, domain })) {
      return rule.context;
    }
  }
  return "Uncategorized";
}