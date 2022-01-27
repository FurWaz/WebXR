import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'https://cdn.skypack.dev/three@0.136';

let modelLoader = null;
export function loadModel(url, castShadow, receiveShadow, scene) {
    if (modelLoader == null) modelLoader = new GLTFLoader();
    let callResolve = null, callReject = null;
    let res = new Promise((resolve, reject) => {
        callResolve = resolve;
        callReject = reject;
    });
    modelLoader.load(url, (gltf) => {
        gltf.scene.traverse(node => {
            if (node.isMesh) {
                node.castShadow = castShadow;
                node.receiveShadow = receiveShadow;
            }
            if (node.material) {
                let color = (node.material.color)? node.material.color: null;
                let diff = (node.material.map)? node.material.map: null;
                node.material = new THREE.MeshPhongMaterial({map: diff, color: color});
            }
        });
        scene.add(gltf.scene);
        let mats = getMaterials(gltf);
        callResolve(gltf);
    }, undefined, (err) => {
        callReject(err);
    });
    return res;
}

function getMaterials(model) {
    if (!model.children) return [];
    let tab = [];
    model.children.forEach(child => {
        tab = tab.concat(getMaterials(child));
    });
    if (model.material) tab.push(model.material);
    return tab;
}

export function getModelMaterials(model) {
    return getMaterials(model.scene);
}