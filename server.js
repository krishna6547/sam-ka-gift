const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Import fetch for Node.js 16 and below

const app = express();
const port = 3000;
const SECRET_KEY = 'your_super_secret_key'; // 🔥 Change this in production

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

let messages = []; // Stores messages

// 🔹 Hardcoded Password Function
function generatePassword() {
  const now = new Date();
  const minutes = now.getMinutes().toString().padStart(2, '0'); // Ensure 2 digits
  return `26${minutes}`;
}

// 🔹 User Authentication: Verify password & return JWT token
app.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === generatePassword()) {
    const token = jwt.sign({ authenticated: true }, SECRET_KEY, { expiresIn: '10m' }); // Token expires in 10 minutes
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: 'Incorrect password!' });
});

// 🔹 Middleware: Verify JWT Token
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) return res.status(403).json({ success: false, message: 'No token provided!' });

  jwt.verify(token.split(' ')[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid token!' });
    req.user = decoded;
    next();
  });
}

// 🔹 Serve Chat Page
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});

// 🔹 Function to Get Username Based on IP
async function getUsername(ip) {
  try {
    console.log("Fetching location for IP:", ip);
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=regionName,status,country`);
    const data = await response.json();

    if (data.status === "success" && data.country === "India") {
      if (data.regionName === "Uttar Pradesh") return "vks";
      if (data.regionName === "West Bengal") return "sam";
      return "guest"; // Default for other states
    }
    return "unknown"; // If location is outside India
  } catch (error) {
    console.error("Error fetching location:", error);
    return "error"; // If API request fails
  }
}

// 🔹 Send Message (Requires Authentication)
app.post('/send-message', verifyToken, async (req, res) => {
  try {
    const text = req.body.text.trim();
    if (!text) return res.sendStatus(400); // Reject empty messages

    // Get user IP from request headers
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const username = await getUsername(ip); // Fetch username dynamically

    messages.push({ username, text }); // Store the message with the correct username
    res.sendStatus(200);
  } catch (error) {
    console.error("Error sending message:", error);
    res.sendStatus(500); // Internal server error
  }
});

// 🔹 Fetch Messages
app.get('/messages', (req, res) => {
  res.json(messages);
});

// 🔹 Start Server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
