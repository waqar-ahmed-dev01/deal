const express = require('express');
const app = express();

// Serve static files
app.use(express.static('public'));

// PWA headers
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(__dirname + '/public/manifest.json');
});

app.get('/service-worker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(__dirname + '/public/service-worker.js');
});

// Download endpoint
app.get('/download/dealhub-app.apk', (req, res) => {
    res.download('public/download/dealhub-app.apk', 'dealhub-app.apk');
});