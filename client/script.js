import * as THREE from 'https://cdn.skypack.dev/three';
import { VRButton } from 'https://cdn.skypack.dev/three/examples/jsm/webxr/VRButton.js';
import { log, getXRSession, getScene, setScene, setXRFrame, setXRSession, setXRSpace } from './js/common.js';
import { getModelMaterials, loadModel } from './js/load.js';
import * as XRHands from './js/hand.js';
import * as collision from './js/collision.js';
import * as ModifPanel from "./js/modifPanel.js";

setScene(new THREE.Scene());
getScene().background = new THREE.Color(0x051015);

let player = new THREE.Group();
player.position.set(0, 0, 0);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 1);
camera.lookAt(0, 1, 0);
player.add(camera);
getScene().add(player);

const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load("./resources/background.ogg", buff => {
    sound.setBuffer(buff);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
});

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(render);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.5;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

getScene().add(new THREE.AmbientLight(0xffffff, 0.2))
var light = new THREE.PointLight(0xffe5b5, 2, 100);
light.distance = 4;
light.castShadow = true;
light.position.set(0, 2.8, 0);
light.shadow.bias = -0.01;
light.shadow.mapSize.width = 256;
light.shadow.mapSize.height = 256;
getScene().add(light);

var light2 = new THREE.PointLight(0xffefbf, 2, 100);
light2.distance = 2;
light2.position.set(0, 0.42, 0);

let colliders = [];
let matModifiable = [];
let scene = getScene();

loadModel('./resources/map.glb', false, true, scene).then((model => {
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0.2, 5);
    const arr = raycaster.intersectObjects(getScene().children);
    console.log(arr);
}));
loadModel('./resources/logo.glb', false, true, scene);
loadModel('./resources/books.glb', true, true, scene);
loadModel('./resources/shelf.glb', true, true, scene);
loadModel('./resources/fox.glb', true, true, scene).then(model => {
    model.scene.position.set(-1.1, 1.07, 1.75);
    colliders.push(model.scene);
});
loadModel('./resources/seat.glb', true, true, scene).then(model => {
    model.scene.position.set(-2.12, 0, -1.3);
    let m = getModelMaterials(model)[1];
    m.color = new THREE.Color(0x424B63);
    matModifiable.push({mesh: model.scene, mat: m});
});
loadModel('./resources/carpet.glb', false, true, scene).then(model => {
    let m = getModelMaterials(model)[0];
    m.color = new THREE.Color(0x424B63);
    matModifiable.push({mesh: model.scene, mat: m});
});
loadModel('./resources/lamp.glb', true, true, scene).then(model => {
    model.scene.position.set(-1.67, 1.1, 1.76);
    model.scene.add(light2);
    getModelMaterials(model)[1].side = THREE.DoubleSide;
    colliders.push(model.scene);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

let rayBox = new THREE.Mesh(
    new THREE.SphereBufferGeometry(0.01),
    new THREE.MeshBasicMaterial({color: 0xffffff})
);
scene.add(rayBox);

try {
    ModifPanel.init();
    ModifPanel.hideMenu();
} catch (err) {log("Error runtime: "+err)}

let firstTime = true;
let lastTime = 0, logTime = 0;
let spreadTimeout = 500;
let pointTimeout = 500;
function render(time, frame) {
    setXRFrame(frame);
    try {
        let dt = time - lastTime;
        lastTime = time;
        if (logTime + 1000 < time) {
            logTime = time;
        }

        if (firstTime && renderer.xr.isPresenting) {
            firstTime = false;
            lastTime = time;
            setXRSession(renderer.xr.getSession());
            getXRSession().requestReferenceSpace('bounded-floor').then((refSpace) => {
                log("setting xr space");
                setXRSpace(refSpace);
            });
            XRHands.init().displayIfError();
        }
        
        if (!renderer.xr.isPresenting) {
            camera.position.set(1, 1.5, 0)
            camera.lookAt(Math.cos(time*0.0005)*.2, 1.2, Math.sin(time*0.0005)*.1);
        }

        if (getXRSession() != null) {
            XRHands.update(player, time).displayIfError();
            for (const handedness of ["left", "right"]) {
                const grabbing = XRHands.doesGrab(handedness);
                const pointing = XRHands.doesPoint(handedness);
                const spreading = XRHands.doesSpread(handedness);
                const moving = XRHands.isMoving(handedness);
                const fingerBox = XRHands.boxes[handedness][XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_TIP)].mesh;
                const handBox = XRHands.boxes[handedness][XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_PHALANX_PROXIMAL)].mesh;
                fingerBox.material.color = new THREE.Color(0xffffff);
                if (grabbing) fingerBox.material.color = new THREE.Color(0xff0000);
                if (spreading) fingerBox.material.color = new THREE.Color(0x0000ff);
                else spreadTimeout = 500;
                if (pointing) fingerBox.material.color = new THREE.Color(0x00ff00);
                //else pointTimeout = 500;

                // release object in hand
                if (!grabbing) {
                    XRHands[handedness].target.obj = null;
                    XRHands[handedness].target.startPos = null;
                    XRHands[handedness].target.startRot = null;
                    XRHands[handedness].startPos = null;
                    XRHands[handedness].startRot = null;
                }

                // check for object grabbing
                for (const item of colliders) {
                    if (XRHands[handedness].target.obj != null) break;
                    if (grabbing && collision.intersectsBox(fingerBox, item)) {
                        XRHands[handedness].target.obj = item;
                        XRHands[handedness].target.startPos = item.position.clone();
                        XRHands[handedness].target.startRot = new THREE.Quaternion().setFromEuler(item.rotation);
                        XRHands[handedness].startPos = handBox.position.clone();
                        XRHands[handedness].startRot = new THREE.Quaternion().setFromEuler(handBox.rotation);
                    }
                }

                // move the object grabbed
                if (XRHands[handedness].target.obj != null) {
                    let newPos = handBox.position.clone().add(player.position);
                    let handRot = new THREE.Quaternion().setFromEuler(handBox.rotation);
                    let deltaRot = handRot.multiply(XRHands[handedness].startRot.clone().invert());
                    let newRot = deltaRot.multiply(XRHands[handedness].target.startRot);

                    XRHands[handedness].target.obj.position.set(newPos.x, newPos.y, newPos.z);
                    XRHands[handedness].target.obj.quaternion.copy(newRot);
                }

                // basic teleportation (if hand in right position, teleport 1m forward)
                if (spreading && !moving && spreadTimeout <= 0 && handedness == "right") {
                    if (spreadTimeout > 0) spreadTimeout -= dt
                    else {
                        spreadTimeout += 500;
                        let newPos = {x: player.position.x-Math.sin(camera.rotation.z), y: player.position.y, z: player.position.z-Math.cos(camera.rotation.z)};
                        player.position.set(newPos.x, newPos.y, newPos.z);
                    }
                }
                scene.remove(rayBox);
                if (handedness == "right" && pointing) {
                    scene.add(rayBox);
                    const oldPos = fingerBox.position.clone();
                    fingerBox.translateZ(-1);
                    const newPos = fingerBox.position.clone();
                    fingerBox.translateZ(1);
                    const direction = newPos.sub(oldPos);
                    const raycaster = new THREE.Raycaster(fingerBox.position.add(player.position), direction, 0.2, 5);
                    const arr = raycaster.intersectObjects(getScene().children);
                    if (arr.length > 0) {
                        let i = 0;
                        let obji = 0;
                        let found = null;
                        while (!found) {
                            if (i == arr.length) break;
                            const obj = arr[i].object;
                            i++;
                            if (obj == rayBox) continue;
                            obji = i-1;
                            for (const matmod of matModifiable) {
                                let matches = false;
                                matmod.mesh.traverse(node => {
                                    if (node.isMesh && node == obj)
                                        matches = true;
                                })
                                if (matches) {
                                    found = matmod;
                                    break;
                                }
                            }
                        }
                        let pos = arr[obji].point;
                        rayBox.position.set(pos.x, pos.y, pos.z);
                        rayBox.material.color = new THREE.Color(0xffffff);
                        if (found != null) {
                            rayBox.material.color = new THREE.Color(0x00ff00+pointTimeout);
                            pointTimeout -= dt;
                        }
                        if (pointTimeout <= 0 && found != null) {
                            ModifPanel.showMenu();
                            XRHands.setObjectSelected(found);
                            pointTimeout = 500;
                        }
                    }
                }
            }
            ModifPanel.update(dt);
        }
    } catch(err) {log("Error: "+err)}
    renderer.render(scene, camera);
}