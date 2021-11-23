export class Error {
    static NO_ERROR = new Error("No error");

    constructor(message) {
        this.msg = message;
    }

    displayIfError() {
        if (this != Error.NO_ERROR)
            log("Error: "+this.msg);
    }
}

let socket = null;
export function log(msg) {
    if (socket == null) socket = io();
    socket.emit("custom/log", msg);
}

var _scene = null, _XRSession = null, _XRSpace = null, _XRFrame = null;
export function getScene() {return _scene;}
export function getXRSession() {return _XRSession;}
export function getXRSpace() {return _XRSpace;}
export function getXRFrame() {return _XRFrame;}
export function setScene(scene) {_scene = scene;}
export function setXRSession(XRSession) {_XRSession = XRSession;}
export function setXRSpace(XRSpace) {_XRSpace = XRSpace;}
export function setXRFrame(XRFrame) {_XRFrame = XRFrame;}