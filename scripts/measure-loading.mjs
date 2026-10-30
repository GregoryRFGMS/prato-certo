import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
const results = [];
for (const width of [390, 1440]) {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    // Exclui variabilidade do serviço externo de fontes em ambas as medições.
    await page.route('**/fonts.googleapis.com/**', (route) => route.abort());
    await page.addInitScript(() => {
      window.loadingMetrics = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.loadingMetrics.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput) window.loadingMetrics.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 100,
      downloadThroughput: 200000,
      uploadThroughput: 100000,
    });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.locator('.hero-visual img').evaluate((img) => img.decode());
    await page.waitForTimeout(300);
    results.push(
      await page.evaluate(
        ({ width, run }) => ({
          width,
          run,
          ...window.loadingMetrics,
          image: document.querySelector('.hero-visual img').currentSrc,
          resources: performance
            .getEntriesByType('resource')
            .filter((e) => e.name.startsWith(location.origin))
            .map((e) => ({
              name: e.name.split('/').pop(),
              bytes: e.encodedBodySize,
              duration: e.duration,
            })),
        }),
        { width, run },
      ),
    );
    await context.close();
  }
}
await browser.close();
await writeFile(process.argv[2], JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.map(({ width, lcp, cls, resources }) => ({
      width,
      lcp,
      cls,
      bytes: resources.reduce((a, r) => a + r.bytes, 0),
    })),
  ),
);
