import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/VRButton.js';
import { getModelMaterials, loadModel } from "./js/load.js";

const orderedJoints = [
    ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"],
    ["index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"],
    ["middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"],
    ["ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"],
    ["pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"]
];

let socket = io();
function log(msg) {
    socket.emit("custom/log", msg);
}

export var xrRefSpace;
let boxes_left = [];
let boxes_right = [];
let boxMat = new THREE.MeshBasicMaterial({color: 0x00ff00});
// skeleton for hands
let boxes = { left: boxes_left, right: boxes_right};

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
//renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.5;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

let foxo = null;
loadModel('./resources/map.glb', false, true, scene);
loadModel('./resources/fox.glb', true, true, scene).then(glft => {foxo = glft.scene;});
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

function detectCollisions(mesh) {
    // cubeBounds.intersectsBox(otherBound);
    // cubeBounds.containsBox(otherBound);
    // cubeBounds.containsPoint(point);
    
    let cubeBounds = new THREE.Box3().setFromObject(mesh);
    let groundBox = foxo;
    let groundBound = new THREE.Box3().setFromObject(groundBox);
    return cubeBounds.intersectsBox(groundBound);
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

function addBox(x, y, z, box_list, offset) {
    var geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    // var material = new THREE.MeshBasicMaterial({color: 0xff0000});
    var cube = new THREE.Mesh( geometry, boxMat );
    cube.castShadow = true;
    box_list.push({
        mesh: cube,
        position: [x, y, z],
        offset: offset
    });
}

let lastTime = 0, lastLog = 0;
function render(time, frame) {
    try {
    if (firstTime && renderer.xr.isPresenting) {
        firstTime = false;
        lastTime = time;
        session = renderer.xr.getSession();
        let i = 0;
        for (const source of session.inputSources) {
            models[i] = buildController(source)
            player.add(models[i++]);
        }
        try {
            for (const box of boxes_left) {
                scene.remove(box.mesh);
            }
            for (const box of boxes_right) {
                scene.remove(box.mesh);
            }
            boxes_left = [];
            boxes_right = [];
            boxes = { left: boxes_left, right: boxes_right};
            if (XRHand) {
                for (let i = 0; i <= 24; i++) {
                    addBox(0, 0, 0, boxes_left, i);
                    addBox(0, 0, 0,  boxes_right, i);
                }
            }
            session.requestReferenceSpace('bounded-floor').then((refSpace) => {
                xrRefSpace = refSpace;//.getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: 0, z: 0}));
            });
        } catch (err) {log("Error starting xr: "+err);}
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

    if (session != null) {
        for (let inputSource of session.inputSources) {
            if (!inputSource.hand) {
                continue;
            } else {
                let i = 0;
                for (const finger of orderedJoints) {
                    for (const joint of finger) {
                        let box = boxes[inputSource.handedness][i];
                        let jointPose = null;
                        if (inputSource.hand[box.offset] !== null) {
                            jointPose = frame.getJointPose(inputSource.hand.get(joint), xrRefSpace);
                        }
                        if (jointPose != null) {
                            player.add(box.mesh);
                            box.mesh.position.set(jointPose.transform.position.x, jointPose.transform.position.y, jointPose.transform.position.z);
                            const q = new THREE.Quaternion(jointPose.transform.orientation.x, jointPose.transform.orientation.y, jointPose.transform.orientation.z, jointPose.transform.orientation.w);
                            box.mesh.quaternion.copy(q);
                            box.mesh.scale.set(jointPose.radius, jointPose.radius, jointPose.radius);

                            if (joint == "index-finger-tip") {
                                if (detectCollisions(box.mesh))
                                    boxMat.color = new THREE.Color(255, 0, 0);
                                else boxMat.color = new THREE.Color(0, 255, 0);
                            }

                        } else {
                            scene.remove(box.mesh);
                        }
                        i++;
                    }
                }
            }
        }
        // for (const source of session.inputSources) {
        //     let handedness = "right";
        //     if (source && source.handedness) {
        //         handedness = source.handedness;
        //     }
        //     if (!source.gamepad) continue;
        //     const now = {
        //         handedness: handedness,
        //         buttons: source.gamepad.buttons.map((b) => b.value),
        //         axes: source.gamepad.axes,
        //         source: source
        //     };
        //     if (i == old.length) old[i] = now;
        //     handleController(now, old[i], dt);
        //     let controller = renderer.xr.getController(i);
        //     models[i].position.set(controller.position.x, controller.position.y, controller.position.z);
        //     models[i].rotation.set(controller.rotation.x, controller.rotation.y, controller.rotation.z);
        //     old[i] = now;
        //     i++;
        // }
    }
    } catch(err) {log("Error : "+err);}

    renderer.render(scene, camera);
}