const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    const fullPrompt = "Evaluate if this job is for building an open source automation or scraper tool. Say Yes or No. Job: Test Job Title\n\nJob Description: test description\n\nIs this open_source_viable? Reply with ONLY 'Yes' or 'No'.";
    
    const textarea = await page.$('#prompt-textarea');
    if (textarea) {
      const isEditable = await page.evaluate((el) => el.contentEditable === 'true', textarea);
      
      await page.evaluate((sel, text, isContentEditable) => {
        const el = document.querySelector(sel);
        if (el) {
          if (isContentEditable) {
            el.innerHTML = '<p>' + text.replace(/\n/g, '<br>') + '</p>';
          } else {
            el.value = text;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, '#prompt-textarea', fullPrompt, isEditable);
      
      await new Promise(r => setTimeout(r, 1000));
      
      const sendButton = await page.$('button[data-testid="send-button"]');
      if (sendButton) {
        await page.evaluate((btn) => btn.click(), sendButton);
      } else {
        await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
      }
    }
    
    // Wait for response to start rendering
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({path: 'fixed_screenshot.png'});
    
    await browser.close();
    console.log('Screenshot saved to fixed_screenshot.png');
})();
