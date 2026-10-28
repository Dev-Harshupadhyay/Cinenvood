import { chromium } from '/home/user/node_modules/playwright/index.mjs';
const B='http://localhost:3000', O='/home/user/cine/shots';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1.5,colorScheme:'dark'});
const p=await c.newPage();
await p.addInitScript(()=>{try{localStorage.setItem('cm-theme','dark')}catch(e){}});
await p.goto(B+'/movies/dune-part-two',{waitUntil:'networkidle'});
await p.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{});
await p.waitForTimeout(1000);
const el=await p.locator('.admin-verdict').first();
await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await el.screenshot({path:O+'/v2-verdict-card.png'});
await p.screenshot({path:O+'/v2-movie.png', fullPage:true});
await p.goto(B+'/',{waitUntil:'networkidle'});
await p.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{});
await p.waitForTimeout(900);
const el2=await p.locator('.admin-verdict').first();
if (await el2.count()) { await el2.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await el2.screenshot({path:O+'/v2-home-verdict-card.png'}); }
await b.close(); console.log('ok');
