import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';
const OUT_DIR = path.resolve('screenshots');

async function login(page) {
  await page.goto('https://dashboard.harlyy.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
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
  const seen = new Set(manifest.map((m) => m.url));
  let index = manifest.length + 1;

  const moreButtons = page.locator('button:has-text("More"), [aria-label*="More" i]');
  const count = await moreButtons.count();
  console.log('More buttons:', count);

  for (let i = 0; i < count; i++) {
    await moreButtons.nth(i).click().catch(() => {});
    await page.waitForTimeout(800);
  }

  const items = await page.evaluate(() =>
    [...document.querySelectorAll('nav a, aside a, [role="menuitem"], [role="menu"] a')].map((el) => ({
      text: (el.innerText || '').trim(),
      href: el.getAttribute('href'),
    })).filter((x) => x.text)
  );

  fs.writeFileSync(path.join(OUT_DIR, 'all-nav-after-more.json'), JSON.stringify(items, null, 2));

  for (const item of items) {
    if (!item.text || /sign out|logout|contact support|previous|next|more/i.test(item.text)) continue;
    try {
      const link = page.locator(`nav a:has-text("${item.text}"), aside a:has-text("${item.text}")`).first();
      if (!(await link.count())) continue;
      await link.click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      const url = page.url();
      if (seen.has(url) || !url.includes('bus_')) continue;
      seen.add(url);
      const name = `${String(index).padStart(2, '0')}-${item.text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const file = path.join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      manifest.push({ name, url, label: item.text, file });
      console.log('New:', item.text, url);
      index++;
    } catch {
      // ignore
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Total:', manifest.length);
  await browser.close();
}

main();
