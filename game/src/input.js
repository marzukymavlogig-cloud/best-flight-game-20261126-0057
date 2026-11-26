// Golden Hour Skies — keyboard and mouse.
// One clear job: turn keys and clicks into pilot inputs and menu actions.
// The game polls `read()` each frame; menu clicks are delivered as callbacks.
export function createInput() {
  const keys = new Set();
  const state = {
    pitch: 0, // -1..1, nose up positive
    roll: 0, // -1..1, right wing down positive
    throttleDelta: 0, // per-frame change request, set by keys held
    mouseSteer: 0, // -1..1 from click-to-steer, decays on its own
    mousePitch: 0,
  };
  let onAction = null; // (action) => void, set by the game for one-shot keys
  let onMenuClick = null; // (x, y) => void, set by the game for menu buttons

  function keydown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(e.code);
    const once = {
      KeyF: 'flaps',
      KeyG: 'gear',
      KeyP: 'pause',
      KeyR: 'restart',
      KeyM: 'mute',
      Enter: 'confirm',
      Digit1: 'mission1',
      Digit2: 'mission2',
      Digit3: 'mission3',
      Escape: 'back',
    }[e.code];
    if (once && onAction) onAction(once);
  }
  function keyup(e) {
    keys.delete(e.code);
  }
  function blur() {
    keys.clear();
  }

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);

  function pointerDown(e) {
    if (onMenuClick) onMenuClick(e.clientX, e.clientY);
  }
  window.addEventListener('pointerdown', pointerDown);

  return {
    state,
    setActionHandler(fn) {
      onAction = fn;
    },
    setMenuClickHandler(fn) {
      onMenuClick = fn;
    },
    /** Recompute the held-key inputs for this frame. Call once per frame. */
    poll(dt) {
      const up = keys.has('ArrowUp') || keys.has('KeyI');
      const down = keys.has('ArrowDown') || keys.has('KeyK');
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      const thrUp = keys.has('KeyW') || keys.has('ShiftLeft') || keys.has('ShiftRight');
      const thrDown = keys.has('KeyS') || keys.has('ControlLeft') || keys.has('ControlRight');
      state.pitch = (up ? 1 : 0) + (down ? -1 : 0) + state.mousePitch;
      state.roll = (right ? 1 : 0) + (left ? -1 : 0) + state.mouseSteer;
      state.pitch = Math.max(-1, Math.min(1, state.pitch));
      state.roll = Math.max(-1, Math.min(1, state.roll));
      state.throttleDelta = (thrUp ? 0.55 : 0) + (thrDown ? -0.55 : 0);
      state.throttleDelta *= dt;
      // Click-to-steer eases back to level when the pilot lets go.
      state.mouseSteer *= Math.max(0, 1 - dt * 1.4);
      state.mousePitch *= Math.max(0, 1 - dt * 1.4);
    },
    /** Drag steering: pointer x relative to screen centre banks the plane. */
    steerFromPointer(x, width, y, height) {
      state.mouseSteer = Math.max(-1, Math.min(1, (x - width / 2) / (width / 3)));
      state.mousePitch = Math.max(-1, Math.min(1, (height / 2 - y) / (height / 3)));
    },
    isDown(code) {
      return keys.has(code);
    },
  };
}
