const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const bodyParser = require("body-parser");
const cron = require("node-cron");
require("dotenv").config();
const path = require("path");
const serverless = require("serverless-http");

// Path to your Firebase Admin SDK service account key file

var admin = require("firebase-admin");

var serviceAccount = require("../draft-47b0f-firebase-adminsdk-tavu6-1848b372e8.json");
const { Console } = require("console");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://draft-47b0f-default-rtdb.firebaseio.com",
});

const router = express.Router();
const app = express();
router.use(bodyParser.json());

let dataByDate = {};

function getFormattedDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return `${day}-${month}-${year}`;
}

scrapeAndUpdateData();
console.log("Scraping function called on server initialization");

//Inicio Scrap---------------------------------------------------------------------------------

async function scrapeAndUpdateData() {
  const url = `https://jue.mcnet.co.mz/mcnet/portal/exchangerate?selectedDate=${getFormattedDate()}`;

  try {
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.goto(url);

    // Wait for a specific element to be present on the page
    await page.waitForSelector("tbody");

    // Wait for the content to load
    await page.waitForSelector("span > a.paginate_button");

    const buttons = await page.$$("span > a.paginate_button");
    const numberOfCurrentButtons = buttons.length;

    for (
      let pageNumber = 0;
      pageNumber < numberOfCurrentButtons;
      pageNumber++
    ) {
      // Extract "Moeda," "Descrição," and "Taxa" content from each row
      const rowData = await page.evaluate(() => {
        const rows = document.querySelectorAll("tbody tr");

        const data = [];

        rows.forEach((row) => {
          const moeda = row.querySelector('td[data-title="Moeda"]').innerText;
          const descricao = row.querySelector(
            'td[data-title="Descrição"]'
          ).innerText;
          const taxa = row.querySelector('td[data-title="Taxa"]').innerText;

          data.push({ moeda, descricao, taxa });
        });

        return data;
      });

      // Organize data by date

      if (!dataByDate[getFormattedDate()]) {
        dataByDate[getFormattedDate()] = [];
      }

      if (!dataByDate[getFormattedDate()]) {
        dataByDate[getFormattedDate()] = {};
      }

      for (const { moeda, descricao, taxa } of rowData) {
        dataByDate[getFormattedDate()][moeda] = {
          descricao,
          moeda,
          taxa,
        };
      }

      // Click on the pagination button to go to the next page
      const nextPageButton = await page.$(".paginate_button.next");
      if (nextPageButton) {
        await nextPageButton.click();
        // Wait for a specific element on the next page
        await page.waitForSelector("tbody");
      } else {
        // If there is no next page button, break out of the loop
        break;
      }
    }

    await browser.close();

    /*  console.log(dataByDate[getFormattedDate()]) */

    // Push data to Firebase
    const database = admin.database();
    const ref = database.ref("exchangeRates/" + getFormattedDate());
    await ref.set(dataByDate[getFormattedDate()]);

    // Add your specific scraping logic here
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Schedule cron job
cron.schedule(
  "* * * * *", // Run every 1 hours
  () => {
    console.log("Verificando novo Cambio...");
    scrapeAndUpdateData(); // No need to set isDataLoaded here, it will be set in the function
  },
  { timezone: "Africa/Maputo" }
);

app.use("/.netlify/functions/api", router);
module.exports.handler = serverless(app);
