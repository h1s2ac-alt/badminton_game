import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('Navigating to local game server...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 500));
  
  try {
    const startBtn = await page.$('#start-btn');
    if (startBtn) {
      await startBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
    
    const diffBtn = await page.$('.diff-btn[data-key="MEDIUM"]');
    if (diffBtn) {
      await diffBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {
    console.log('Error clicking through menus:', e.message);
  }

  const canvas = await page.$('#game-canvas');
  if (canvas) {
    const screenshotPath = 'C:\\Users\\h1s2a\\.gemini\\antigravity\\brain\\32f2b92f-a871-456e-a2db-b73825c79ee1\\game_screenshot.png';
    await canvas.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } else {
    console.log('Could not find #game-canvas element');
  }

  await browser.close();
})();
