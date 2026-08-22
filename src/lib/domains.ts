import type { SiteCategory } from "./types";

const RULES: { category: SiteCategory; patterns: RegExp[] }[] = [
  {
    category: "Learning",
    patterns: [
      /(wikipedia|stackoverflow|coursera|udemy|khanacademy|duolingo|medium|substack|goodreads|notion|readwise)\.[a-z.]+$/,
      /\.(edu|ac\.)\w+$/,
    ],
  },
  {
    category: "Social",
    patterns: [
      /(twitter|t\.co|instagram|facebook|reddit|discord|whatsapp|tiktok|snapchat|linkedin|twitch|telegram)\.[a-z.]+$/,
      /^x\.com$/,
    ],
  },
  {
    category: "Entertainment",
    patterns: [
      /(youtube|netflix|hulu|disneyplus|spotify|hbomax|primevideo|crunchyroll|pinterest|imdb|roblox|steampowered)\.[a-z.]+$/,
    ],
  },
  {
    category: "News",
    patterns: [
      /(cnn|bbc|nytimes|wsj|theguardian|reuters|foxnews|washingtonpost|theverge|techcrunch|arstechnica|engadget)\.[a-z.]+$/,
    ],
  },
  {
    category: "Shopping",
    patterns: [
      /^(amazon|ebay|etsy|walmart|target|bestbuy|shopify|aliexpress|shein)\.[a-z.]+$/,
    ],
  },
];

const WORK_KEYWORDS =
  /(mail|docs|drive|github|gitlab|notion|slack|zoom|meet|jira|asana|linear|calendar|outlook|teams|vercel|figma|firebase|aws)/i;

/** guess whether a host is work/productivity related */
export function classifyDomain(host: string): SiteCategory {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(h))) return rule.category;
  }
  if (h.split(".").length > 2 && WORK_KEYWORDS.test(h)) return "Work";
  if (h.includes("google.") || h.includes("apple.") || h.includes("microsoft.")) return "Work";
  return "Other";
}

export function hostOf(urlOrHost: string): string {
  try {
    const u = new URL(urlOrHost.includes("://") ? urlOrHost : `https://${urlOrHost}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return urlOrHost.replace(/^www\./, "");
  }
}

export function faviconUrl(host: string, size = 64): string {
  const d = host.replace(/^www\./, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}`;
}