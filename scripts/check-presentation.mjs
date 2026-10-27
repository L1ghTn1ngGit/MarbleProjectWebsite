import { chromium } from 'file:///C:/Users/Aftid Rahman/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:5175/');
await page.waitForFunction(() => document.querySelector('#heroRecordCount').textContent.includes('39,229'));
console.log('journalist', await page.evaluate(() => ({ mode: document.body.dataset.readingMode, canvas: !!document.querySelector('.budget-story canvas'), overflow: document.documentElement.scrollWidth > innerWidth })));
await page.selectOption('#readingMode', 'presentation');
await page.waitForTimeout(7000);
await page.screenshot({ path: 'presentation-desktop.png' });
console.log('presentation', await page.evaluate(() => ({ mode: document.body.dataset.readingMode, canvas: !!document.querySelector('.budget-story canvas'), fallback: !!document.querySelector('.budget-story--fallback'), overflow: document.documentElement.scrollWidth > innerWidth, title: document.querySelector('h1').textContent })));
await page.locator('#presentation-tab-records').click();
if (!await page.locator('#data-table').isVisible()) throw new Error('Presentation data panel unavailable');
await page.locator('#presentation-tab-findings').click();
if (!await page.locator('#insights').isVisible()) throw new Error('Presentation findings unavailable');
await page.locator('#presentation-tab-project').click();
if (!await page.locator('#top-stage').isVisible()) throw new Error('Presentation project panel unavailable');
await page.locator('#presentation-tab-analysis').click();
await page.locator('.budget-story__step').nth(1).scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'presentation-overview.png' });
await page.locator('.budget-story__controls button').click();
const frozen = await page.locator('.budget-story__position').textContent();
await page.locator('.budget-story__step').nth(3).scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
if (frozen !== await page.locator('.budget-story__position').textContent()) throw new Error('Pause failed');
await page.locator('.budget-story__controls button').click();
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.waitForTimeout(400);
await page.setViewportSize({width:375,height:812});
await page.evaluate(() => window.scrollTo(0,0));
await page.waitForTimeout(1200);
await page.screenshot({ path: 'presentation-mobile.png' });
console.log('mobile', await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth })));
await page.selectOption('#readingMode', 'journalist');
if (!await page.locator('#main #data-table').isVisible()) throw new Error('Journalist content did not restore');
console.log('restored', await page.evaluate(() => ({ canvas: !!document.querySelector('.budget-story'), title: document.querySelector('h1').textContent })));
console.log('errors', errors);
await browser.close();





