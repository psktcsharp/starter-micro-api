var http = require('http');
// Require fs and csv-stringify modules
const fs = require('fs');
// Require csv-stringify module using the default export
const stringify = require('csv-stringify');
const { Parser } = require('json2csv');
var DOMParser = require('xmldom').DOMParser;
const fse = require("fs-extra");
var cheerio = require('cheerio');
const AWS = require("aws-sdk");
const s3 = new AWS.S3()


// async function saveToS3(bucketName, key, data) {
//     const params = {
//         Bucket: bucketName,
//         Key: key,
//         Body: data
//     };
//     try {
//         await s3.putObject(params).promise();
//         console.log(`Successfully uploaded data to ${bucketName}/${key}`);
//     } catch (error) {
//         console.error(error);
//     }
// }
// // store something
// await s3.putObject({
//                 Body: JSON.stringify({key:"value"}),
//                 Bucket: "cyclic-teal-famous-turkey-eu-central-1",
//                 Key: "some_files/my_file.json",
//             }).promise()

// get it back
// let my_file = await s3.getObject({
//                 Bucket: "cyclic-teal-famous-turkey-eu-central-1",
//                 Key: "some_files/my_file.json",
//             }).promise()



let currentBtcPrice;
let currentChatSpeed;



async function checkAndSave(bucketName, key, messages) {
    let existingData;
    try {
        // Get the existing data from the S3 bucket
        const response = await s3.getObject({
            Bucket: bucketName,
            Key: key
        }).promise();
        existingData = JSON.parse(response.Body.toString());
    } catch (error) {
        // If there is no existing data, initialize an empty array
        if (error.code === 'NoSuchKey') {
            existingData = [];
        } else {
            console.error(error);
            return;
        }
    }

    // Create a Set of existing message IDs for faster lookup
    const existingMessageIds = new Set(existingData.map(message => message.id));

    // Filter out any duplicate messages based on message ID
    const newMessages = messages.filter(message => !existingMessageIds.has(message.id));

    // Combine the existing data with the new messages
    const updatedData = [...existingData, ...newMessages];

    try {
        // Upload the updated data to the S3 bucket
        await s3.putObject({
            Bucket: bucketName,
            Key: key,
            Body: JSON.stringify(updatedData)
        }).promise();
        console.log(`Successfully uploaded data to ${bucketName}/${key}`);
    } catch (error) {
        console.error(error);
    }

    for (let message of messages) {
        let id = message.id;
        let exists = false;
        for (let line of lines) {
          let lineId = line.split(",")[0];
          if (lineId === id) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          try {
            // Create a new object with only the desired properties
            const newMessage = {
              id: message.id,
              time: message.time,
              user_id: message.user_id,
              username: message.username,
              text: `"${message.text.replace(/\n/g, ' ').replace(/"/g, '""').replace(/,/g, ' ')}"`,
              symbol: message.symbol,
              btcprice: currentBtcPrice,
              chatspeed: currentChatSpeed // Add chatspeed property to newMessage object
            };
            console.log(newMessage.btcprice)
            //await fse.appendFile("chatdata.csv", Object.values(newMessage).join(",") + "\n");
              saveToS3('cyclic-teal-famous-turkey-eu-central-1', 'chatdata.csv', chatData);
          } catch (error) {
            console.error(error);
            continue;
          }
        }
      }
    
}
    
    
 

// Declare an async function that fetches data from the URL and calls saveToCSV function with it

async function fetchData() {
  try {

     // Call updatePrice before calling checkAndSave 
      currentBtcPrice = await updatePrice();

     // Use await keyword to wait for the fetch promise to resolve
     const response = await fetch('https://www.tradingview.com/conversation-status/?_rand=0.46910101152052874&offset=0&room_id=bitcoin&stat_interval=60&size=10');
     // Use await keyword to wait for the response.json() promise to resolve
     const data = await response.json();
     // Get the messages array from the data object
     const messages = data.messages;

     // Define a helper function that converts a timestamp string to seconds
     const timestampToSeconds = (timestamp) => {
       const parts = timestamp.split(' ')[4].split(':');
       const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);
       return seconds;
     }

     // Define a helper function that calculates the messages per minute rate 
     const messagesPerMinute= (messages) => {

       const lastTimestamp= timestampToSeconds(new Date().toUTCString())
       const firstTimestamp=timestampToSeconds(messages[messages.length-1].time);
       const durationMinutes= (lastTimestamp - firstTimestamp)/60;
       const count=messages.length;
       const rate=count/durationMinutes;
       currentChatSpeed =  rate;
       return rate; 
     }

   // Log the chat speed to the console 
   console.log(`Chat Speed: ${messagesPerMinute(messages)} messages per minute`);

   // Call saveToCSV function with messages array as an argument 
   await checkAndSave(cyclic-teal-famous-turkey-eu-central-1', 'chatdata.json', messages);

 } catch (error) { 
   // If there is an error, log it to the console 
   console.error(error); 
 } 
}

async function updatePrice() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    return data.bitcoin.usd;
}






























http.createServer(function (req, res) {
    console.log(`Just got a request at ${req.url}!`)
    res.write('Yo!');
    // Call fetchData function every 5 seconds using setInterval 
    setInterval(fetchData,5000);

}).listen(process.env.PORT || 3000);


