import * as THREE from 'https://cdn.skypack.dev/three';
import { getCamera, getInput, getPlayer, getScene, getXRFrame, getXRSession, getXRSpace, log } from "./common.js";
import { loadModel } from "./load.js";

const GAMEPAD = {
    BUTTON_TRIGGER: 0,
    BUTTON_SQUEEZE: 1,
    BUTTON_TOUCHPAD: 2,
    BUTTON_THUMBSTICK: 3,
    AXE_TOUCHPAD_X: 0,
    AXE_TOUCHPAD_Y: 1,
    AXE_THUMBSTICK_X: 2,
    AXE_THUMBSTICK_Y: 3
};

export let controllers = {
    left: {model: null, visible: false, target: null},
    right: {model: null, visible: false, target: null}
}

export function isGrabbing(ctrl) {
    if (ctrl.state == null) return false;
    return ctrl.state.buttons[GAMEPAD.BUTTON_SQUEEZE] > 0.75;
}

export function isPointing (ctrl) {
    if (ctrl.state == null) return false;
    return ctrl.state.buttons[GAMEPAD.BUTTON_TRIGGER] > 0;
}

export function isPressing (ctrl) {
    if (ctrl.state == null) return false;
    return ctrl.state.buttons[GAMEPAD.BUTTON_TRIGGER] > 0.75;
}

export function vibrate(ctrl, amount, time) {
    if (ctrl.state == null) return false;
    if (!ctrl.state.source.gamepad.hapticActuators) return false;
    ctrl.state.source.gamepad.hapticActuators[0].pulse(amount, time);
    return true;
}

export let left = {
    target: {
        obj: null,
        startPos: null,
        startRot: null
    },
    startPos: null,
    startRot: null,
    state: null,
    visible: false
}

export let right = {
    target: {
        obj: null,
        startPos: null,
        startRot: null
    },
    startPos: null,
    startRot: null,
    state: null,
    visible: false
}

export function init() {
    for (const source of getXRSession().inputSources) {
        if (!source.gamepad) continue;
        loadModel("./resources/quest_"+source.handedness+".glb", true, true, getScene()).then(m => {
            m.scene.traverse(n => {
                if (n.material) n.material = new THREE.MeshBasicMaterial({color: n.material.color.clone()});
            });
            controllers[source.handedness] = {
                model: m.scene,
                visible: false
            };
            getPlayer().add(controllers[source.handedness].model);
        });
    }
}

function handleController(now, dt) {
    let camera = getCamera();
    let player = getPlayer();
    (now.handedness == "right")? right.state = now: left.state = now;
    if (now.handedness == "left") {
        let newPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        let mx =  Math.cos(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_X] 
                 +Math.sin(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_Y];
        let my = -Math.sin(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_X] 
                 +Math.cos(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_Y];
        newPos.x += mx * dt * 0.001;
        newPos.z += my * dt * 0.001;
        player.position.copy(newPos);
    }
}

export function update(dt) {
    if (getInput() == "hands") {
        if (controllers.left != null) getScene().remove(controllers.left.model);
        if (controllers.right != null) getScene().remove(controllers.right.model);
        return;
    }
    let space = getXRSpace();
    if (space == null || space == undefined) return new Error("no xrspace defined");
    if (controllers.left != null) controllers.left.visible = false;
    if (controllers.right != null) controllers.right.visible = false;
    let player = getPlayer();
    let session = getXRSession();
    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        let handedness = source.handedness;
        if (controllers[handedness] == null) continue;
        controllers[handedness].visible = true;
        const now = {
            handedness: handedness,
            buttons: source.gamepad.buttons.map((b) => b.value),
            axes: source.gamepad.axes,
            source: source
        };
        handleController(now, dt);
        if (source.gripSpace) {
            let gripPose = getXRFrame().getPose(source.gripSpace, space);
            if (gripPose) {
                let controller = {
                    position: new THREE.Vector3(gripPose.transform.position.x + player.position.x, gripPose.transform.position.y + player.position.y, gripPose.transform.position.z + player.position.z),
                    quaternion: new THREE.Quaternion(gripPose.transform.orientation.x, gripPose.transform.orientation.y, gripPose.transform.orientation.z, gripPose.transform.orientation.w),
                };
                if (controllers[handedness].model != null) {
                    controllers[handedness].model.position.copy(controller.position);
                    controllers[handedness].model.quaternion.copy(controller.quaternion);
                }
            }
        }
    }
    if (controllers.left != null) {
        if (controllers.left.visible) getScene().add(controllers.left.model);
        else getScene().remove(controllers.left.model);
    }
    if (controllers.right != null) {
        if (controllers.right.visible) getScene().add(controllers.right.model);
        else getScene().remove(controllers.right.model);
    }
}