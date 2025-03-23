const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sendVerificationSMS = require('./sms'); // Assuming this file exists

const app = express();
const port = 3000;

// For gallery/ (directory)
let messages = []; // Store messages

const galleryDir = path.join(__dirname, 'gallery');
if (!fs.existsSync(galleryDir)) {
    fs.mkdirSync(galleryDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, galleryDir); // Save files to the "gallery" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Unique filename
    }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(bodyParser.json()); // For the original server.js routes
app.use(express.json());    // For the gallery routes
app.use(express.static(__dirname));
app.use(session({
    secret: process.env.MYKEY,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10 * 60 * 1000 } // Session expires in 10 mins
}));

// ✅ Login Route
app.post('/login', (req, res) => {
    const { password } = req.body;

    if (password == process.env.pass1 || password == process.env.pass2) {
        req.session.authenticated = true;
        req.session.username = password == process.env.pass2 ? 'Sam' : 'VKS';
        if (password == process.env.pass2) {
            sendVerificationSMS(process.env.Mynumber);
        }
        return res.json({ success: true, username: req.session.username });
    }

    res.status(401).json({ success: false, message: 'Incorrect password!' });
});

// ✅ Middleware to Check If User Came from Login
function checkRedirect(req, res, next) {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/');
}

// ✅ Serve Chat Page (Only if redirected from Login)
app.get('/chat', checkRedirect, (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

// ✅ Send Messages
app.post('/send-message', checkRedirect, (req, res) => {
    try {
        const text = req.body.text.trim();
        if (!text) return res.sendStatus(400);

        const username = req.session.username;
        messages.push({ username, text });
        res.sendStatus(200);
    } catch (error) {
        console.error("Error sending message:", error);
        res.sendStatus(500);
    }
});

// ✅ Get Messages
app.get('/messages', checkRedirect, (req, res) => {
    const referer = req.get('Referer');
    if (!referer || !referer.includes(process.env.chat)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    res.json(messages);
});

// ✅ Serve Gallery Page (Only if redirected from Login)
app.get('/gallery', checkRedirect, (req, res) => {
    const referer = req.get('Referer');
    if (!referer || !referer.includes(process.env.chat)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    res.sendFile(__dirname + '/gallery.html');
});

// ✅ Endpoint to handle media uploads (images and videos)
app.post('/upload-media', checkRedirect, upload.array('media', 20), (req, res) => {
    const files = req.files;
    const types = req.body.types || [];
    
    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }
    
    res.send('Media uploaded successfully!');
});

// ✅ Endpoint to get all media in the gallery
app.get('/media', checkRedirect, (req, res) => {
    const referer = req.get('Referer');
    if (!referer || !referer.includes(process.env.gal)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    
    fs.readdir(galleryDir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan gallery folder.');
        }
        
        const mediaFiles = files.map(file => {
            const fileExt = path.extname(file).toLowerCase();
            const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.mkv'].includes(fileExt);
            const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(fileExt);
            
            return {
                url: `/gallery/${file}`,
                type: isVideo ? 'video' : (isImage ? 'image' : 'unknown')
            };
        }).filter(file => file.type !== 'unknown');
        
        res.json(mediaFiles);
    });
});

// ✅ Endpoint to delete a media file
app.post('/delete-media', checkRedirect, (req, res) => {
    const { mediaUrl, mediaType } = req.body;
    const mediaName = path.basename(mediaUrl);
    const mediaPath = path.join(galleryDir, mediaName);

    // Check if the file exists
    if (!fs.existsSync(mediaPath)) {
        return res.status(404).send('Media file not found.');
    }

    // Delete the file
    fs.unlink(mediaPath, (err) => {
        if (err) {
            return res.status(500).send('Failed to delete media file.');
        }
        res.send('Media deleted successfully.');
    });
});

// Serve media files from the "gallery" folder
app.use('/gallery', express.static(galleryDir));

// ✅ Logout
app.get('/logout', (req, res) => {
    res.sendFile(__dirname + '/logout.html');
});

// ✅ Start Server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));