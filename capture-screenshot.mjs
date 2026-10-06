import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Users\\h1s2a\\.cache\\puppeteer\\chrome\\win64-154.0.8037.57\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to http://localhost:4173 ...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  try {
    const startBtn = await page.$('#start-btn');
    if (startBtn) {
      console.log('Clicking start button...');
      await startBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    const diffBtn = await page.$('.diff-btn[data-key="MEDIUM"]');
    if (diffBtn) {
      console.log('Clicking Medium difficulty button...');
      await diffBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (e) {
    console.log('Menu navigation notice:', e.message);
  }

  const container = await page.$('#canvas-container') || await page.$('body');
  if (container) {
    const screenshotPath = 'C:\\Users\\h1s2a\\.gemini\\antigravity\\brain\\32f2b92f-a871-456e-a2db-b73825c79ee1\\threejs_badminton_preview.png';
    await container.screenshot({ path: screenshotPath });
    console.log(`Screenshot successfully saved to ${screenshotPath}`);
  } else {
    console.log('Could not find canvas container');
  }

  await browser.close();
})();
