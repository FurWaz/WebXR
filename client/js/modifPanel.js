import * as THREE from 'https://cdn.skypack.dev/three';
import { FontLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.skypack.dev/three/examples/jsm/geometries/TextGeometry.js';
import { getInput, getPlayer, log } from './common.js';
import * as XRHands from './hand.js';
import * as Controllers from './controllers.js';

const FONT_URL = "https://cdn.skypack.dev/three/examples/fonts/helvetiker_regular.typeface.json";

let panelGroup = null;
let fontParams = {
    font: null,
    size: 0.015,
    height: 0.001
};
export let isOpen = false;
let panelButtons = [];
let loader = new FontLoader();
export function init() {
    panelGroup = new THREE.Group();
    panelGroup.add(new THREE.Mesh(
        new THREE.BoxBufferGeometry(0.002, 0.3, 0.3),
        new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.2, transparent: true})
    ));
    getPlayer().add(panelGroup);
    loader.load(FONT_URL, font => {
        fontParams.font = font;
        const textGeometry = new TextGeometry("Selectionnez une couleur:", fontParams)
        textGeometry.computeBoundingBox();
        textGeometry.center();
        const textMesh = new THREE.Mesh(textGeometry, new THREE.MeshBasicMaterial({color: "white"}));
        textMesh.rotation.y = 1.57;
        textMesh.position.set(0, -0.07, 0);
        panelGroup.add(textMesh);
    });

    let colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0x00ffff];
    let blockSize = 0.28 / colors.length;
    let shift = -0.12;
    for (const col of colors) {
        let mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(blockSize-0.01, blockSize-0.01, blockSize*0.1),
            new THREE.MeshBasicMaterial({color: col})
        );
        mesh.position.set(0, -0.14+blockSize/2, shift);
        mesh.rotation.y = 1.57;
        panelGroup.add(mesh);
        let isSelected = false;
        panelButtons.push({mesh: mesh, selected: isSelected, callback: ()=> {
            if (isSelected) return;
            let color = mesh.material.color.clone();
            isSelected = true;
            setTimeout(() => {
                isSelected = false;
                mesh.material.color = color;
            }, 500);
            mesh.material.color = new THREE.Color(0xffffff);
            hideMenu();
            if (XRHands.objectSelected == null) return;
            if (XRHands.objectSelected.mat) {
                XRHands.objectSelected.mat.color = color;
            }
        }});
        shift += blockSize;
    }
}

export function showMenu() {
    isOpen = true;
    getPlayer().add(panelGroup);
}

export function hideMenu() {
    isOpen = false;
    getPlayer().remove(panelGroup);
}

export function update(dt) {
    try {
    let refBox = (getInput() == "hands")?
        XRHands.boxes.left[XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_PHALANX_PROXIMAL)].mesh:
        Controllers.controllers.left.model;
    refBox.translateY(0.2);
    let newPos = {
        x: (refBox.position.x - panelGroup.position.x) * (dt/100),
        y: (refBox.position.y - panelGroup.position.y) * (dt/100),
        z: (refBox.position.z - panelGroup.position.z) * (dt/100)
    };
    refBox.translateY(-0.2);
    let newRot = {
        x: (refBox.quaternion.x - panelGroup.quaternion.x) * (dt/100),
        y: (refBox.quaternion.y - panelGroup.quaternion.y) * (dt/100),
        z: (refBox.quaternion.z - panelGroup.quaternion.z) * (dt/100),
        w: (refBox.quaternion.w - panelGroup.quaternion.w) * (dt/100)
    };

    panelGroup.position.set(
        panelGroup.position.x + newPos.x,
        panelGroup.position.y + newPos.y,
        panelGroup.position.z + newPos.z
    );
    panelGroup.quaternion.set(
        panelGroup.quaternion.x + newRot.x,
        panelGroup.quaternion.y + newRot.y,
        panelGroup.quaternion.z + newRot.z,
        panelGroup.quaternion.w + newRot.w
    );

    //check for button collision with finger
    if (isOpen) {
        if (getInput() == "hands") {
            let finger = XRHands.boxes.right[XRHands.jointIndex(XRHands.JOINT.INDEX_FINGER_TIP)].mesh;
            let bounds = new THREE.Box3().setFromObject(finger);
            for (const btn of panelButtons) {
                let btnBounds = new THREE.Box3().setFromObject(btn.mesh);
                let res = btnBounds.intersectsBox(bounds);
                if (res) {
                    btn.callback();
                    break;
                }
            }
        } else {
            if (Controllers.controllers.right.target == null || !Controllers.isPointing(Controllers.right)) return;
            let bounds = new THREE.Box3().setFromObject(Controllers.controllers.right.target);
            for (const btn of panelButtons) {
                let btnBounds = new THREE.Box3().setFromObject(btn.mesh);
                let res = btnBounds.intersectsBox(bounds);
                if (res) {
                    btn.callback();
                    Controllers.vibrate(Controllers.right, 1, 45);
                    break;
                }
            }
        }
    }
    } catch(err) {log("update err: "+err)}
}