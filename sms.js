const accountSid = process.envv.accountSid;
const authToken = process.env.authToken;
const client = require('twilio')(accountSid, authToken);

function sendVerificationSMS(to) {
  client.messages
    .create({
      from: process.env.twilionum, // Your Twilio number
      body: process.env.message, // Hardcoded message
      to: to // Receiver's number
    })
    .then(message => console.log('Message SID:', message.sid))
    .catch(error => console.error('Error:', error));
}

module.exports = sendVerificationSMS;
