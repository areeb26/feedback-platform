import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://dashboard.harlyy.com';
const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';
const OUT_DIR = path.resolve('screenshots');

fs.mkdirSync(OUT_DIR, { recursive: true });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'page';
}

function isLoggedIn(url) {
  return /dashboard\.harlyy\.com\/(bus_|dashboard|home|settings|profile|team|billing|analytics|feedback|reviews|campaigns|messages|inbox)/i.test(url)
    || (/dashboard\.harlyy\.com\//.test(url) && !/login|sign-out|signin|phone|password-reset|policy/i.test(url));
}

async function waitForDashboard(page, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (isLoggedIn(url)) {
      await page.waitForTimeout(3000);
      return true;
    }
    await page.waitForTimeout(1000);
  }
  return false;
}

async function screenshotPage(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Saved: ${file} -> ${page.url()}`);
  return file;
}

async function performLogin(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);

  // Harlyy login form on dashboard or accounts subdomain
  const email = page.getByPlaceholder(/enter your email/i);
  if (await email.isVisible({ timeout: 8000 }).catch(() => false)) {
    await email.click();
    await email.fill('');
    await email.type(EMAIL, { delay: 30 });
    const password = page.getByPlaceholder(/enter your password/i);
    await password.click();
    await password.fill('');
    await password.type(PASSWORD, { delay: 30 });

    await Promise.all([
      page.waitForNavigation({ timeout: 90000 }).catch(() => null),
      page.getByRole('button', { name: /^login$/i }).click(),
    ]);
  } else {
    const genericEmail = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
    await genericEmail.waitFor({ state: 'visible', timeout: 15000 });
    await genericEmail.fill(EMAIL);
    const genericPass = page.locator('input[type="password"]').first();
    await genericPass.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ timeout: 90000 }).catch(() => null),
      page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click(),
    ]);
  }

  const ok = await waitForDashboard(page);
  if (!ok) {
    const body = await page.locator('body').innerText().catch(() => '');
    fs.writeFileSync(path.join(OUT_DIR, 'login-failure.txt'), `URL: ${page.url()}\n\n${body}`);
    throw new Error(`Login failed. Current URL: ${page.url()}`);
  }
}

async function collectClickableNav(page) {
  return page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const selectors = [
      'nav a',
      'aside a',
      '[role="navigation"] a',
      '[role="menuitem"]',
      'header a',
      'a[href^="/"]',
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
        const href = el.getAttribute('href') || '';
        if (!text && !href) return;
        if (/sign out|logout|privacy|terms|google|phone|reset|password/i.test(`${text} ${href}`)) return;
        const key = `${text}::${href}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ text, href });
      });
    }
    return out;
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const manifest = [];
  const capturedUrls = new Set();

  try {
    await performLogin(page);
    await screenshotPage(page, '01-dashboard-home');
    manifest.push({ name: '01-dashboard-home', url: page.url(), file: path.join(OUT_DIR, '01-dashboard-home.png') });
    capturedUrls.add(page.url());

    const navItems = await collectClickableNav(page);
    fs.writeFileSync(path.join(OUT_DIR, 'nav-items.json'), JSON.stringify(navItems, null, 2));

    let index = 2;

    // Visit href-based routes first
    for (const item of navItems) {
      if (!item.href || !item.href.startsWith('/') || item.href.startsWith('/_next')) continue;
      const url = `${BASE_URL}${item.href.split('?')[0]}`;
      if (capturedUrls.has(url)) continue;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        if (!isLoggedIn(page.url())) continue;
        const name = `${String(index).padStart(2, '0')}-${slugify(item.text || item.href)}`;
        const file = await screenshotPage(page, name);
        manifest.push({ name, url: page.url(), label: item.text, file });
        capturedUrls.add(page.url());
        index++;
      } catch (err) {
        console.error(`Route failed ${url}:`, err.message);
      }
    }

    // Click each sidebar/nav item in the live app
    const navLocator = page.locator('nav a, aside a, [role="navigation"] a, [role="menuitem"]');
    const count = await navLocator.count();
    for (let i = 0; i < count; i++) {
      const el = navLocator.nth(i);
      const text = ((await el.innerText().catch(() => '')) || '').trim();
      if (!text || /sign out|logout|privacy|terms|google|phone|reset/i.test(text)) continue;

      try {
        const before = page.url();
        await el.click({ timeout: 8000 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        const after = page.url();
        if (!isLoggedIn(after) || capturedUrls.has(after)) continue;

        const name = `${String(index).padStart(2, '0')}-nav-${slugify(text)}`;
        const file = await screenshotPage(page, name);
        manifest.push({ name, url: after, label: text, file });
        capturedUrls.add(after);
        index++;
      } catch (err) {
        console.error(`Nav click failed (${text}):`, err.message);
        await page.goto(manifest[0].url, { waitUntil: 'networkidle' }).catch(() => {});
      }
    }

    // Dump page text for reference
    const bodyText = await page.locator('body').innerText().catch(() => '');
    fs.writeFileSync(path.join(OUT_DIR, 'dashboard-text.txt'), bodyText);

    fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Done. ${manifest.length} screenshots saved.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
