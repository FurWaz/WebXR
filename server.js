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
    constructor(id) {
        this.id = id;
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

let sockets = [];
function getSocket(id) {
    return sockets.find(socket => socket.id == id);
}

/**@type {Player[]} players */
let players = [];

io.on("connection", socket => {
    console.log("new connection from socket "+socket.id);
    sockets.push(socket);
    players.push(new Player(socket.id));
    socket.on("custom/log", msg => {
        console.log("[LOG "+socket.id+"]> "+msg);
    });
    socket.on("disconnect", r => {
        console.log("socket "+socket.id+" disconnected: "+r);
        sockets = sockets.filter(sock => sock.id != socket.id);
        players = players.filter(player => player.id != socket.id);
    });
    socket.on("custom/setPlayer", data => {
        let curPlayer = players.find(p => p.id == socket.id);
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
        if (curPlayer.mode == Player.HANDS) {
            curPlayer.hands.left.joints = data.playerLeftCtrlJoints;
            curPlayer.hands.right.joints = data.playerRightCtrlJoints;
        }
    });
})

setInterval(()=>{
    console.log(sockets.map(p => p.id));
    players.forEach(p => {
        getSocket(p.id)?.emit("custom/getPlayers", {players: players.filter(p2 => p2.id != p.id)});
    });
}, 33);

server.listen(443);