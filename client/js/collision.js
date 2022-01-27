import * as THREE from 'https://cdn.skypack.dev/three@0.136';

export function intersectsBox(target, mesh) {
    let meshBounds = new THREE.Box3().setFromObject(mesh);
    let targetBounds = new THREE.Box3().setFromObject(target);
    return meshBounds.intersectsBox(targetBounds);
}

export function containsBox(target, mesh) {
    let meshBounds = new THREE.Box3().setFromObject(mesh);
    let targetBounds = new THREE.Box3().setFromObject(target);
    return meshBounds.containsBox(targetBounds);
}

export function containsPoint(point, mesh) {
    let meshBounds = new THREE.Box3().setFromObject(mesh);
    return meshBounds.containsPoint(point);
}