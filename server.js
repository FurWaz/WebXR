var https = require('https');
var express = require('express');
var fs = require("fs");
const app = express();
let credentials = {
    key: fs.readFileSync("./credentials/key.pem", "utf-8"),
    cert: fs.readFileSync("./credentials/cert.pem", "utf-8")
};


const server = https.createServer(credentials, app);

app.get('/*', (req, res) => {
    let path = req.url;
    if (req.url == "/") path = "/index.html";
    path = path.split("?")[0];
    path = __dirname+path;
    res.sendFile(path);
});

server.listen(443);