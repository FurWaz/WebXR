import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';
//import { GLTFLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/loaders/GLTFLoader.js';

let socket = io();
function log(msg) {
    socket.emit("custom/log", msg);
}

log("Libraries imported successfully");

let session = null;
let old = [];
let models = [];
let texLoader = new THREE.TextureLoader();
let gltfLoader = new GLTFLoader();
let firstTime = true;
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x50B0F0);

let player = new THREE.Group();
player.position.set(0, 0, 2);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 2);
camera.lookAt(0, 1, -2);
player.add(camera);
scene.add(player);

var light = new THREE.SpotLight(0xffffff, 3, 100);
light.penumbra = 0.02;
light.distance = 4;
light.angle = 2;
light.castShadow = true;
light.position.set(0, 1.5, 0);
light.target.position.set(0, 0, 0);
scene.add(light);
// light.shadow.bias = -0.002;
// light.shadow.mapSize.width = 1024; // default
// light.shadow.mapSize.height = 1024; // default=
// light.shadow.camera.near = 0.5; // default
// light.shadow.camera.far = 100; // default

scene.add(new THREE.AmbientLight(0xffffff, 0.2))

// let cube = new THREE.Mesh(
//     new THREE.BoxBufferGeometry(0.5, 0.5, 0.5),
//     new THREE.MeshStandardMaterial({
//         map: texLoader.load("./resources/squares/diff.jpg")
//     })
// );
// cube.castShadow = true;
// cube.receiveShadow = true;
// scene.add(cube);

// let plane = new THREE.Mesh(
//     new THREE.PlaneBufferGeometry(4, 4),
//     new THREE.MeshStandardMaterial({
//         map: texLoader.load("./resources/floor/diff.jpg")
//     })
// );
// plane.castShadow = true;
// plane.receiveShadow = true;
// plane.rotation.set(-1.57, 0, 0);
// scene.add(plane);

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(render);
// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.5;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

// const helper = new THREE.CameraHelper( light.shadow.camera );
// scene.add( helper );

gltfLoader.load( './resources/map.glb', gltf => {
    gltf.scene.traverse(node => {
        if (node.isMesh) {
            //node.castShadow = true;
            //node.receiveShadow = true;
        }
    });
    scene.add(gltf.scene);
}, undefined, function ( error ) {
	console.error( error );
});

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
    // cube.castShadow = true;
    // cube.receiveShadow = true;
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
    log(1000/dt);
    // cube.rotation.y = time * 0.001;
    // cube.rotation.x = time * 0.0006;
    if (!renderer.xr.isPresenting) {
        camera.position.set(0, 1.5, -2)
        camera.lookAt(Math.cos(time*0.0001), 1.2, Math.sin(time*0.0001))
    }
    
    // cube.position.set(0, Math.cos(time * 0.0015)*0.2+0.5, -1.5);

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