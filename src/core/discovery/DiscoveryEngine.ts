// ─────────────────────────────────────────────────────────────────
// DiscoveryEngine: Opens a hidden Puppeteer browser, navigates to
// the platform inbox, and captures all GraphQL operations.
// Falls back gracefully if Puppeteer isn't available.
// src/core/discovery/DiscoveryEngine.ts
// ─────────────────────────────────────────────────────────────────

import type { IDiscoveryEngine, DiscoveryResult } from '../interfaces/index';
import type { GraphQLRegistry } from '../registry/GraphQLRegistry';
import { PersistedQueryExtractor } from '../extractor/PersistedQueryExtractor';

const INBOX_URLS: Record<string, string> = {
  airbnb: 'https://www.airbnb.com/hosting/messages',
  gathern: 'https://business.gathern.co/messages',
};

const WAIT_MS = 12000; // Wait 12s for inbox to fully load and fire requests

export class DiscoveryEngine implements IDiscoveryEngine {
  private extractor = new PersistedQueryExtractor();

  constructor(private registry: GraphQLRegistry) {}

  async runDiscovery(platform: string, cookies: string): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      platform,
      operationsFound: 0,
      hashesUpdated: 0,
      newOperations: [],
    };

    const inboxUrl = INBOX_URLS[platform];
    if (!inboxUrl) return result;

    console.log(`\x1b[36m[Discovery] 🔍 Starting discovery for ${platform} at ${inboxUrl}\x1b[0m`);

    await this.registry.logEvent(platform, 'discovery_started',
      `Discovery started for ${platform}`, { url: inboxUrl });

    let puppeteer: any;
    try {
      puppeteer = await import('puppeteer');
    } catch {
      console.warn('[Discovery] ⚠️ Puppeteer not available — discovery skipped');
      return result;
    }

    let browser: any;
    try {
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();

      // Inject cookies
      const cookiePairs = cookies.split(';').map((c: string) => c.trim());
      const cookieObjs = cookiePairs.map((pair: string) => {
        const [name, ...rest] = pair.split('=');
        return { name: name.trim(), value: rest.join('=').trim(), domain: this.domainFor(platform) };
      }).filter((c: any) => c.name && c.value);

      if (cookieObjs.length > 0) await page.setCookie(...cookieObjs);

      // Intercept network requests
      await page.setRequestInterception(true);

      const captured: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

      page.on('request', (req: any) => {
        const url = req.url();
        if (url.includes('/api/v3/') || url.includes('chatapi-prod.gathern')) {
          captured.push({
            url,
            headers: req.headers(),
            body: req.postData() ?? '',
          });
        }
        req.continue();
      });

      await page.goto(inboxUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, WAIT_MS));

      // Process captured requests
      for (const cap of captured) {
        const req = {
          requestId: `discovery-${Date.now()}`,
          url: cap.url,
          method: 'POST',
          requestHeaders: cap.headers,
          requestBody: cap.body,
          timestamp: new Date(),
          platform: platform as 'airbnb' | 'gathern',
        };

        const extracted = this.extractor.extract(req);
        if (!extracted) continue;

        result.operationsFound++;
        const existing = await this.registry.getLatestByName(extracted.platform, extracted.operationName);
        const isNew = !existing;
        const hashChanged = existing && existing.sha256Hash !== extracted.sha256Hash;

        if (isNew || hashChanged) {
          await this.registry.upsertOperation({
            ...extracted,
            isActive: true,
          });
          result.hashesUpdated++;
          if (isNew) result.newOperations.push(extracted.operationName);

          const msg = isNew
            ? `New operation discovered: ${extracted.operationName}`
            : `Hash updated: ${extracted.operationName} → ${extracted.sha256Hash.substring(0, 12)}...`;
          console.log(`\x1b[32m[Discovery] ✅ ${msg}\x1b[0m`);
        }
      }

      await browser.close();

      console.log(`\x1b[36m[Discovery] ✅ Done — ${result.operationsFound} ops found, ${result.hashesUpdated} updated\x1b[0m`);
      await this.registry.logEvent(platform, 'discovery_completed',
        `Discovery complete: ${result.operationsFound} operations, ${result.hashesUpdated} updated`,
        result);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`\x1b[31m[Discovery] ❌ Failed: ${msg}\x1b[0m`);
      if (browser) try { await browser.close(); } catch {}
      await this.registry.logEvent(platform, 'discovery_started',
        `Discovery failed: ${msg}`, { error: msg });
    }

    return result;
  }

  private domainFor(platform: string): string {
    if (platform === 'airbnb') return '.airbnb.com';
    return '.gathern.co';
  }
}
