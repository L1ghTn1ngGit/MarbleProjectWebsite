import {chromium} from 'file:///C:/Users/Aftid Rahman/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5175/');await page.waitForFunction(()=>document.querySelector('#heroRecordCount').textContent.includes('39,229'));await page.selectOption('#readingMode','presentation');await page.waitForTimeout(1200);
for(let i=0;i<4;i++){await page.locator('.budget-story__step').nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(180);console.log('down',i,await page.locator('.budget-story__position').textContent());if(i===1)await page.screenshot({path:'scroll-story-desktop.png'});}
for(let i=3;i>=0;i--){await page.locator('.budget-story__step').nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(120);console.log('up',i,await page.locator('.budget-story__position').textContent());}
await page.locator('#presentation-tab-records').click();await page.locator('#data-table').scrollIntoViewIfNeeded();await page.screenshot({path:'scroll-data-desktop.png'});
await page.selectOption('#readingMode','journalist');for(const id of ['top-stage','overview','spending','offenders','data-table','insights']){await page.locator('#'+id).scrollIntoViewIfNeeded();console.log('journalist',id,await page.locator('#'+id).isVisible());}
await page.locator('#top-stage').scrollIntoViewIfNeeded();await page.screenshot({path:'journalist-top.png'});
await page.setViewportSize({width:812,height:375});console.log('landscape overflow',await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
await page.selectOption('#readingMode','presentation');await page.locator('.budget-story__step').nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:'story-landscape.png'});
console.log('errors',errors);await browser.close();
