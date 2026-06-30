import { chromium } from 'playwright';
import fs from 'fs';

const EMAIL = 'hafiz.memongoth@gmail.com';
const PASSWORD = 'memon1122';

async function login(page) {
  await page.goto('https://dashboard.harlyy.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const email = page.getByPlaceholder(/enter your email/i);
  if (await email.isVisible().catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByPlaceholder(/enter your password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^login$/i }).click();
    await page.waitForTimeout(8000);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await login(page);
  console.log('URL:', page.url());

  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href], button, [role="button"], [role="menuitem"], nav *, aside *')].map((el) => ({
      tag: el.tagName,
      text: (el.innerText || '').trim().slice(0, 80),
      href: el.getAttribute('href'),
      role: el.getAttribute('role'),
      className: (el.className || '').toString().slice(0, 100),
    })).filter((x) => x.text || x.href);

    return {
      title: document.title,
      url: location.href,
      links: links.slice(0, 200),
      allText: document.body.innerText.slice(0, 3000),
    };
  });

  fs.writeFileSync('screenshots/page-structure.json', JSON.stringify(info, null, 2));
  console.log('Saved page-structure.json');
  await browser.close();
}

main();
