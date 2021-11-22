import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/VRButton.js';
import { getModelMaterials, loadModel } from "./js/load.js";

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
scene.background = new THREE.Color(0x051015);

let player = new THREE.Group();
player.position.set(0, 0, 0);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 0);
camera.lookAt(0, 1, -2);
player.add(camera);
scene.add(player);

var light = new THREE.SpotLight(0xfff4d9, 2.5, 100);
light.penumbra = 0.5;
light.distance = 5;
light.angle = 1.5;
light.castShadow = true;
light.position.set(0, 2.8, 0);
light.target.position.set(0, 0, 0);
light.shadow.bias = -0.01;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 0.2))

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(render);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.5;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;


loadModel('./resources/map.glb', false, true, scene);
loadModel('./resources/fox.glb', true, true, scene);
loadModel('./resources/seat.glb', true, true, scene).then(model => {getModelMaterials(model)[1].color = new THREE.Color(0x424B63);});
loadModel('./resources/logo.glb', true, true, scene);
loadModel('./resources/carpet.glb', true, true, scene).then(model => {getModelMaterials(model)[0].color = new THREE.Color(0x424B63);});
loadModel('./resources/books.glb', true, true, scene);
loadModel('./resources/lamp.glb', true, true, scene);
loadModel('./resources/shelf.glb', true, true, scene);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

function buildController(data) {
    let cube = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(0.02, 0.02, 0.1, 12),
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

function detectCollisions() {
    // cubeBounds.intersectsBox(otherBound);
    // cubeBounds.containsBox(otherBound);
    // cubeBounds.containsPoint(point);
    
    // let cubeBounds = new THREE.Box3().setFromObject(cube);
    // let groundBox = new THREE.Mesh(
    //     new THREE.BoxBufferGeometry(2, 1, 2)
    // );
    // groundBox.position.set(0, -0.5, 0);
    // let groundBound = new THREE.Box3().setFromObject(groundBox);
    // let result = cubeBounds.intersectsBox(groundBound);
}

function handleController(now, old, dt) {
    if (now.source.gamepad.hapticActuators)
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

let lastTime = 0, lastLog = 0;
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
    if (lastLog + 1000 < time) {
        lastLog = time;
        log(1000/dt);
    }

    if (!renderer.xr.isPresenting) {
        camera.position.set(2, 1.5, 0)
        camera.lookAt(Math.cos(time*0.001)*.2, 1.1, Math.sin(time*0.001)*.1)
    }

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