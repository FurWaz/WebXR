let supported = xr.isSessionSupported("immersive-vr");
console.log("session supported: "+supported);
if (supported) {
    xr.requestSession("immersive-vr").then((session) => {
        xrSession = session;
        console.log("session requested successfully");
    });
}