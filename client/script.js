import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three/examples/jsm/webxr/VRButton.js';

let socket = io();
function log(msg) {
    socket.emit("custom/log", msg);
}

log("Libraries imported successfully");

let session = null;
let old = [];
let models = [];
let firstTime = true;
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x102030);

let player = new THREE.Group();
player.position.set(0, 0, 2);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 2);
camera.lookAt(0, 1, -2);
player.add(camera);
scene.add(player);

var light = new THREE.DirectionalLight(0xffffff, 1, 100);
light.castShadow = true;
light.position.set(2, 5, -2);
scene.add(light);
light.shadow.mapSize.width = 512; // default
light.shadow.mapSize.height = 512; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 100; // default

scene.add(new THREE.AmbientLight(0xffffff,0.2))

let cube = new THREE.Mesh(
    new THREE.BoxBufferGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({color: 0x0000ff})
);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

let plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(8, 8),
    new THREE.MeshLambertMaterial({color: 0x106040})
);
plane.rotation.set(-1.57, 0, 0);
plane.receiveShadow = true;
scene.add(plane);

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(render);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

// const helper = new THREE.CameraHelper( light.shadow.camera );
// scene.add( helper );

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

function buildController(data) {
    let cube = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(0.05, 0.05, 0.2, 16),
        new THREE.MeshLambertMaterial({color:(data.handedness=="left")? new THREE.Color(0xfca103): new THREE.Color(0x035efc)})
    );
    cube.castShadow = true;
    cube.receiveShadow = true;
    return cube;
}

const BUTTON_TRIGGER = 0;
const BUTTON_SQUEEZE = 1;
const BUTTON_TOUCHPAD = 2;
const BUTTON_THUMBSTICK = 3;
const AXE_TOUCHPAD_X = 0;
const AXE_TOUCHPAD_Y = 1;
const AXE_THUMBSTICK_X = 2;
const AXE_THUMBSTICK_Y = 3;

function getBtnName(ev) {
    switch (ev) {
        case BUTTON_TRIGGER:
            return "BUTTON_TRIGGER"
        case BUTTON_SQUEEZE:
            return "BUTTON_SQUEEZE"
        case BUTTON_TOUCHPAD:
            return "BUTTON_TOUCHPAD"
        case BUTTON_THUMBSTICK:
            return "BUTTON_THUMBSTICK"
    }
}
function getAxeName(ev) {
    switch (ev) {
        case AXE_TOUCHPAD_X:
            return "AXE_TOUCHPAD_X"
        case AXE_TOUCHPAD_Y:
            return "AXE_TOUCHPAD_Y"
        case AXE_THUMBSTICK_X:
            return "AXE_THUMBSTICK_X"
        case AXE_THUMBSTICK_Y:
            return "AXE_THUMBSTICK_Y"
    }
}

function detectCollisions() {
    // cubeBounds.intersectsBox(otherBound);
    // cubeBounds.containsBox(otherBound);
    // cubeBounds.containsPoint(point);
    
    let cubeBounds = new THREE.Box3().setFromObject(cube);
    let groundBox = new THREE.Mesh(
        new THREE.BoxBufferGeometry(2, 1, 2)
    );
    groundBox.position.set(0, -0.5, 0);
    let groundBound = new THREE.Box3().setFromObject(groundBox);

    let result = cubeBounds.intersectsBox(groundBound);
    if (result)
        cube.material = new THREE.MeshLambertMaterial({color:0xff0000})
    else cube.material = new THREE.MeshLambertMaterial({color:0x0000ff})
}

function handleController(now, old, dt) {
    now.source.gamepad.hapticActuators[0].pulse(now.buttons[BUTTON_TRIGGER], 40);
    if (now.handedness == "left") {
        let newPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        let mx = Math.cos(camera.rotation.z)*now.axes[AXE_THUMBSTICK_X] + Math.sin(camera.rotation.z)*now.axes[AXE_THUMBSTICK_Y];
        let my = -Math.sin(camera.rotation.z)*now.axes[AXE_THUMBSTICK_X] + Math.cos(camera.rotation.z)*now.axes[AXE_THUMBSTICK_Y];
        newPos.x += mx * dt * 0.004;
        newPos.z += my * dt * 0.004;
        player.position.set(newPos.x, newPos.y, newPos.z);
    }
}

let lastTime = 0;
function render(time) {
    if (firstTime && renderer.xr.isPresenting) {
        firstTime = false;
        lastTime = time;
        session = renderer.xr.getSession();
        let i = 0;
        for (const source of session.inputSources) {
            models[i] = buildController(source)
            player.add(models[i++]);
        }
    }
    
    let dt = time - lastTime;
    lastTime = time;

    cube.rotation.y = time * 0.002;
    cube.rotation.x = time * 0.001;
    cube.position.set(0, Math.cos(time * 0.0015)*0.5+1, 0);

    detectCollisions();

    if (session != null) {
        let i = 0;
        for (const source of session.inputSources) {
            let handedness = "right";
            if (source && source.handedness) {
                handedness = source.handedness;
            }
            if (!source.gamepad) continue;
            const now = {
                handedness: handedness,
                buttons: source.gamepad.buttons.map((b) => b.value),
                axes: source.gamepad.axes,
                source: source
            };
            if (i == old.length) old[i] = now;
            try {
                handleController(now, old[i], dt);
                let controller = renderer.xr.getController(i);
                models[i].position.set(controller.position.x, controller.position.y, controller.position.z);
                models[i].rotation.set(controller.rotation.x, controller.rotation.y, controller.rotation.z);
            } catch (err) {
                log("Error handling controller: "+err);
            }
            old[i] = now;
            i++;
        }
    }

    renderer.render(scene, camera);
}