import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';

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
        });
        scene.add(gltf.scene);
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