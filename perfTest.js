const fs = require('fs');
const puppeteer = require('puppeteer');
const { startFlow } = require('lighthouse');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function captureReport() {
    const browser = await puppeteer.launch({
        headless: true, //Для того-щоб бачити вікно браузера та як проходить тест
        args: ['--no-sandbox', '--disable-gpu', '--window-size=1920,1080'],
        defaultViewport: null //Для того-щоб сайт рендерився в розширені заданому вище
    });

    const page = await browser.newPage();
    const baseURL = "http://localhost/";

    await page.setDefaultTimeout(30000);

    const flow = await startFlow(page, {
        name: 'Demoblaze Audit v9.6.8',
        configContext: {
            settingsOverrides: {
                throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0
                },
                throttlingMethod: "simulate",
                screenEmulation: {
                    mobile: false,
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                    disabled: false },
                    formFactor: "desktop",
                        onlyCategories: ['performance'],
            },
        },
    });

    //================================STEP 1: NAVIGATE================================

    console.log('Step 1: Navigate to main page...');
    await flow.navigate(baseURL, { stepName: 'Open Main Page' });



    //================================STEP 2: NAVIGATE TO "TABLES" TAB================================

    console.log("Step 2: Navigate to \"Tables\" tab...");
    await flow.startTimespan({ stepName: 'Navigate to "Tables" tab...' });

    const tablesBut ='a[href*="/tables"]'
    await page.waitForSelector(tablesBut,{ visible:true });
    await page.click(tablesBut);
    await page.waitForSelector('.product-list.default.per-row-5', {
        visible: true,
        timeout: 5000
    });

    await flow.endTimespan();



    //================================STEP 3: OPEN A TABLE PRODUCT CART================================

    console.log("STEP 3: OPEN A TABLE PRODUCT CART (Target: Table 8)")
    await flow.startTimespan({ stepName: 'Open Table 8 Product' });

    const targetProductSelector = 'a[href*="living-room-table8"]';

    const productExists = await page.$(targetProductSelector);
    if (!productExists) {
        throw new Error('Could not find Table 8 on the page! Check if the product is listed.');
    }

    const table8URL = await page.$eval(targetProductSelector, a => a.href);
    console.log(`Navigating to: ${table8URL}`);

    await page.goto(table8URL);

    await page.waitForSelector('.product-price', {
        visible: true,
        timeout: 5000
    });

    await flow.endTimespan();
    await sleep(2000);

    //================================STEP 4: ADD TABLE TO CART================================

    console.log("STEP 4: ADD TABLE TO CART")
    await flow.startTimespan({ stepName: 'ADD TABLE TO CART' });

    const addToCartBtn = '.button.green-box.ic-design';
    const successMassageBut = '.cart-added-info';

    await page.waitForSelector(addToCartBtn, { visible: true });
    await page.click(addToCartBtn);

    await page.waitForSelector(successMassageBut, { visible: true, timeout: 5000 });

    await flow.endTimespan();

    await sleep(2000);
    //================================STEP 5: OPEN CART================================

    console.log("STEP 5: OPEN CART")
    await flow.startTimespan({ stepName: 'Open Cart'});

    await page.click('.page_item.page-item-31');
    await page.waitForSelector('input[value="Place an order"]', { visible: true });

    await flow.endTimespan();

    await sleep(2000);
    //================================STEP 6: CLICK "PLACE AN ORDER"================================

    console.log("STEP 6: CLICK \"PLACE AN ORDER\"")
    await flow.startTimespan({stepName: 'Click: place an order'});

    await page.click('input[value="Place an order"]');
    await page.waitForSelector('label[for="cart_postal"]', { visible: true, timeout: 5000 } );

    await flow.endTimespan();

    await sleep(2000);
    //================================STEP 7: Fill in all required fields, click "Place order"================================

    console.log("STEP 7: Fill in all required fields, click \"Place order\"")
    await flow.startTimespan({stepName: 'Fill in all required fields, click "Place order"'});

    const cartCompany = 'input[name="cart_company"]';
    const fullNameBar = 'input[name="cart_name"]';
    const countrySelect = 'select[name="cart_country"]';
    const addressField = 'input[name="cart_address"]';
    const postalField = 'input[name="cart_postal"]';
    const cityField = 'input[name="cart_city"]';
    const phoneNumField = 'input[name="cart_phone"]';
    const mailField = 'input[name="cart_email"]';
    const submitBut = 'input[name="cart_submit"]';

    await page.waitForSelector(submitBut, { visible: true, timeout: 5000 });

    await page.type(cartCompany, 'EA', { delay: 50 });
    await page.type(fullNameBar, 'Oleksandr Kovalenko', { delay: 50 });

    await page.select(countrySelect, 'UA');

    await page.type(addressField, 'Shevchenka St 10');
    await page.type(postalField, '01001');
    await page.type(cityField, 'Kyiv');
    await page.type(phoneNumField, '0501234567');
    await page.type(mailField, 'olex.koval@testmail.com');

    await page.click(submitBut);
    const thankYouSelector = 'h1.entry-title';
    await page.waitForSelector(thankYouSelector, { visible: true, timeout: 10000 });

    const headerText = await page.$eval(thankYouSelector, el => el.innerText.trim());

    if (headerText === 'Thank You') {
        console.log('Scenario complete: Order placed!');
    } else {
        throw new Error(`Expected "Thank You" header, but found: "${headerText}"`);
    }

    await flow.endTimespan();

    //================================REPORT================================
    console.log('Generating Report...');
    const reportPath = 'user-flow.report.html';
    const report = await flow.generateReport();
    fs.writeFileSync(reportPath, report);

    console.log(`Done! Report saved to: ${reportPath}`);
    await browser.close();
}

captureReport().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
