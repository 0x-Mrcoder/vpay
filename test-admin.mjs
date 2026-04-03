import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting Admin UI Test...');
  try {
    // Launch browser
    const browser = await puppeteer.launch({ 
      headless: "new",
      // If you want to see the browser opening, set headless: false
      // headless: false,
      // slowMo: 50 // Adds a small delay so you can see what is happening
    });
    
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    const loginUrl = 'http://localhost:5173/login';
    console.log(`🌐 Navigating to ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });

    console.log('📝 Entering admin credentials...');
    // We found these credentials in your create-admin.ts script
    await page.type('input[type="email"]', 'admin@vtstack.com.ng');
    await page.type('input[type="password"]', 'Admin@VTStack123');

    console.log('🖱️ Clicking the Sign In button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);

    // Check if there's any visible error message on the screen
    const errorIsVisible = await page.evaluate(() => {
      const errorDiv = document.querySelector('.text-red-700');
      return errorDiv ? errorDiv.textContent : null;
    });

    if (errorIsVisible) {
      console.error(`❌ Login failed! UI error message: "${errorIsVisible}"`);
    } else {
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Success! Successfully logged in and navigated to the dashboard.');
        console.log(`Current URL: ${currentUrl}`);
      } else {
        console.log('⚠️ Warning: Login might have failed or the redirect did not go to /dashboard.');
        console.log(`Current URL: ${currentUrl}`);
      }
    }

    console.log('🧹 Closing browser...');
    await browser.close();
    console.log('✨ Test finished.');
  } catch (err) {
    console.error('❌ An error occurred during the test:', err);
  }
})();
