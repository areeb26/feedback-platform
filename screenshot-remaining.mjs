import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://dashboard.harlyy.com';
const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';
const OUT_DIR = path.resolve('screenshots');
const BUS_ID = 'bus_6a06f9945932d458d05f7a51';

fs.mkdirSync(OUT_DIR, { recursive: true });

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'page';
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 90000 });
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

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Saved: ${file}`);
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
  let index = manifest.length + 1;

  try {
    await login(page);

    const extraRoutes = [
      { label: 'Listings', path: `/${BUS_ID}/listings` },
      { label: 'Settings', path: `/${BUS_ID}/settings` },
    ];

    for (const route of extraRoutes) {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 60000 });
      const name = `${String(index).padStart(2, '0')}-${slugify(route.label)}`;
      const file = await screenshot(page, name);
      manifest.push({ name, url: page.url(), label: route.label, file });
      index++;
    }

    // Expand "More" menus
    const moreButtons = page.getByRole('button', { name: /^more$/i });
    const moreCount = await moreButtons.count();
    for (let i = 0; i < moreCount; i++) {
      await moreButtons.nth(i).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    const allLinks = await page.locator('nav a, aside a, [role="menu"] a, [role="menuitem"]').all();
    const seen = new Set(manifest.map((m) => m.url));

    for (const link of allLinks) {
      const text = ((await link.innerText().catch(() => '')) || '').trim();
      if (!text || /sign out|logout|contact support|previous|next/i.test(text)) continue;
      try {
        await link.click({ timeout: 5000 });
        await page.waitForTimeout(2500);
        const url = page.url();
        if (!url.includes(BUS_ID) || seen.has(url)) continue;
        seen.add(url);
        const name = `${String(index).padStart(2, '0')}-${slugify(text)}`;
        const file = await screenshot(page, name);
        manifest.push({ name, url, label: text, file });
        index++;
      } catch {
        // ignore
      }
    }

    // Settings button in header
    const settingsBtn = page.getByRole('button', { name: /settings/i }).first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(2500);
      const url = page.url();
      if (!seen.has(url)) {
        const name = `${String(index).padStart(2, '0')}-settings-header`;
        const file = await screenshot(page, name);
        manifest.push({ name, url, label: 'Settings (header)', file });
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Total screenshots: ${manifest.length}`);
  } finally {
    await browser.close();
  }
}

main();
