import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/VRButton.js';
import { log, getXRSession, getScene, setScene, setXRFrame, setXRSession, setXRSpace } from './js/common.js';
import { getModelMaterials, loadModel } from "./js/load.js";
import * as XRHands from './js/hand.js';

// TODO: Importer les trucs pour faire des controllers VR (dans le fichier ./js/controllers.js)

let firstTime = true;
setScene(new THREE.Scene());
getScene().background = new THREE.Color(0x051015);

let player = new THREE.Group();
player.position.set(0, 0, 0);

let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 0);
camera.lookAt(0, 1, -2);
player.add(camera);
getScene().add(player);

getScene().add(new THREE.AmbientLight(0xffffff, 0.2))
var light = new THREE.PointLight(0xffe5b5, 2, 100);
light.distance = 5;
light.castShadow = true;
light.position.set(0, 2.8, 0);
light.shadow.bias = -0.0001;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
getScene().add(light);

var light2 = new THREE.PointLight(0xffefbf, 2, 100);
light2.distance = 2;
light2.castShadow = true;
light2.position.set(0, 0.42, 0);
light2.shadow.bias = -0.00001;
light2.shadow.mapSize.width = 256;
light2.shadow.mapSize.height = 256;

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

let foxo = null, lamp = null;
let scene = getScene();
loadModel('./resources/map.glb', false, true, scene);
loadModel('./resources/fox.glb', true, true, scene).then(glft => {foxo = glft.scene; foxo.position.set(1, 0, 0);});
//loadModel('./resources/seat.glb', true, true, scene).then(model => {getModelMaterials(model)[1].color = new THREE.Color(0x424B63);});
loadModel('./resources/logo.glb', true, true, scene);
loadModel('./resources/carpet.glb', true, true, scene).then(model => {getModelMaterials(model)[0].color = new THREE.Color(0x424B63);});
loadModel('./resources/books.glb', true, true, scene);
loadModel('./resources/lamp.glb', true, true, scene).then(model => {model.scene.add(light2); lamp = model.scene;});
loadModel('./resources/shelf.glb', true, true, scene);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

function detectCollisions(target, mesh) {
    // cubeBounds.intersectsBox(otherBound);
    // cubeBounds.containsBox(otherBound);
    // cubeBounds.containsPoint(point);
    
    let cubeBounds = new THREE.Box3().setFromObject(mesh);
    let groundBound = new THREE.Box3().setFromObject(target);
    return cubeBounds.intersectsBox(groundBound);
}

let lastTime = 0;
function render(time, frame) {
    setXRFrame(frame);
    try {
        let dt = time - lastTime;
        lastTime = time;

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
            camera.position.set(2, 1.5, 0)
            camera.lookAt(Math.cos(time*0.0005)*.2, 0.5, Math.sin(time*0.0005)*.1)
        }

        if (getXRSession() != null) {
            XRHands.update(player).displayIfError();
            
            if (XRHands.doesGrab("left")) {
                let hand = XRHands.boxes.left[XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_TIP)].mesh;
                if (detectCollisions(foxo, hand)) {
                    foxo.position.set(hand.position.x, hand.position.y, hand.position.z);
                    foxo.rotation.set(hand.rotation.x, hand.rotation.y, hand.rotation.z);
                }
                if (detectCollisions(lamp, hand)) {
                    lamp.position.set(hand.position.x, hand.position.y, hand.position.z);
                    lamp.rotation.set(hand.rotation.x, hand.rotation.y, hand.rotation.z);
                }
            }
            if (XRHands.doesGrab("right")) {
                let hand = XRHands.boxes.right[XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_TIP)].mesh;
                if (detectCollisions(foxo, hand)) {
                    foxo.position.set(hand.position.x, hand.position.y, hand.position.z);
                    foxo.rotation.set(hand.rotation.x, hand.rotation.y, hand.rotation.z);
                }
                if (detectCollisions(lamp, hand)) {
                    lamp.position.set(hand.position.x, hand.position.y, hand.position.z);
                    lamp.rotation.set(hand.rotation.x, hand.rotation.y, hand.rotation.z);
                }
            }
        }
    } catch(err) {log("Error : "+err);}
    renderer.render(scene, camera);
}