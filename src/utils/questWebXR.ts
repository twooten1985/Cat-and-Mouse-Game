import { Direction } from '../types/game';

// Minimal WebXR DOM type declarations so TypeScript builds without external @types/webxr
interface XRSystemLike {
  isSessionSupported: (mode: 'immersive-vr' | 'inline') => Promise<boolean>;
  requestSession: (
    mode: 'immersive-vr' | 'inline',
    init?: { optionalFeatures?: string[] }
  ) => Promise<XRSessionLike>;
}

interface XRQuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface XRViewLike {
  eye: 'left' | 'right' | 'none';
  transform: { orientation: XRQuaternionLike };
}

interface XRViewerPoseLike {
  transform: { orientation: XRQuaternionLike };
  views: XRViewLike[];
}

interface XRWebGLLayerLike {
  framebuffer: WebGLFramebuffer | null;
  getViewport: (
    view: XRViewLike
  ) => { x: number; y: number; width: number; height: number } | undefined;
}

interface XRInputSourceLike {
  handedness: 'left' | 'right' | 'none';
  gamepad?: Gamepad & {
    hapticActuators?: { pulse: (value: number, duration: number) => Promise<boolean> }[];
  };
}

export interface XRSessionLike {
  inputSources: Iterable<XRInputSourceLike>;
  renderState: { baseLayer?: XRWebGLLayerLike };
  updateRenderState: (state: { baseLayer: XRWebGLLayerLike }) => void;
  requestReferenceSpace: (type: 'local' | 'local-floor') => Promise<unknown>;
  requestAnimationFrame: (
    cb: (time: number, frame: XRFrameLike) => void
  ) => number;
  end: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

interface XRFrameLike {
  getViewerPose: (refSpace: unknown) => XRViewerPoseLike | null;
}

declare global {
  interface Navigator {
    xr?: XRSystemLike;
  }
}

function quaternionToYaw(q: XRQuaternionLike): number {
  const sinyCosp = 2 * (q.w * q.y + q.x * q.z);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(sinyCosp, cosyCosp);
}

export async function isQuestWebXRSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

export interface QuestInputCallbacks {
  onDirection: (dir: Direction, isTurnGated: boolean) => void;
  onForwardHold?: (holding: boolean) => void;
  onTogglePause: () => void;
  onRecenterHead?: () => void;
  onExitVR?: () => void;
}

export class StandardGamepadPoller {
  private lastDir: Direction = 'NONE';
  private prevPausePressed = false;
  private prevUturnPressed = false;
  private prevForwardPressed = false;

  poll(callbacks: QuestInputCallbacks, firstPersonMode: boolean) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    if (!pads) return;

    let dir: Direction = 'NONE';
    let pausePressed = false;
    let uturnPressed = false;
    let forwardPressed = false;

    for (const pad of pads) {
      if (!pad || !pad.connected) continue;

      // Support both primary stick (axes 0,1) and secondary/Quest XR stick (axes 2,3)
      const ax0 = pad.axes[0] ?? 0;
      const ay0 = pad.axes[1] ?? 0;
      const ax2 = pad.axes[2] ?? 0;
      const ay2 = pad.axes[3] ?? 0;
      const x = Math.abs(ax2) > Math.abs(ax0) ? ax2 : ax0;
      const y = Math.abs(ay2) > Math.abs(ay0) ? ay2 : ay0;

      const deadzone = 0.38;
      if (Math.abs(x) >= deadzone || Math.abs(y) >= deadzone) {
        if (Math.abs(x) > Math.abs(y)) {
          dir = x > 0 ? 'RIGHT' : 'LEFT';
        } else {
          dir = y > 0 ? 'DOWN' : 'UP';
        }
      }

      // Standard Gamepad D-Pad fallback (buttons 12..15)
      if (pad.buttons[12]?.pressed) dir = 'UP';
      else if (pad.buttons[13]?.pressed) dir = 'DOWN';
      else if (pad.buttons[14]?.pressed) dir = 'LEFT';
      else if (pad.buttons[15]?.pressed) dir = 'RIGHT';

      // Quest A / X / Trigger (buttons 0, 2, 4) -> Forward / Confirm
      if (
        pad.buttons[0]?.pressed ||
        pad.buttons[2]?.pressed ||
        pad.buttons[4]?.pressed
      ) {
        forwardPressed = true;
      }

      // Quest B / Grip (buttons 1) -> U-Turn in 1st-person
      if (pad.buttons[1]?.pressed) {
        uturnPressed = true;
      }

      // Quest Y / Start / Menu (buttons 3, 5, 9) -> Pause
      if (
        pad.buttons[3]?.pressed ||
        pad.buttons[5]?.pressed ||
        pad.buttons[9]?.pressed
      ) {
        pausePressed = true;
      }
    }

    if (pausePressed && !this.prevPausePressed) {
      callbacks.onTogglePause();
    }
    this.prevPausePressed = pausePressed;

    if (firstPersonMode && uturnPressed && !this.prevUturnPressed) {
      callbacks.onDirection('DOWN', true);
    }
    this.prevUturnPressed = uturnPressed;

    const holdingForward = firstPersonMode && (forwardPressed || dir === 'UP');
    callbacks.onForwardHold?.(holdingForward);
    if (firstPersonMode && forwardPressed && !this.prevForwardPressed) {
      callbacks.onDirection('UP', true);
    }
    this.prevForwardPressed = forwardPressed;

    if (dir !== this.lastDir) {
      this.lastDir = dir;
      if (dir !== 'NONE') {
        callbacks.onDirection(dir, firstPersonMode);
      } else if (firstPersonMode) {
        callbacks.onDirection('NONE', true);
      }
    } else if (!firstPersonMode && dir !== 'NONE') {
      callbacks.onDirection(dir, false);
    }
  }
}

export function pulseStandardGamepads(intensity: number, durationMs: number) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  if (!pads) return;
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    const anyPad = pad as Gamepad & {
      vibrationActuator?: {
        playEffect?: (
          type: string,
          params: {
            duration: number;
            strongMagnitude: number;
            weakMagnitude: number;
          }
        ) => Promise<string>;
      };
      hapticActuators?: {
        pulse: (value: number, duration: number) => Promise<boolean>;
      }[];
    };
    if (anyPad.vibrationActuator?.playEffect) {
      void anyPad.vibrationActuator
        .playEffect('dual-rumble', {
          duration: durationMs,
          strongMagnitude: intensity,
          weakMagnitude: intensity * 0.8,
        })
        .catch(() => {});
    } else if (anyPad.hapticActuators?.[0]?.pulse) {
      void anyPad.hapticActuators[0]
        .pulse(intensity, durationMs)
        .catch(() => {});
    }
  }
}

export interface QuestXRController {
  session: XRSessionLike;
  pulseHaptics: (intensity: number, durationMs: number) => void;
  end: () => Promise<void>;
}

declare global {
  interface Window {
    XRWebGLLayer?: new (
      session: XRSessionLike,
      gl: WebGLRenderingContext | WebGL2RenderingContext
    ) => XRWebGLLayerLike;
  }
}

/**
 * Starts a full-screen immersive WebXR session directly inside a click handler,
 * rendering stereoscopic Left/Right eyes from a 2D offscreen canvas onto Quest's XRWebGLLayer
 * and polling Quest Touch Controllers (thumbsticks, triggers, grips, A/B/X/Y, haptics).
 */
export async function launchQuestImmersiveVR(options: {
  eyeWidth: number;
  eyeHeight: number;
  onStepAndDrawEye: (
    dt: number,
    eyeIndex: 0 | 1,
    headYawOffset: number,
    eyeCanvas: HTMLCanvasElement
  ) => void;
  callbacks: QuestInputCallbacks;
  onSessionEnd: () => void;
}): Promise<QuestXRController> {
  if (!navigator.xr) {
    throw new Error('WebXR not supported in this browser');
  }

  const session = await navigator.xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor'],
  });

  const glCanvas = document.createElement('canvas');
  const gl = (glCanvas.getContext('webgl2', {
    xrCompatible: true,
    alpha: false,
  }) ||
    glCanvas.getContext('webgl', {
      xrCompatible: true,
      alpha: false,
    })) as WebGLRenderingContext | WebGL2RenderingContext | null;

  if (!gl || !window.XRWebGLLayer) {
    await session.end();
    throw new Error('WebGL XR layer unavailable');
  }

  const makeCompatible = (
    gl as WebGLRenderingContext & { makeXRCompatible?: () => Promise<void> }
  ).makeXRCompatible;
  if (typeof makeCompatible === 'function') {
    await makeCompatible.call(gl);
  }

  const xrLayer = new window.XRWebGLLayer(session, gl);
  session.updateRenderState({ baseLayer: xrLayer });

  let refSpace: unknown;
  try {
    refSpace = await session.requestReferenceSpace('local-floor');
  } catch {
    refSpace = await session.requestReferenceSpace('local');
  }

  // Compile minimal fullscreen-quad shader for blasting eye canvas textures to XR eyes
  const vsSrc = `
    attribute vec2 aPos;
    attribute vec2 aUv;
    varying vec2 vUv;
    void main() {
      vUv = aUv;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;
  const fsSrc = `
    precision mediump float;
    uniform sampler2D uTex;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(uTex, vUv);
    }
  `;

  const compileShader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const quadVerts = new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
     1,  1, 1, 1,
  ]);
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aUv = gl.getAttribLocation(prog, 'aUv');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const eyeCanvas = document.createElement('canvas');
  eyeCanvas.width = options.eyeWidth;
  eyeCanvas.height = options.eyeHeight;

  let headYawBaseline: number | null = null;
  let lastStickDir: Direction = 'NONE';
  let prevPauseBtn = false;
  let prevExitBtn = false;
  let prevRecenterBtn = false;
  let prevGripBtn = false;
  let prevTriggerBtn = false;
  let lastXrTime = 0;
  let ended = false;

  session.addEventListener('end', () => {
    ended = true;
    options.onSessionEnd();
  });

  const pulseHaptics = (intensity: number, durationMs: number) => {
    if (ended) return;
    for (const src of session.inputSources) {
      const actuator = src.gamepad?.hapticActuators?.[0];
      if (actuator?.pulse) {
        void actuator.pulse(intensity, durationMs).catch(() => {});
      }
    }
  };

  const onXRFrame = (time: number, frame: XRFrameLike) => {
    if (ended) return;
    session.requestAnimationFrame(onXRFrame);

    const dt =
      lastXrTime === 0 ? 1 / 72 : Math.min(0.05, (time - lastXrTime) / 1000);
    lastXrTime = time;

    // 1. Poll Meta Quest Touch Controllers (left & right)
    let stickDir: Direction = 'NONE';
    let pauseBtn = false;
    let exitBtn = false;
    let recenterBtn = false;
    let gripBtn = false;
    let triggerBtn = false;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      // xr-standard maps Quest Touch thumbstick to axes[2], axes[3] (fallback axes[0], axes[1])
      const sx =
        Math.abs(gp.axes[2] ?? 0) > Math.abs(gp.axes[0] ?? 0)
          ? gp.axes[2] ?? 0
          : gp.axes[0] ?? 0;
      const sy =
        Math.abs(gp.axes[3] ?? 0) > Math.abs(gp.axes[1] ?? 0)
          ? gp.axes[3] ?? 0
          : gp.axes[1] ?? 0;

      if (Math.abs(sx) >= 0.38 || Math.abs(sy) >= 0.38) {
        if (Math.abs(sx) > Math.abs(sy)) {
          stickDir = sx > 0 ? 'RIGHT' : 'LEFT';
        } else {
          stickDir = sy > 0 ? 'DOWN' : 'UP';
        }
      }

      if (gp.buttons[0]?.pressed) triggerBtn = true; // Index Trigger -> Forward
      if (gp.buttons[1]?.pressed) gripBtn = true; // Grip Squeeze -> 180° U-Turn
      if (gp.buttons[3]?.pressed) recenterBtn = true; // Thumbstick Click -> Recenter Head
      if (gp.buttons[4]?.pressed) pauseBtn = true; // A / X -> Pause
      if (gp.buttons[5]?.pressed) exitBtn = true; // B / Y -> Exit VR
    }

    if (pauseBtn && !prevPauseBtn) options.callbacks.onTogglePause();
    prevPauseBtn = pauseBtn;

    if (exitBtn && !prevExitBtn) {
      options.callbacks.onExitVR?.();
      void session.end().catch(() => {});
      return;
    }
    prevExitBtn = exitBtn;

    if (recenterBtn && !prevRecenterBtn) {
      headYawBaseline = null;
      options.callbacks.onRecenterHead?.();
    }
    prevRecenterBtn = recenterBtn;

    if (gripBtn && !prevGripBtn) options.callbacks.onDirection('DOWN', true);
    prevGripBtn = gripBtn;

    const holdingForward = triggerBtn || stickDir === 'UP';
    options.callbacks.onForwardHold?.(holdingForward);
    if (triggerBtn && !prevTriggerBtn) options.callbacks.onDirection('UP', true);
    prevTriggerBtn = triggerBtn;

    if (stickDir !== lastStickDir) {
      lastStickDir = stickDir;
      options.callbacks.onDirection(stickDir, true);
    }

    // 2. Read Quest Head Pose & Render Left + Right Eye Viewports
    const pose = frame.getViewerPose(refSpace);
    const layer = session.renderState.baseLayer;
    if (!pose || !layer) return;

    const rawYaw = quaternionToYaw(pose.transform.orientation);
    if (headYawBaseline === null) headYawBaseline = rawYaw;
    // Slight head-look offset clamped comfortably so turning head peeks around corners
    let headYawOffset = -(rawYaw - headYawBaseline);
    while (headYawOffset > Math.PI) headYawOffset -= Math.PI * 2;
    while (headYawOffset < -Math.PI) headYawOffset += Math.PI * 2;

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    gl.clearColor(0.02, 0.03, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    pose.views.forEach((view, idx) => {
      const vp = layer.getViewport(view);
      if (!vp) return;
      const eyeIdx: 0 | 1 = view.eye === 'right' || idx === 1 ? 1 : 0;

      // Step simulation ONLY once per frame (on left eye / eye 0)
      options.onStepAndDrawEye(
        eyeIdx === 0 ? dt : 0,
        eyeIdx,
        headYawOffset,
        eyeCanvas
      );

      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        eyeCanvas
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  };

  session.requestAnimationFrame(onXRFrame);

  return {
    session,
    pulseHaptics,
    end: async () => {
      if (!ended) {
        ended = true;
        await session.end().catch(() => {});
      }
    },
  };
}
