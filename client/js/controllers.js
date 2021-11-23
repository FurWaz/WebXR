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

let i = 0;
for (const source of session.inputSources) {
    models[i] = buildController(source)
    player.add(models[i++]);
}

function handleController(now, old, dt) {
    if (now.source.gamepad.hapticActuators)
        now.source.gamepad.hapticActuators[0].pulse(now.buttons[GAMEPAD.BUTTON_TRIGGER], 40);
    if (now.handedness == "left") {
        let newPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        let mx =  Math.cos(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_X] 
                 +Math.sin(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_Y];
        let my = -Math.sin(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_X] 
                 +Math.cos(camera.rotation.z)*now.axes[GAMEPAD.AXE_THUMBSTICK_Y];
        newPos.x += mx * dt * 0.004;
        newPos.z += my * dt * 0.004;
        player.position.set(newPos.x, newPos.y, newPos.z);
    }
}

function update() {
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
        handleController(now, old[i], dt);
        let controller = renderer.xr.getController(i);
        models[i].position.set(controller.position.x, controller.position.y, controller.position.z);
        models[i].rotation.set(controller.rotation.x, controller.rotation.y, controller.rotation.z);
        old[i] = now;
        i++;
    }
}