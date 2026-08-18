const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // We can run this headlessly to just dump the DOM
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: 'C:\\Users\\kcv\\AppData\\Roaming\\ai-automation-dashboard\\puppeteer_profile'
  });
  
  const page = await browser.newPage();
  await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 5000));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  require('fs').writeFileSync('chatgpt-dom-dump.html', html);
  
  await browser.close();
  console.log('Dumped to chatgpt-dom-dump.html');
})();
