const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('https://front-gray-pi.vercel.app/', { waitUntil: 'networkidle0' });
  
  console.log('Clicking New...');
  await page.evaluate(() => {
    const menus = Array.from(document.querySelectorAll('.menu-item'));
    const btn = menus.find(m => m.textContent === 'New');
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 500));

  console.log('Clicking Export...');
  await page.evaluate(() => {
    const menus = Array.from(document.querySelectorAll('.menu-item'));
    const btn = menus.find(m => m.textContent === 'Export');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
