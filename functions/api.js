const express = require("express");

const puppeteer = require("puppeteer");
const fs = require("fs");
const bodyParser = require("body-parser");
const cron = require("node-cron");
require("dotenv").config;
const path = require("path");

const serverless = require('serverless-http');
const router = express.Router();

const app = express();

router.use(bodyParser.json());

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1;
const day = today.getDate();
const formattedDate = `${day}-${month}-${year}`;

// Save the combined data to a JSON file inside the "Dados" folders
const outputFolderPath = path.join(__dirname, "Dados");
const outputFilePath = `${outputFolderPath}/output.json`;



console.log("Absolute Path:", outputFolderPath);

fs.mkdirSync(outputFolderPath, { recursive: true });

fs.mkdirSync(outputFolderPath, { recursive: true });

router.get("/", async (req, res) => {
  try {
    await scrapeWebsite();
    res.send("Scraping initiated.");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/today", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with your actual frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const rawData = fs.readFileSync(outputFilePath, "utf-8");
    const allData = JSON.parse(rawData);

    const todayContent = allData[formattedDate];

    if (todayContent != null) {
      const contentForToday = todayContent;
      res.json(contentForToday);
    } else {
      res.json({
        error: "No data available for today's date.",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "No data available for today's date.",
    });
  }
});

router.get("/all", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with your actual frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  try {
    const rawData = fs.readFileSync(outputFilePath, "utf-8");
    const allData = JSON.parse(rawData);

    const todayContent = allData;

    if (todayContent != null) {
      const contentForToday = todayContent;
      res.json(contentForToday);
    } else {
      res.json({
        error: "No data available date.",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "No data available for today's date.",
    });
  }
});

router.post("/todaycurrency", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with your actual frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  try {
    const rawData = fs.readFileSync(outputFilePath, "utf-8");
    const allData = JSON.parse(rawData);

    const requestedCurrency = req.body.currency;

    if (allData[formattedDate]) {
      // Find the currency in the data for the requested date45454
      const currencyData = allData[formattedDate].find(
        (entry) => entry.moeda === requestedCurrency
      );

      // If the currency is found, send its contents
      if (currencyData) {
        res.json(currencyData);
      } else {
        // If the currency is not found, send a 404 response
        res.status(404).json({
          error: "Currency not found for the requested date.",
        });
      }
    } else {
      // If the requested date is not found, send a 404 response
      res.status(404).json({
        error: "Currency not found for the requested date.",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "Error on Currency requested.",
    });
  }
});

router.post("/getbydata", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with your actual frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  try {
    const rawData = fs.readFileSync(outputFilePath, "utf-8");
    const allData = JSON.parse(rawData);

    const requestedDate = req.body.date; // Assuming you send the date in the request body

    const requestedContent = allData[requestedDate];

    if (requestedContent != null) {
      res.json(requestedContent);
    } else {
      res.status(404).json({
        error: "No data available for requested date.",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      error: "Error on Getbydata requested.",
    });
  }
});

router.post("/getbydatacurrency", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with your actual frontend URL
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const rawData = fs.readFileSync(outputFilePath, "utf-8");
    const allData = JSON.parse(rawData);

    const requestedDate = req.body.date;
    const requestedCurrency = req.body.currency; // Assuming you send the currency in the request body

    // Check if the requested date exists in the datas
    if (allData[requestedDate]) {
      // Find the currency in the data for the requested date
      const currencyData = allData[requestedDate].find(
        (entry) => entry.moeda === requestedCurrency
      );

      // If the currency is found, send its contents
      if (currencyData) {
        res.json(currencyData);
      } else {
        // If the currency is not found, send a 404 response
        res.status(404).json({
          error: "Currency not found for the requested date.",
        });
      }
    } else {
      // If the requested date is not found, send a 404 response
      res.status(404).json({
        error: "No data available for requested date.",
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});



async function scrapeWebsite() {
  const url = `https://jue.mcnet.co.mz/mcnet/portal/exchangerate?selectedDate=${formattedDate}`;

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

    let dataByDate = {};

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

      if (!dataByDate[formattedDate]) {
        dataByDate[formattedDate] = [];
      }
      dataByDate[formattedDate] = [...dataByDate[formattedDate], ...rowData];

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

    // Verifica se o arquivo já existe
    if (fs.existsSync(outputFilePath)) {
      // Lê o conteúdo existente do arquivo
      const existingData = fs.readFileSync(outputFilePath, "utf-8");

      // Converte o conteúdo existente para um objeto JavaScript
      const existingDataObject = JSON.parse(existingData);

      // Adiciona a nova data ao objeto existente
      existingDataObject[formattedDate] = dataByDate[formattedDate];

      // Escreve o objeto atualizado de volta no arquivo
      fs.writeFileSync(
        outputFilePath,
        JSON.stringify(existingDataObject, null, 2),
        "utf-8"
      );
    } else {
      // Se o arquivo não existir, cria um novo arquivo com os dados atuais
      fs.writeFileSync(
        outputFilePath,
        JSON.stringify(dataByDate, null, 2),
        "utf-8"
      );
    }

    console.log("Cambio Actualizado");

    // Close the browser
    await browser.close();

    // Add your specific scraping logic here
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Schedule the script to run every 30 minutes
cron.schedule(
  "0 */5 * * *", // Run every 5 hours

  () => {
    console.log("Verificando novo Cambio...");
    scrapeWebsite();
  },
  { timezone: "Africa/Maputo" }
);

scrapeWebsite();

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
