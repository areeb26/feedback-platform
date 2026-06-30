import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';
const OUT_DIR = path.resolve('screenshots');

async function login(page) {
  await page.goto('https://dashboard.harlyy.com', { waitUntil: 'networkidle' });
  const email = page.getByPlaceholder(/enter your email/i);
  if (await email.isVisible({ timeout: 8000 }).catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByPlaceholder(/enter your password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^login$/i }).click();
    await page.waitForURL(/bus_/, { timeout: 90000 });
    await page.waitForTimeout(3000);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await login(page);

  const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
  const seen = new Set(manifest.map((m) => new URL(m.url).pathname));
  let index = manifest.length + 1;

  for (const btn of await page.locator('button:has-text("More")').all()) {
    await btn.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'debug-sidebar-expanded.png'), fullPage: true });

  for (const label of ['Metrics', 'Labels', 'Menus', 'Orders', 'Rewards']) {
    const locator = page.locator(`aside >> text="${label}"`).first();
    const visible = await locator.isVisible().catch(() => false);
    console.log(label, 'visible:', visible);
    if (!visible) continue;

    const before = page.url();
    await locator.click({ force: true });
    await page.waitForTimeout(4000);

    const after = page.url();
    const pathname = new URL(after).pathname;
    console.log(label, 'navigated:', before, '->', after);

    if (after !== before && !seen.has(pathname)) {
      seen.add(pathname);
      const name = `${String(index).padStart(2, '0')}-${label.toLowerCase()}`;
      const file = path.join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      manifest.push({ name, url: after, label, file });
      console.log('Saved', name);
      index++;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
}

main();
