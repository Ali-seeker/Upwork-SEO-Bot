import re

with open("src/services/chatgptScraper.js", "r", encoding="utf-8") as f:
    content = f.read()

new_code = """
export class UpworkEvaluator {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async startSession(onProgress) {
    onProgress?.('Launching browser...');
    const userDataPath = path.join(app.getPath('userData'), 'puppeteer_profile');
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
      userDataDir: userDataPath
    });

    this.page = await this.browser.newPage();
    
    // Check cookies
    const cookiesPath = path.join(app.getPath('userData'), 'cookies.json');
    if (fs.existsSync(cookiesPath)) {
      try {
        const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        await this.page.setCookie(...cookies);
      } catch (err) {
        console.error('Error loading cookies:', err);
      }
    }

    onProgress?.('Navigating to ChatGPT...');
    await this.page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Try to find "Upwork Evaluation" project or chat
    const projectName = 'Upwork Evaluation';
    try {
        const projectsTabClicked = await this.page.evaluate(() => {
          const projectsTab = Array.from(document.querySelectorAll('button, a')).find(el => 
            el.innerText?.toLowerCase().includes('projects') || 
            el.textContent?.toLowerCase().includes('projects')
          );
          if (projectsTab) {
            projectsTab.click();
            return true;
          }
          return false;
        });
        
        if (projectsTabClicked) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const projectFoundAfterTab = await this.page.evaluate((projName) => {
            const elements = Array.from(document.querySelectorAll('a, button, div[role="button"]'));
            const projectElement = elements.find(el => {
              const text = (el.innerText || el.textContent || '').trim();
              return text.toLowerCase() === projName.toLowerCase();
            });
            
            if (projectElement) {
              projectElement.click();
              return true;
            }
            return false;
          }, projectName);
          
          if (!projectFoundAfterTab) {
            console.log('Project not found, continuing with a new/current chat');
          }
        }
    } catch(e) {
        console.log('Failed to navigate to project', e);
    }
  }

  async evaluateJob(job, onProgress) {
    if (!this.page) return "No";
    
    onProgress?.('Preparing prompt...');
    
    // Load prompt
    let promptBase = '';
    try {
      const promptPath = path.join(app.getAppPath(), 'prompts', 'upwork-saas-filter.txt');
      promptBase = fs.readFileSync(promptPath, 'utf8');
    } catch (err) {
       console.error("Could not load prompt", err);
       promptBase = "Evaluate if this job is for building an open source automation or scraper tool. Say Yes or No. Job: ";
    }

    const fullPrompt = `${promptBase}\\n\\nJob Title: ${job.title}\\n\\nJob Description: ${job.description}\\n\\nIs this open_source_viable? Reply with ONLY 'Yes' or 'No'.`;
    
    onProgress?.('Typing prompt...');
    
    // Type prompt
    const textarea = await this.page.$('#prompt-textarea');
    if (textarea) {
        await textarea.click();
        await this.page.keyboard.type(fullPrompt, { delay: 1 });
        await this.page.keyboard.press('Enter');
    } else {
        return "No";
    }

    onProgress?.('Waiting for ChatGPT response...');
    
    // Simple wait for response logic (Wait until stop button disappears)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let isTyping = true;
    while (isTyping) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        isTyping = await this.page.evaluate(() => {
            const stopBtn = document.querySelector('button[aria-label*="Stop"]');
            const streaming = document.querySelectorAll('[class*="streaming"]');
            return !!stopBtn || streaming.length > 0;
        });
    }

    // Get last response
    const lastResponse = await this.page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('article[data-testid^="conversation-turn"]'));
        if (msgs.length === 0) return "";
        return msgs[msgs.length - 1].innerText || "";
    });

    if (lastResponse.toLowerCase().includes('yes')) {
        return "Yes";
    }
    return "No";
  }

  async closeSession() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
"""

content = content.replace("export { askChatGPTForRepoMetadata };", "export { askChatGPTForRepoMetadata };\n" + new_code)

with open("src/services/chatgptScraper.js", "w", encoding="utf-8") as f:
    f.write(content)
