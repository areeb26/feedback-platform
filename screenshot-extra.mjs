import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';
const OUT_DIR = path.resolve('screenshots');
const BUS_ID = 'bus_6a06f9945932d458d05f7a51';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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

async function expandMoreMenus(page) {
  const moreButtons = page.locator('button:has-text("More")');
  const count = await moreButtons.count();
  for (let i = 0; i < count; i++) {
    await moreButtons.nth(i).click().catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
  const seen = new Set(manifest.map((m) => new URL(m.url).pathname));
  let index = manifest.length + 1;

  const extraItems = ['Metrics', 'Labels', 'Menus', 'Orders', 'Rewards'];

  try {
    await login(page);
    await expandMoreMenus(page);

    for (const label of extraItems) {
      try {
        const item = page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })
          .or(page.getByRole('menuitem', { name: new RegExp(`^${label}$`, 'i') }))
          .or(page.locator(`nav :text-is("${label}"), aside :text-is("${label}")`))
          .first();

        if (!(await item.isVisible({ timeout: 3000 }).catch(() => false))) {
          await expandMoreMenus(page);
        }

        await item.click({ timeout: 8000 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

        const pathname = new URL(page.url()).pathname;
        if (seen.has(pathname)) continue;
        seen.add(pathname);

        const name = `${String(index).padStart(2, '0')}-${slugify(label)}`;
        const file = path.join(OUT_DIR, `${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        manifest.push({ name, url: page.url(), label, file });
        console.log(`Saved: ${name} -> ${page.url()}`);
        index++;

        await expandMoreMenus(page);
      } catch (err) {
        // try direct URL patterns
        const guesses = [
          `/${BUS_ID}/${label.toLowerCase()}`,
          `/${BUS_ID}/platform/${label.toLowerCase()}`,
          `/${BUS_ID}/business/${label.toLowerCase()}`,
        ];
        for (const guess of guesses) {
          try {
            await page.goto(`https://dashboard.harlyy.com${guess}`, { waitUntil: 'networkidle', timeout: 30000 });
            const pathname = new URL(page.url()).pathname;
            if (!pathname.includes(BUS_ID) || seen.has(pathname) || /login|sign-out/i.test(pathname)) continue;
            seen.add(pathname);
            const name = `${String(index).padStart(2, '0')}-${slugify(label)}`;
            const file = path.join(OUT_DIR, `${name}.png`);
            await page.screenshot({ path: file, fullPage: true });
            manifest.push({ name, url: page.url(), label, file });
            console.log(`Saved via URL: ${name} -> ${page.url()}`);
            index++;
            break;
          } catch {
            // continue
          }
        }
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Total screenshots: ${manifest.length}`);
  } finally {
    await browser.close();
  }
}

main();
