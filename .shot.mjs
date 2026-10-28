import { chromium } from '/home/user/node_modules/playwright/index.mjs';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.5,colorScheme:'dark'});
const p=await c.newPage();
await p.addInitScript(()=>{try{localStorage.setItem('cm-theme','dark')}catch(e){}});
for (const [u,f] of [['/movies/dune-part-two','v3-movie'],['/','v3-home']]) {
  await p.goto('http://localhost:3000'+u,{waitUntil:'networkidle',timeout:60000});
  await p.addStyleTag({content:'nextjs-portal{display:none!important}'}).catch(()=>{});
  await p.waitForTimeout(1200);
  await p.screenshot({path:`/home/user/cine/shots/${f}.png`});
}
await b.close(); console.log('ok');
