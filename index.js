const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const PAGE_ACCESS_TOKEN = 'access token';
const app = express();

// Use body-parser middleware.
app.use(bodyParser.json());

// SocialNerds data.
const socialNerdVideos = require('./videos');

/**
 * Validate Facebook webhook.
 */
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'SocialNerds') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

/**
 * Receive requests from Facebook.
 */
app.post('/webhook', function (req, res) {
    const data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function (entry) {
            // Iterate over each messaging event
            entry.messaging.forEach(function (event) {
                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        res.sendStatus(200);
    }
});

/**
 * Handle received message.
 *
 * @param event
 */
function receivedMessage(event) {
    const senderID = event.sender.id;
    const recipientID = event.recipient.id;
    const timeOfMessage = event.timestamp;
    const message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    const messageText = message.text;

    let messageData = '';
    if (messageText) {
        switch (messageText) {
            case 'hello':
                messageData = sendHelloMessage(senderID);
                break;
            default:
                messageData = sendSearchMessage(senderID, messageText);
        }
    }

    callSendAPI(messageData);
}

/**
 * Respond to 'hello' message or the message passed as param.
 *
 * @param recipientId
 * @param message(optional)
 * @return {{recipient: {id: *}, message: {text: (string|string)}}}
 */
function sendHelloMessage(recipientId, message = '') {
    return messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: message.trim() || 'Hello nerd, send something to search on our videos!'
        }
    };
}

/**
 * Search on SocialNerds videos array and return the videos or a sorry message.
 *
 * @param recipientId
 * @param messageText
 * @return {string}
 */
function sendSearchMessage(recipientId, messageText) {
    const match = new RegExp(messageText, 'i');
    const videos = socialNerdVideos.filter(video => match.test(video.title));
    let messageData = '';

    if (videos.length > 0) {
        messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: buildMessage(videos)
                    }
                }
            }

        };
    } else {
        messageData = sendHelloMessage(recipientId, 'Sorry, we are lazy too!');
    }

    return messageData;
}

/**
 * Map matched videos to Facebook template response.
 *
 * @param videos
 * @return {Array}
 */
function buildMessage(videos) {
    return videos.map(video => {
        return {
            title: video.title,
            subtitle: video.description,
            item_url: video.url,
            image_url: 'https://scontent.fath3-1.fna.fbcdn.net/v/t1.0-9/18058096_1685426578426826_1338045697125253103_n.png?oh=d446a0ce4807c9634caa8a5f97960028&oe=5A5A0BA0',
            buttons: [{
                type: "web_url",
                url: video.url,
                title: "Watch video"
            }],
        }
    });
}

/**
 * Send the response to Facebook.
 *
 * @param messageData
 */
function callSendAPI(messageData) {
    axios.post(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, messageData)
        .then(res => {
            console.log('Done')
        })
        .catch(error => {
        });
}

// Start the server.
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
