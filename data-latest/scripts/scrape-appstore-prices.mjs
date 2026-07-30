/**
 * Scrape regional App Store subscription prices from appstoreprice.org
 * and write data/regional-prices.json (+ optional plan SKU summary).
 */
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "data", "regional-prices.json");

const APPS = [
  { appStoreId: "6448311069", appKey: "chatgpt", provider: "OpenAI", name: "ChatGPT" },
  { appStoreId: "6473753684", appKey: "claude", provider: "Anthropic", name: "Claude by Anthropic" },
  { appStoreId: "6477489729", appKey: "gemini", provider: "Google", name: "Google Gemini" },
  { appStoreId: "6670324846", appKey: "grok", provider: "xAI", name: "Grok AI" },
  { appStoreId: "1668000334", appKey: "perplexity", provider: "Perplexity", name: "Perplexity" },
  { appStoreId: "6474233312", appKey: "kimi", provider: "Kimi", name: "Kimi" },
];

// Map product name patterns → planId used in plans.json (best-effort)
const PLAN_ID_HINTS = [
  { re: /chatgpt\s*plus/i, planId: "chatgpt_plus" },
  { re: /chatgpt\s*go/i, planId: "chatgpt_go_us" },
  { re: /chatgpt\s*pro\s*5x/i, planId: "chatgpt_pro_5x" },
  { re: /chatgpt\s*pro\s*20x/i, planId: "chatgpt_pro_20x" },
  { re: /claude\s*pro/i, planId: "claude_pro" },
  { re: /claude\s*max\s*5x/i, planId: "claude_max_5x" },
  { re: /claude\s*max\s*20x/i, planId: "claude_max_20x" },
  { re: /google\s*ai\s*plus/i, planId: "google_ai_plus_us" },
  { re: /google\s*ai\s*pro/i, planId: "google_ai_pro_us" },
  { re: /google\s*ai\s*ultra/i, planId: "google_ai_ultra_us" },
  { re: /supergrok\s*heavy/i, planId: "supergrok_heavy" },
  { re: /supergrok\s*lite/i, planId: "supergrok_lite" },
  { re: /supergrok/i, planId: "supergrok" },
  { re: /perplexity\s*pro/i, planId: "perplexity_pro" },
  { re: /perplexity\s*max/i, planId: "perplexity_max" },
  { re: /kimi/i, planId: "kimi_membership" },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

function unescapeNextPayload(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Extract subscription products array from RSC / HTML payload.
 * The site embeds a large escaped JSON blob containing products[].
 */
function extractProducts(html) {
  // Prefer the products array near subscriptionId fields
  const marker = '"products":[';
  let searchFrom = 0;
  const candidates = [];

  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx < 0) break;
    // walk back a bit to see if this is escaped form \\"products\\":[
    const windowStart = Math.max(0, idx - 40);
    const context = html.slice(windowStart, idx + 30);
    candidates.push({ idx, context });
    searchFrom = idx + marker.length;
  }

  // Also search escaped form
  const escapedMarker = '\\"products\\":[';
  searchFrom = 0;
  while (true) {
    const idx = html.indexOf(escapedMarker, searchFrom);
    if (idx < 0) break;
    candidates.push({ idx, context: "escaped", escaped: true });
    searchFrom = idx + escapedMarker.length;
  }

  // Try parse with balanced bracket from each candidate
  for (const c of candidates) {
    const isEscaped = c.escaped || c.context.includes("\\\\");
    const start = c.idx + (isEscaped ? escapedMarker.length - 1 : marker.length - 1); // at '['
    const rawSlice = html.slice(start);
    const extracted = extractBalancedArray(rawSlice);
    if (!extracted) continue;
    let jsonText = extracted;
    if (isEscaped || jsonText.includes('\\"')) {
      jsonText = unescapeNextPayload(jsonText);
    }
    try {
      const products = JSON.parse(jsonText);
      if (Array.isArray(products) && products.length && products[0].prices) {
        return products;
      }
    } catch {
      // try more aggressive unescape
      try {
        const products = JSON.parse(jsonText.replace(/\\\\/g, "\\").replace(/\\"/g, '"'));
        if (Array.isArray(products) && products.length) return products;
      } catch {
        /* continue */
      }
    }
  }

  // Fallback: regex pull of product-like structures from unescaped script push
  const re =
    /\{"id":\d+,"subscriptionId":"[^"]+","productId":"[^"]+","name":"[^"]+".*?"prices":\[.*?\]\}/gs;
  const unescaped = html.includes('\\"products\\"') ? unescapeNextPayload(html) : html;
  const matches = unescaped.match(re);
  if (matches) {
    const products = [];
    for (const m of matches) {
      try {
        products.push(JSON.parse(m));
      } catch {
        /* skip */
      }
    }
    if (products.length) return products;
  }

  return [];
}

function extractBalancedArray(s) {
  if (!s.startsWith("[")) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return s.slice(0, i + 1);
    }
  }
  return null;
}

function guessPlanId(name) {
  for (const h of PLAN_ID_HINTS) {
    if (h.re.test(name)) return h.planId;
  }
  return null;
}

function normalizeProduct(p, app) {
  const name = p.name || p.nameZh || p.productId || "unknown";
  const period = p.period || p.duration || null;
  const prices = (p.prices || []).map((pr) => ({
    region: pr.region,
    regionName: pr.regionName,
    currency: pr.currency,
    price: pr.price,
    priceUsd: pr.priceUsd ?? null,
    priceCny: pr.priceCny ?? null,
    observedAt: pr.observedAt ?? null,
    isFree: !!pr.isFree,
  }));
  // sort by CNY ascending when available
  prices.sort((a, b) => {
    const ac = a.priceCny ?? Number.POSITIVE_INFINITY;
    const bc = b.priceCny ?? Number.POSITIVE_INFINITY;
    return ac - bc;
  });
  return {
    productId: p.productId || p.subscriptionId,
    subscriptionId: p.subscriptionId || null,
    name,
    nameZh: p.nameZh || null,
    type: p.type || null,
    period,
    planIdHint: guessPlanId(name),
    priceCount: prices.length,
    lowest: prices[0]
      ? {
          region: prices[0].region,
          regionName: prices[0].regionName,
          currency: prices[0].currency,
          price: prices[0].price,
          priceCny: prices[0].priceCny,
        }
      : null,
    usPrice: prices.find((x) => x.region === "US") || null,
    jpPrice: prices.find((x) => x.region === "JP") || null,
    prices,
  };
}

async function scrapeApp(app) {
  const url = `https://appstoreprice.org/zh/apps/${app.appStoreId}`;
  console.log("Fetching", url);
  const html = await fetchText(url);
  const products = extractProducts(html);
  console.log(`  -> ${products.length} products for ${app.appKey}`);
  return {
    ...app,
    sourceUrl: url,
    scrapedAt: new Date().toISOString().slice(0, 10),
    products: products.map((p) => normalizeProduct(p, app)),
  };
}

async function main() {
  const apps = [];
  for (const app of APPS) {
    try {
      apps.push(await scrapeApp(app));
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      console.error("Failed", app.appKey, e.message);
      apps.push({ ...app, error: String(e.message || e), products: [] });
    }
  }

  // Build plan-centric view for recommender
  const byPlanId = {};
  for (const app of apps) {
    for (const product of app.products || []) {
      if (!product.planIdHint) continue;
      // Prefer monthly auto-renew products
      const period = (product.period || "").toString().toLowerCase();
      const isMonthly =
        period.includes("month") ||
        period === "p1m" ||
        /1\s*月|monthly/i.test(product.name) ||
        product.name.match(/1月/) ||
        !period.includes("year");
      const key = product.planIdHint;
      const entry = {
        planId: key,
        appKey: app.appKey,
        productId: product.productId,
        productName: product.name,
        period: product.period,
        isMonthly,
        usPrice: product.usPrice,
        jpPrice: product.jpPrice,
        lowest: product.lowest,
        prices: product.prices,
        sourceUrl: app.sourceUrl,
      };
      if (!byPlanId[key]) {
        byPlanId[key] = entry;
      } else {
        // Prefer monthly over annual; prefer more regions
        const cur = byPlanId[key];
        const curMonthly = cur.isMonthly;
        if ((isMonthly && !curMonthly) || (isMonthly === curMonthly && product.prices.length > cur.prices.length)) {
          byPlanId[key] = entry;
        }
      }
    }
  }

  const output = {
    schemaVersion: "0.3.0",
    lastUpdatedAt: new Date().toISOString().slice(0, 10),
    source: "https://appstoreprice.org",
    notes: [
      "Regional App Store IAP prices scraped from appstoreprice.org.",
      "These are Apple billing-region list prices (often higher than web/direct billing due to platform fee).",
      "Use for cross-region comparison and JP/US localization; official web prices remain the primary recommendation baseline in plans.json.",
      "priceCny / priceUsd are values reported by appstoreprice.org at scrape time (their FX conversion).",
    ],
    apps,
    planRegionalPrices: Object.values(byPlanId),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2), "utf8");
  console.log("Wrote", OUT);
  console.log(
    "Plan mappings:",
    output.planRegionalPrices.map((p) => `${p.planId} (${p.prices.length} regions)`).join(", ")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
