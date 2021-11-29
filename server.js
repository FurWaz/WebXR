var https = require('https');
var express = require('express');
var fs = require("fs");
const { Server } = require("socket.io");
let credentials = {
    key: fs.readFileSync("./credentials/key.pem", "utf-8"),
    cert: fs.readFileSync("./credentials/cert.pem", "utf-8")
};

const app = express();
const server = https.createServer(credentials, app);
const io = new Server(server);

app.get('/*', (req, res) => {
    let path = req.url;
    if (req.url == "/") path = "/index.html";
    path = path.split("?")[0];
    path = __dirname+"/client"+path;
    res.sendFile(path);
});

io.on("connection", socket => {
    console.clear();
    console.log("new connection from socket "+socket.id);
    socket.on("custom/log", msg => {
        console.log("[LOG "+socket.id+"]> "+msg);
    });
    socket.on("disconnect", r => {
        console.log("socket "+socket.id+" disconnected: "+r);
    })
})

server.listen(443);