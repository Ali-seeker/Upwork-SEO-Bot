const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
    
    // Wait a bit for page to settle
    await new Promise(r => setTimeout(r, 3000));
    
    const textarea = await page.$('#prompt-textarea');
    if(textarea) {
        await textarea.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.type('test typing');
    }
    
    await page.screenshot({path: 'diagnosis_screenshot.png'});
    await browser.close();
    console.log('Screenshot saved to diagnosis_screenshot.png');
})();
