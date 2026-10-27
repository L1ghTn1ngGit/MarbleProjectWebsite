import { chromium } from 'file:///C:/Users/Aftid Rahman/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
for(const [name,url] of [['github','https://github.com/'],['aceternity','https://ui.aceternity.com/components/sticky-scroll-reveal'],['reactbits','https://reactbits.dev/text-animations/scroll-reveal']]){
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(1800);await page.screenshot({path:`reference-${name}.png`});console.log(name,await page.title());}catch(e){console.log(name,e.message);}
}
await browser.close();
