import { chromium } from 'file:///C:/Users/Aftid Rahman/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5175/');await page.waitForFunction(()=>document.querySelector('#heroRecordCount').textContent.includes('39,229'));await page.emulateMedia({reducedMotion:'reduce'});
for(const mode of ['journalist','presentation']){
await page.selectOption('#readingMode',mode);await page.waitForTimeout(500);
for(const [width,height] of [[320,568],[360,800],[375,812],[390,844],[430,932],[568,320],[812,375],[768,1024],[1024,768],[1280,720],[1440,1000],[1920,1080],[2560,1080]]){
await page.setViewportSize({width,height});await page.waitForTimeout(80);
const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,bad:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&s.position!=='fixed'&&r.right>innerWidth+2&&s.display!=='none'&&!el.closest('table,.table-scroll,.chart-container');}).slice(0,5).map(el=>el.className||el.tagName)}));
console.log(mode,width,height,JSON.stringify(result));
if(mode==='presentation'&&[320,812,1440].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`responsive-${width}.png`});}
}
}
for(const width of [320,812,1024]){
await page.setViewportSize({width,height:width===812?375:812});
for(const key of ['analysis','records','findings','project']){
await page.locator('#presentation-tab-'+key).click();await page.waitForTimeout(80);
console.log('panel',width,key,await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
}
}
console.log('errors',errors);await browser.close();

