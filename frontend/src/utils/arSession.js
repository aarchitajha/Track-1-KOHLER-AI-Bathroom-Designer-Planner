import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ==========================================
// 1. FINISH & MATERIAL FACTORY (PBR)
// ==========================================
export function getFinishProperties(finish = 'White', type = 'ceramic') {
  const f = (finish || '').toLowerCase();

  if (type === 'metal') {
    if (f.includes('black')) {
      return { color: '#18181b', metalness: 0.85, roughness: 0.35 };
    }
    if (f.includes('bronze') || f.includes('gold') || f.includes('brass')) {
      return { color: '#d4af37', metalness: 0.90, roughness: 0.22 };
    }
    if (f.includes('nickel') || f.includes('titanium')) {
      return { color: '#94a3b8', metalness: 0.92, roughness: 0.20 };
    }
    // Default Polished Chrome
    return { color: '#f8fafc', metalness: 0.98, roughness: 0.06 };
  }

  if (type === 'glass') {
    return {
      color: '#ffffff',
      transparent: true,
      opacity: 0.35,
      roughness: 0.04,
      metalness: 0.05
    };
  }

  // Vitreous China / Ceramic
  if (f.includes('black')) {
    return { color: '#18181b', roughness: 0.20, metalness: 0.04 };
  }
  if (f.includes('cashmere')) {
    return { color: '#d7ccc8', roughness: 0.16, metalness: 0.03 };
  }
  if (f.includes('grey') || f.includes('gray')) {
    return { color: '#64748b', roughness: 0.16, metalness: 0.03 };
  }
  if (f.includes('indigo')) {
    return { color: '#1e293b', roughness: 0.16, metalness: 0.03 };
  }
  return { color: '#ffffff', roughness: 0.12, metalness: 0.04 };
}

// ==========================================
// 2. GLTF MODEL CACHING & CLONING
// ==========================================
const glbCache = new Map();
const glbPromiseCache = new Map();

export function loadGLTFScene(sku) {
  if (!sku) return Promise.reject(new Error('No SKU provided'));
  if (glbCache.has(sku)) return Promise.resolve(glbCache.get(sku));
  if (glbPromiseCache.has(sku)) return glbPromiseCache.get(sku);

  const loader = new GLTFLoader();
  const promise = new Promise((resolve, reject) => {
    loader.load(
      `/models/${sku}.glb`,
      (gltf) => {
        glbCache.set(sku, gltf.scene);
        glbPromiseCache.delete(sku);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        glbPromiseCache.delete(sku);
        reject(err);
      }
    );
  });
  glbPromiseCache.set(sku, promise);
  return promise;
}

export function cloneGLTFScene(scene) {
  const cloned = scene.clone(true);
  cloned.traverse((node) => {
    if (node.isMesh && node.material) {
      if (Array.isArray(node.material)) {
        node.material = node.material.map((m) => m.clone());
      } else {
        node.material = node.material.clone();
      }
    }
  });
  return cloned;
}

export function applyPBRMaterials(object, finish, category) {
  const ceramicProps = getFinishProperties(finish, 'ceramic');
  const metalProps = getFinishProperties(finish, 'metal');

  object.traverse((child) => {
    if (child.isMesh && child.material) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        const matName = (mat.name || '').toLowerCase();
        if (matName.includes('wood') || matName.includes('vanity')) {
          mat.color = new THREE.Color('#27272a');
          mat.roughness = 0.65;
          mat.metalness = 0.08;
        } else if (matName.includes('mirror')) {
          mat.color = new THREE.Color('#ffffff');
          mat.roughness = 0.02;
          mat.metalness = 0.98;
        } else if (matName.includes('glass')) {
          mat.transparent = true;
          mat.opacity = 0.35;
          mat.roughness = 0.08;
        } else if (
          category === 'Faucets' ||
          category === 'Showers' ||
          matName.includes('metal') ||
          matName.includes('chrome') ||
          matName.includes('brass') ||
          mat.metalness > 0.5
        ) {
          mat.metalness = metalProps.metalness;
          mat.roughness = metalProps.roughness;
          mat.color = new THREE.Color(metalProps.color);
        } else {
          mat.roughness = ceramicProps.roughness;
          mat.metalness = ceramicProps.metalness;
          mat.color = new THREE.Color(ceramicProps.color);
        }
        mat.needsUpdate = true;
      });
    }
  });
}

// ==========================================
// 3. PROCEDURAL KOHLER THREE.JS OBJECT FALLBACK
// ==========================================
export function createProceduralMesh(fixture) {
  const group = new THREE.Group();
  const category = fixture?.category || '';
  const finish = fixture?.finish || 'White';
  const ceramicProps = getFinishProperties(finish, 'ceramic');
  const metalProps = getFinishProperties(finish, 'metal');

  const ceramicMat = new THREE.MeshStandardMaterial({
    color: ceramicProps.color,
    roughness: ceramicProps.roughness,
    metalness: ceramicProps.metalness
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: metalProps.color,
    roughness: metalProps.roughness,
    metalness: metalProps.metalness
  });

  if (category === 'Toilets') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.4, 1.65), ceramicMat);
    base.position.set(0, 0.7, -0.05);
    group.add(base);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.55, 32), ceramicMat);
    bowl.position.set(0, 1.25, 0.42);
    group.add(bowl);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 0.7), ceramicMat);
    tank.position.set(0, 2.0, -0.55);
    group.add(tank);

    const act = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), metalMat);
    act.rotation.x = Math.PI / 2;
    act.position.set(0, 2.75, -0.55);
    group.add(act);
  } else if (category === 'Washbasins') {
    const vanity = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.4, 1.75),
      new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.7, metalness: 0.1 })
    );
    vanity.position.set(0, -1.35, 0);
    group.add(vanity);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, 1.85), ceramicMat);
    counter.position.set(0, 0, 0);
    group.add(counter);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.65, 0.5, 32), ceramicMat);
    basin.position.set(0, 0.25, 0);
    group.add(basin);
  } else if (category === 'Faucets') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.04, 24), metalMat);
    base.position.set(0, 0.02, 0);
    group.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.65, 24), metalMat);
    stem.position.set(0, 0.35, 0);
    group.add(stem);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.45, 20), metalMat);
    spout.position.set(0, 0.72, 0.2);
    spout.rotation.x = Math.PI / 4;
    group.add(spout);
  } else if (category === 'Showers') {
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), metalMat);
    head.position.set(0, 0, 0);
    group.add(head);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16), metalMat);
    pipe.position.set(0, 0.6, 0);
    group.add(pipe);
  } else if (category === 'Mirrors & Cabinets') {
    const mirrorMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0.95 });
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 36), mirrorMat);
    mirror.rotation.x = Math.PI / 2;
    group.add(mirror);
  } else {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ceramicMat);
    cube.position.set(0, 0.5, 0);
    group.add(cube);
  }

  return group;
}

// ==========================================
// 4. MULTI-FIXTURE SUITE BUILDER FOR AR
// ==========================================
export async function buildARSuiteGroup({ bundle, selectedFixture }) {
  const arRoot = new THREE.Group();
  // Main 3D room coordinate unit is feet (1 unit = 1 foot).
  // WebXR physical space unit is meters (1 unit = 1 meter).
  // 1 foot = 0.3048 meters.
  const SCALE_FT_TO_M = 0.3048;
  arRoot.scale.set(SCALE_FT_TO_M, SCALE_FT_TO_M, SCALE_FT_TO_M);

  const fixturesToPlace = selectedFixture ? [selectedFixture] : (bundle?.fixtures || []);

  for (const f of fixturesToPlace) {
    const fixtureWrapper = new THREE.Group();
    if (selectedFixture) {
      // Single fixture mode: center fixture on floor plane origin
      fixtureWrapper.position.set(0, 0, 0);
      fixtureWrapper.rotation.set(0, 0, 0);
    } else {
      // Full Suite mode: preserve exact relative layout, positions, and rotations
      const [px, py, pz] = f.position || [0, 0, 0];
      const [rx, ry, rz] = f.rotation || [0, 0, 0];
      fixtureWrapper.position.set(px, py, pz);
      fixtureWrapper.rotation.set(rx, ry, rz);
    }

    let modelObj = null;
    if (f.sku) {
      try {
        const rawScene = await loadGLTFScene(f.sku);
        if (rawScene) {
          modelObj = cloneGLTFScene(rawScene);
          applyPBRMaterials(modelObj, f.finish, f.category);
        }
      } catch (err) {
        console.warn(`[WebXR AR] Could not load GLB for SKU "${f.sku}":`, err);
      }
    }

    if (!modelObj) {
      modelObj = createProceduralMesh(f);
    }

    fixtureWrapper.add(modelObj);
    arRoot.add(fixtureWrapper);
  }

  return arRoot;
}

// ==========================================
// 5. WEBXR AR SESSION LAUNCHER
// ==========================================
export async function launchWebXRARSession({ bundle, selectedFixture, onEnd }) {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    throw new Error('WebXR Device API is not available on this platform or browser.');
  }

  const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!isSupported) {
    throw new Error('WebXR immersive-ar session is not supported on this device.');
  }

  // Create DOM Overlay Container
  const overlay = document.createElement('div');
  overlay.id = 'kohler-webxr-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'space-between';
  overlay.style.padding = '18px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const titleText = selectedFixture
    ? `${selectedFixture.name || 'Kohler Fixture'} • ${selectedFixture.finish || 'White'}`
    : `KOHLER ${bundle?.bundle_name || 'Bathroom Suite'} (${(bundle?.fixtures || []).length} Fixtures)`;

  overlay.innerHTML = `
    <style>
      @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    </style>
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px;">
      <div style="background: rgba(15, 23, 42, 0.88); color: #ffffff; padding: 7px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 4px 12px rgba(0,0,0,0.25); max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; flex-shrink: 0; animation: pulse-dot 1.5s ease-in-out infinite;"></span>
        <span style="overflow: hidden; text-overflow: ellipsis;">${titleText}</span>
      </div>
      <button id="kohler-xr-exit-btn" style="pointer-events: auto; background: rgba(15, 23, 42, 0.88); color: #ffffff; border: 1px solid rgba(255,255,255,0.22); border-radius: 20px; padding: 7px 14px; font-size: 11px; font-weight: 700; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.25); flex-shrink: 0;">
        ✕ Exit AR
      </button>
    </div>
    <div style="display: flex; justify-content: center; width: 100%; margin-bottom: 8px;">
      <div id="kohler-xr-status-pill" style="pointer-events: auto; background: rgba(15, 23, 42, 0.88); color: #ffffff; padding: 9px 18px; border-radius: 24px; font-size: 12px; font-weight: 600; text-align: center; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 4px 16px rgba(0,0,0,0.3); max-width: 90%;">
        Aim camera at floor • Tap to place
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Request WebXR session with DOM overlay & optional hit-test and local-floor
  const sessionInit = {
    requiredFeatures: [],
    optionalFeatures: ['local-floor', 'hit-test', 'dom-overlay'],
    domOverlay: { root: overlay }
  };

  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', sessionInit);
  } catch (err) {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    throw err;
  }

  // Set up Three.js WebGLRenderer with WebXR enabled
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  await renderer.xr.setSession(session);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  // Balanced Lighting for Real-World AR Room
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 5, 2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.7);
  fillLight.position.set(-2, 3, -2);
  scene.add(fillLight);

  // Hit-test floor reticle
  const reticleGeo = new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  const reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Build the complete suite or individual fixture group
  const arRoot = await buildARSuiteGroup({ bundle, selectedFixture });
  arRoot.visible = false;
  scene.add(arRoot);

  // Request Hit Test Source
  let hitTestSource = null;
  try {
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (e) {
    console.warn('[WebXR AR] Hit test source not available on device:', e);
  }

  let isPlaced = false;
  const statusPill = overlay.querySelector('#kohler-xr-status-pill');

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  // Tap handler to place or reposition the model
  const onSelect = () => {
    if (reticle.visible) {
      arRoot.position.setFromMatrixPosition(reticle.matrix);
      // Align orientation to face the viewer
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();
      arRoot.rotation.y = Math.atan2(-camDir.x, -camDir.z);

      arRoot.visible = true;
      isPlaced = true;
      reticle.visible = false;
      setStatus(selectedFixture ? 'Fixture placed • Tap to reposition' : 'Full suite placed • Tap to reposition');
    } else if (!isPlaced) {
      // Fallback if floor plane detection is delayed: place 1.5m in front of camera
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      arRoot.position.copy(camPos).addScaledVector(camDir, 1.5);
      arRoot.position.y = camPos.y - 1.0;
      arRoot.rotation.y = Math.atan2(-camDir.x, -camDir.z);

      arRoot.visible = true;
      isPlaced = true;
      setStatus(selectedFixture ? 'Fixture placed • Walk around to inspect' : 'Full suite placed • Walk around to explore');
    } else if (isPlaced && reticle.visible) {
      arRoot.position.setFromMatrixPosition(reticle.matrix);
      setStatus('Repositioned');
    }
  };

  session.addEventListener('select', onSelect);

  // Exit AR button
  const exitBtn = overlay.querySelector('#kohler-xr-exit-btn');
  if (exitBtn) {
    exitBtn.onclick = () => {
      session.end().catch(() => {});
    };
  }

  // Cleanup on Session End
  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
    if (onEnd) onEnd();
  });

  // Main Render Loop
  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame && hitTestSource) {
      const refSpace = renderer.xr.getReferenceSpace();
      if (refSpace) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(refSpace);
          if (pose) {
            reticle.visible = !isPlaced;
            reticle.matrix.fromArray(pose.transform.matrix);
            if (!isPlaced) {
              setStatus('Floor detected • Tap screen to place suite');
            }
          }
        }
      }
    }

    renderer.render(scene, camera);
  });

  return session;
}
