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

class Position {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
class Rotation {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
}
class Player {
    static CONTROLLERS = 1;
    static HANDS = 1;
    constructor(socket) {
        this.socket = socket;
        this.position = new Position();
        this.rotation = new Rotation();
        this.mode = Player.CONTROLLERS;
        this.headPos = new Position();
        this.headRot = new Rotation();
        this.hands = {
            left: {
                position: new Position(),
                rotation: new Rotation(),
                visible: false,
                joints: []
            },
            right: {
                position: new Position(),
                rotation: new Rotation(),
                visible: false,
                joints: []
            }
        }
    }
}

/**@type {Player[]} players */
let players = [];

io.on("connection", socket => {
    console.clear();
    console.log("new connection from socket "+socket.id);
    players.push(new Player(socket));
    socket.on("custom/log", msg => {
        console.log("[LOG "+socket.id+"]> "+msg);
    });
    socket.on("disconnect", r => {
        console.log("socket "+socket.id+" disconnected: "+r);
        players = players.filter(p => p.socket.id != socket.id);
    });
    socket.on("custom/setPlayer", data => {
        let curPlayer = players.find(p => p.socket.id == socket.id);
        curPlayer.position = data.playerPos;
        curPlayer.rotation = data.playerRot;
        curPlayer.headPos = data.playerHeadPos;
        curPlayer.headRot = data.playerHeadRot;
        curPlayer.mode = data.inputMode;
        curPlayer.hands.left.position = data.playerLeftCtrlPos;
        curPlayer.hands.right.position = data.playerRightCtrlPos;
        curPlayer.hands.left.rotation = data.playerLeftCtrlRot;
        curPlayer.hands.right.rotation = data.playerRightCtrlRot;
        curPlayer.hands.left.visible = data.playerLeftCtrlVisible;
        curPlayer.hands.right.visible = data.playerRightCtrlVisible;
        if (curPlayer.mode == Player.CONTROLLERS) {
            curPlayer.hands.left.joints = data.playerLeftCtrlJoints;
            curPlayer.hands.right.joints = data.playerRightCtrlJoints;
        }
    });
})

setInterval(()=>{
    players.forEach(p => {
        p.socket.emit("custom/getPlayers", {players: players.filter(p2 => p2.socket.id != p.socket.id)});
    });
}, 33);

server.listen(443);