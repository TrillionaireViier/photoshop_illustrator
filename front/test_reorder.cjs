const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('https://front-gray-pi.vercel.app/', { waitUntil: 'networkidle0' });
  
  console.log('Adding Rectangle...');
  await page.evaluate(() => {
    const menus = Array.from(document.querySelectorAll('.tool-btn'));
    const btn = menus.find(m => m.title === 'Add Rectangle');
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 500));

  console.log('Adding Circle...');
  await page.evaluate(() => {
    const menus = Array.from(document.querySelectorAll('.tool-btn'));
    const btn = menus.find(m => m.title === 'Add Circle');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 500));

  console.log('Clicking Move Up on the bottom layer...');
  await page.evaluate(() => {
    const layerActions = document.querySelectorAll('.layer-btn[title="Move Up"]');
    if (layerActions && layerActions.length > 1) {
      layerActions[1].click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
