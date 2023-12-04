const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const bodyParser = require("body-parser");
const cron = require("node-cron");
require("dotenv").config;

const app = express();

app.use(bodyParser.json());

const port = 8584;
// You can change this to any port you prefer
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1; // JavaScript months are 0-based
const day = today.getDate();
const formattedDate = `${day}-${month}-${year}`;


app.get("/", async (req, res) => {
  try {
    await scrapeWebsite();
    res.send("Scraping initiated.");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/today", (req, res) => {
  try {
    const rawData = fs.readFileSync("output.json", "utf-8");
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

app.post("/todaycurrency", (req, res) => {
  try {
    const rawData = fs.readFileSync("output.json", "utf-8");
    const allData = JSON.parse(rawData);

    const requestedCurrency = req.body.currency;

    if (allData[formattedDate]) {
      // Find the currency in the data for the requested date
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

app.post("/getbydata", (req, res) => {
  try {
    const rawData = fs.readFileSync("output.json", "utf-8");
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

app.post("/getbydatacurrency", (req, res) => {
  try {
    const rawData = fs.readFileSync("output.json", "utf-8");
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
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

    for (let pageNumber = 0; pageNumber < 5; pageNumber++) {
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

    // Save the combined data to a JSON file
    fs.writeFileSync(
      "output.json",
      JSON.stringify(dataByDate, null, 2),
      "utf-8"
    );
    console.log("Data saved to output.json");

    // Close the browser
    await browser.close();

    // Add your specific scraping logic here
  } catch (error) {
    console.error("Error:", error.message);
  }
}

scrapeWebsite();

// Schedule the script to run once per day at 08:00 AM in Africa/Maputo timezone
cron.schedule(
  "0 8 * * *",
  () => {
    console.log("Running the scraping script...");
    scrapeWebsite();
  },
  { timezone: "Africa/Maputo" }
);

module.exports = app;
