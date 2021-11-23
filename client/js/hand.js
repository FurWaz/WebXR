import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { Error, getScene, getXRSpace, getXRSession, setXRSpace, getXRFrame, log } from "./common.js";

export const JOINT = {
    THUMB_METACARPAL: "thumb-metacarpal",
    THUMB_PHALANX_PROXIMAL: "thumb-phalanx-proximal",
    THUMB_PHALANX_DISTAL: "thumb-phalanx-distal",
    THUMB_TIP: "thumb-tip",
    INDEX_FINGER_METACARPAL: "index-finger-metacarpal",
    INDEX_FINGER_PHALANX_PROXIMAL: "index-finger-phalanx-proximal",
    INDEX_FINGER_PHALANX_INTERMEDIATE: "index-finger-phalanx-intermediate",
    INDEX_FINGER_PHALANX_DISTAL: "index-finger-phalanx-distal",
    INDEX_FINGER_TIP: "index-finger-tip",
    MIDDLE_FINGER_METACARPAL: "middle-finger-metacarpal",
    MIDDLE_FINGER_PHALANX_PROXIMAL: "middle-finger-phalanx-proximal",
    MIDDLE_FINGER_PHALANX_INTERMEDIATE: "middle-finger-phalanx-intermediate",
    MIDDLE_FINGER_PHALANX_DISTAL: "middle-finger-phalanx-distal",
    MIDDLE_FINGER_TIP: "middle-finger-tip",
    RING_FINGER_METACARPAL: "ring-finger-metacarpal",
    RING_FINGER_PHALANX_PROXIMAL: "ring-finger-phalanx-proximal",
    RING_FINGER_PHALANX_INTERMEDIATE: "ring-finger-phalanx-intermediate",
    RING_FINGER_PHALANX_DISTAL: "ring-finger-phalanx-distal",
    RING_FINGER_TIP: "ring-finger-tip",
    PINKY_FINGER_METACARPAL: "pinky-finger-metacarpal",
    PINKY_FINGER_PHALANX_PROXIMAL: "pinky-finger-phalanx-proximal",
    PINKY_FINGER_PHALANX_INTERMEDIATE: "pinky-finger-phalanx-intermediate",
    PINKY_FINGER_PHALANX_DISTAL: "pinky-finger-phalanx-distal",
    PINKY_FINGER_TIP: "pinky-finger-tip"
}

export function jointIndex(j) {
    let i = 0;
    for (const finger of orderedJoints) {
        for (const joint of finger) {
            console.log(joint+" vs "+j);
            if (joint == j) return i;
            i++;
        }
    }
    return -1;
}

export const orderedJoints = [
    ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"],
    ["index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"],
    ["middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"],
    ["ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"],
    ["pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"]
];

export let boxMatLeft = new THREE.MeshBasicMaterial({color: 0x00ff00});
export let boxMatRight = new THREE.MeshBasicMaterial({color: 0x00ff00});
let boxes_left = []; let boxes_right = [];
export let boxes = { left: boxes_left, right: boxes_right};

function addBox(x, y, z, box_list, offset, mat) {
    var geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    var cube = new THREE.Mesh( geometry, mat );
    cube.castShadow = true;
    box_list.push({
        mesh: cube,
        position: [x, y, z],
        offset: offset
    });
}

export function update(player) {
    if (getXRSession() == null) return new Error("XRSession is null");
    for (let inputSource of getXRSession().inputSources) {
        if (!inputSource.hand) continue;
        let i = 0;
        if (getXRSpace() == null) return new Error("no xrspace defined");
        for (const finger of orderedJoints) {
            for (const joint of finger) {
                let box = boxes[inputSource.handedness][i];
                let jointPose = null;
                if (inputSource.hand[box.offset] !== null) {
                    jointPose = getXRFrame().getJointPose(inputSource.hand.get(joint), getXRSpace());
                }
                if (jointPose != null) {
                    player.add(box.mesh);
                    box.mesh.position.set(jointPose.transform.position.x, jointPose.transform.position.y, jointPose.transform.position.z);
                    const q = new THREE.Quaternion(jointPose.transform.orientation.x, jointPose.transform.orientation.y, jointPose.transform.orientation.z, jointPose.transform.orientation.w);
                    box.mesh.quaternion.copy(q);
                    box.mesh.scale.set(jointPose.radius, jointPose.radius, jointPose.radius);
                } else {
                    player.remove(box.mesh);
                }
                i++;
            }
        }
    }
    return Error.NO_ERROR;
}

export function init() {
    try {
        for (const box of boxes_left) {
            getScene().remove(box.mesh);
        }
        for (const box of boxes_right) {
            getScene().remove(box.mesh);
        }
        boxes_left = [];
        boxes_right = [];
        boxes = { left: boxes_left, right: boxes_right};
        if (XRHand) {
            for (let i = 0; i <= 24; i++) {
                addBox(0, 0, 0, boxes_left, i, boxMatLeft);
                addBox(0, 0, 0,  boxes_right, i, boxMatRight);
            }
        }
        return Error.NO_ERROR;
    } catch (err) {
        return new Error(err);
    }
}

export function doesGrab(handedness = "right") {
    let pos1 = boxes[handedness][jointIndex(JOINT.INDEX_FINGER_TIP)].mesh.position;
    let pos2 = boxes[handedness][jointIndex(JOINT.THUMB_TIP)].mesh.position;

    let dx = pos1.x - pos2.x;
    let dy = pos1.y - pos2.y;
    let dz = pos1.z - pos2.z;
    let dist = Math.sqrt( dx*dx + dy*dy + dz*dz );
    return dist < 0.02;
}