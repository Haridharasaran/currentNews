const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const async = require('async');
// const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const moment = require("moment");
dotenv.config();
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;
let html_to_pdf = require('html-pdf-node');
const nodemailer = require('nodemailer');
const cron = require("node-cron");

// Middleware
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  let respect = ''
  res.send('hello world');

});
cron.schedule("1 1 0 * * *", function () {
  mainApi()
  console.log("running at every 12:01 Am");
}, {
  timezone: "Asia/Kolkata"
});



// Example usage
function mainApi() {
  let date = moment().subtract(1, 'days').format('DD-MM-YYYY');
  let url = `https://www.tnpscthervupettagam.com/currentaffairs/?q_year=${date}`
  fetchSourceWithCurl(url = url)
    .then((html) => {
      const $ = cheerio.load(html);
      const links = [];
      const elements = $(".page-link");
      if (elements && elements.length) {
        elements.each((index, element) => {
          const href = $(element).attr('href');
          if (href && index) {
            links.push(href);
          }
        });
        if (links && links.length) {
          pageChange(links)
        }
      }
    })
    .catch((err) => {
      console.error(err);
    });
}
function fetchSourceWithCurl(url) {
  return new Promise((resolve, reject) => {
    exec(`curl -L --silent "${url}"`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr || error.message}`);
        return;
      }
      resolve(stdout);
    });
  });
};

const pageChange = (lists) => {
  let array = []
  let result = lists.map((e, i) => {
    return new Promise((resolve, reject) => {
      exec(`curl -L --silent "${e}"`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${stderr || error.message}`);
          return;
        }
        resolve(stdout);
      });
    }).then((html) => {
      const $ = cheerio.load(html);
      const elements = $(".cnt-rdng a");
      if (elements && elements.length) {
        elements.each((index, element) => {
          const href = $(element).attr('href');
          if (href) {
            array.push(href);
          }
        });
      }
    })
  })

  Promise.all(result)
    .then(() => {
      if (array && array.length) {
        forIndividualPages(array)
      }
    })
}

const forIndividualPages = (pages) => {
  let htmlData = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Basic HTML template">
  <meta name="author" content="Your Name">


 <style>
/* General Body Styles */
body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    margin: 20px;
    background-color: #f3f4f6;
    color: #333;
}
h2 {
    font-size: 2em; /* Bigger heading */
    color: #2c3e50;
    font-weight: bold; /* Bold heading */
    margin-bottom: 15px;
    text-align: center; /* Center align headings */
}
p, ul {
    margin: 10px 0;
    padding: 0;
}

/* Colorful Date and Info Section */
.date-dit {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 15px;
    padding: 10px 15px;
    background: linear-gradient(to right, #ff9a9e, #fad0c4);
    border-radius: 10px;
    font-size: 0.9em;
    color: white;
    justify-content: end; /* Center align content */
}
.date-dit span {
    display: flex;
    align-items: center;
    gap: 5px;
}
.date-dit i {
    color: white;
    font-size: 1.2em;
}

/* View Current Affairs Section */
.view-currentaffairs {
    background: linear-gradient(to bottom, #a1c4fd, #c2e9fb);
    padding: 20px;
    border-radius: 10px;
    color: #2c3e50;
    margin-bottom: 15px;
    font-size: 1em;
}
.view-currentaffairs ul {
    list-style: circle; /* Use circles for list items */
    padding-left: 20px; /* Add space for list markers */
}
.view-currentaffairs ul li {
    padding: 8px 0;
    color: #34495e;
} 

.view-currentaffairs p {
            text-align: center;
            margin-top: 30px;
        }

.view-currentaffairs img {
   width: 50%; /* Adjust the image width to 50% */
    max-width: 70%; /* Optional max width */
    height: auto;
    display: inline-block;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Post Views Section */
.post-views, .soc-shr , .date-dit {
    display:none;
}
</style>



  <title>Document</title>
</head>
<body>`
  let array = []
  let result = pages.map((e, i) => {
    return new Promise((resolve, reject) => {
      exec(`curl -L --silent "${e}"`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${stderr || error.message}`);
          return;
        }
        resolve(stdout);
      });
    }).then((html) => {
      const $ = cheerio.load(html);
      const elements = $(".detail-cont").html();
      let heading = $(".page-heding h1").html();
      if (heading) htmlData += `<h2>${heading}</h2>`;
      if (elements) htmlData += elements;
    })
  })

  Promise.all(result)
    .then(() => {
      let options = { format: 'A3' };
      console.log('htmlData: ', htmlData);
      let file = { content: htmlData }
      var pdfBase64 = ''
      html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
        pdfBase64 = pdfBuffer.toString('base64');
        return pdfBase64
      }).then(data => {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          secure: true,
          host: 'smtp.gmail.com',
          port: 465,
          auth: {
            user: 'haridharasarans@gmail.com',
            pass: 'gqihkxhwbeltlorx'
          }
        });
        let arrEmail = ['haridharasaran7@gmail.com','krishnanhari0911@gmail.com']
        arrEmail.forEach((a)=> {
          transporter.sendMail({
            to: a,
            subject: 'Current Affairs',
            attachments: [
              {
                filename: 'example.pdf',
                content: pdfBase64,
                encoding: 'base64'
              }
            ]
          }).then(() => {
            console.log('Mail Send');
          })
        })
      })
    })
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
