import React, { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { RotateCcw, Box, Info, Eye, Compass, Smartphone } from 'lucide-react';
import ARSelectionModal from './ARSelectionModal';
import { launchWebXRARSession } from '../utils/arSession';

// ==========================================
// 1. FINISH & MATERIAL FACTORY (PBR)
// ==========================================
function getFinishProperties(finish = "White", type = "ceramic") {
  const f = (finish || "").toLowerCase();

  if (type === "metal") {
    if (f.includes("black")) {
      return { color: "#18181b", metalness: 0.85, roughness: 0.35 };
    }
    if (f.includes("bronze") || f.includes("gold") || f.includes("brass")) {
      return { color: "#d4af37", metalness: 0.90, roughness: 0.22 };
    }
    if (f.includes("nickel") || f.includes("titanium")) {
      return { color: "#94a3b8", metalness: 0.92, roughness: 0.20 };
    }
    // Default Polished Chrome
    return { color: "#f8fafc", metalness: 0.98, roughness: 0.06 };
  }

  if (type === "glass") {
    return {
      color: "#ffffff",
      transparent: true,
      opacity: 0.35,
      roughness: 0.04,
      metalness: 0.05
    };
  }

  // Vitreous China / Ceramic
  if (f.includes("black")) {
    return { color: "#18181b", roughness: 0.20, metalness: 0.04 };
  }
  if (f.includes("cashmere")) {
    return { color: "#d7ccc8", roughness: 0.16, metalness: 0.03 };
  }
  if (f.includes("grey") || f.includes("gray")) {
    return { color: "#64748b", roughness: 0.16, metalness: 0.03 };
  }
  if (f.includes("indigo")) {
    return { color: "#1e293b", roughness: 0.16, metalness: 0.03 };
  }
  // Default Pure Kohler White Vitreous China
  return { color: "#ffffff", roughness: 0.12, metalness: 0.04 };
}

// ==========================================
// 2. PROCEDURAL KOHLER FIXTURES
// ==========================================

// A. TOILET (Veil Intelligent or Standard Elongated)
function ProceduralToilet({ fixture, ceramicMat, metalMat }) {
  const name = (fixture?.name || "").toLowerCase();
  const isVeil = name.includes("veil");

  if (isVeil) {
    return (
      <group>
        {/* Wall Carrier Plate */}
        <mesh position={[0, 1.4, -0.65]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 1.4, 0.1]} />
          <meshStandardMaterial {...ceramicMat} />
        </mesh>
        {/* Cantilever Floating Bowl */}
        <mesh position={[0, 1.15, -0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.62, 0.45, 0.85, 32]} />
          <meshStandardMaterial {...ceramicMat} />
        </mesh>
        <mesh position={[0, 1.2, 0.32]} castShadow>
          <cylinderGeometry args={[0.55, 0.4, 0.75, 32]} />
          <meshStandardMaterial {...ceramicMat} />
        </mesh>
        {/* Ultra-Slim Lid */}
        <mesh position={[0, 1.58, 0.1]}>
          <boxGeometry args={[1.15, 0.05, 1.35]} />
          <meshStandardMaterial {...ceramicMat} roughness={0.1} />
        </mesh>
        {/* Veil Nightlight Soft Accent */}
        <mesh position={[0, 0.85, 0.2]}>
          <boxGeometry args={[0.7, 0.02, 0.02]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
        {/* In-Wall Flush Actuator Plate */}
        <group position={[0, 3.2, -0.68]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.55, 0.04]} />
            <meshStandardMaterial {...metalMat} />
          </mesh>
          <mesh position={[-0.18, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.03, 20]} />
            <meshStandardMaterial {...metalMat} metalness={0.98} roughness={0.05} />
          </mesh>
          <mesh position={[0.18, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.03, 20]} />
            <meshStandardMaterial {...metalMat} metalness={0.98} roughness={0.05} />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    <group>
      {/* Skirted Base Pedestal */}
      <mesh position={[0, 0.7, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 1.4, 1.65]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      {/* Elongated Front Ceramic Bowl */}
      <mesh position={[0, 1.25, 0.42]} castShadow>
        <cylinderGeometry args={[0.62, 0.5, 0.55, 32]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      {/* Sculpted Tank */}
      <mesh position={[0, 2.0, -0.55]} castShadow>
        <boxGeometry args={[1.35, 1.35, 0.7]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      {/* Tank Beveled Lid */}
      <mesh position={[0, 2.7, -0.55]}>
        <boxGeometry args={[1.4, 0.08, 0.75]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      {/* Chrome Flush Actuator */}
      <mesh position={[0, 2.75, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 20]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      {/* Soft-close Seat & Cover */}
      <mesh position={[0, 1.54, 0.32]}>
        <boxGeometry args={[1.15, 0.06, 1.3]} />
        <meshStandardMaterial {...ceramicMat} roughness={0.2} />
      </mesh>
    </group>
  );
}

// B. WASHBASIN & VANITY CONSOLE
function ProceduralWashbasin({ fixture, ceramicMat }) {
  const name = (fixture?.name || "").toLowerCase();
  const isConical = name.includes("conical");
  const isRectangular = name.includes("modernlife") || name.includes("forefront");

  return (
    <group>
      {/* Architectural Floating Vanity Console */}
      <group position={[0, -1.35, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 2.4, 1.75]} />
          <meshStandardMaterial color="#27272a" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Double Drawer Fronts */}
        <mesh position={[0, 0.35, 0.89]}>
          <boxGeometry args={[2.46, 0.95, 0.04]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.68, 0.89]}>
          <boxGeometry args={[2.46, 0.95, 0.04]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.6} />
        </mesh>
        {/* Brushed Brass Handle Pulls */}
        <mesh position={[0, 0.72, 0.92]}>
          <boxGeometry args={[0.6, 0.03, 0.04]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.32, 0.92]}>
          <boxGeometry args={[0.6, 0.03, 0.04]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Solid Surface Countertop */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.7, 0.14, 1.85]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>

      {/* Vessel Basin Geometry */}
      {isConical ? (
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.85, 0.5, 0.45, 36]} />
          <meshStandardMaterial {...ceramicMat} />
        </mesh>
      ) : isRectangular ? (
        <group position={[0, 0.22, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.9, 0.38, 1.35]} />
            <meshStandardMaterial {...ceramicMat} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0.22, 0]}>
          <mesh castShadow scale={[1.3, 0.4, 0.95]}>
            <cylinderGeometry args={[0.75, 0.65, 1.0, 36]} />
            <meshStandardMaterial {...ceramicMat} />
          </mesh>
        </group>
      )}

      {/* Pop-Up Drain */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 20]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.98} roughness={0.08} />
      </mesh>
    </group>
  );
}

// C. FAUCET
function ProceduralFaucet({ metalMat }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.04, 24]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.08, 0.65, 24]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={[0, 0.72, 0.2]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.45, 20]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={[0, 0.58, 0.38]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.16, 20]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={[0.14, 0.55, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[0.22, 0.035, 0.06]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
    </group>
  );
}

// D. SHOWER ENCLOSURE & SYSTEM
function ProceduralShower({ fixture, metalMat }) {
  const name = (fixture?.name || "").toLowerCase();
  const isSquare = name.includes("square") || name.includes("rain max");

  return (
    <group>
      {/* Wall Flange */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      {/* Horizontal Shower Arm */}
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.3, 20]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      {/* Overhead Rain Showerhead */}
      {isSquare ? (
        <group position={[0, -0.12, 1.3]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 0.06, 1.0]} />
            <meshStandardMaterial {...metalMat} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <boxGeometry args={[0.92, 0.01, 0.92]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
        </group>
      ) : (
        <group position={[0, -0.12, 1.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.06, 36]} />
            <meshStandardMaterial {...metalMat} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.01, 36]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* Concealed Valve Trim Plate */}
      <group position={[0, -3.2, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.85, 0.03]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
        <mesh position={[0, 0.2, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
        <mesh position={[0, -0.2, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
      </group>

      {/* Pencil Handshower */}
      <group position={[0.5, -3.0, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.45, 0.06]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
      </group>
    </group>
  );
}

// E. LIGHTED MIRROR
function ProceduralMirror({ fixture }) {
  const name = (fixture?.name || "").toLowerCase();
  const isRound = name.includes("round");

  if (isRound) {
    return (
      <group>
        <mesh position={[0, 0, 0.02]}>
          <cylinderGeometry args={[1.3, 1.3, 0.02, 40]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.02, 40]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.02} metalness={0.98} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {/* Matte Black Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 2.9, 0.07]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} />
      </mesh>
      {/* Reflective Mirror Glass */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[2.08, 2.78]} />
        <meshStandardMaterial color="#ffffff" roughness={0.02} metalness={0.98} />
      </mesh>
      {/* Frosted LED Edge Strips */}
      <mesh position={[-0.95, 0, 0.045]}>
        <planeGeometry args={[0.08, 2.65]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <mesh position={[0.95, 0, 0.045]}>
        <planeGeometry args={[0.08, 2.65]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
    </group>
  );
}

// F. BATHTUB
function ProceduralBathtub({ ceramicMat, metalMat }) {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.6, 2.0, 1.9, 36]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[2.65, 2.65, 0.1, 36]} />
        <meshStandardMaterial {...ceramicMat} />
      </mesh>
      {/* Clear Water Surface */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[2.35, 2.35, 0.04, 36]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transmission={0.8}
          transparent
          opacity={0.7}
          roughness={0.05}
          ior={1.33}
        />
      </mesh>
      {/* Floor-Mounted Filler Tap */}
      <group position={[2.5, 0, 0]}>
        <mesh position={[0, 1.7, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 3.4, 20]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
        <mesh position={[-0.3, 3.3, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 20]} />
          <meshStandardMaterial {...metalMat} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// SCENE ERROR BOUNDARY & LOGGING
// ==========================================
class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[SceneErrorBoundary] 3D Scene Error encountered:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <group>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#ef4444" wireframe />
          </mesh>
        </group>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 3. OFFICIAL KOHLER 3D MODEL LOADER (PER-SKU CACHED WITH DEEP MATERIAL CLONING)
// ==========================================
// Module-level cache — survives component re-mounts, never re-fetches same SKU
const glbModelCache = new Map();
const glbModelPromiseCache = new Map();

function loadGltfScene(sku) {
  if (glbModelCache.has(sku)) return Promise.resolve(glbModelCache.get(sku));
  if (glbModelPromiseCache.has(sku)) return glbModelPromiseCache.get(sku);

  const promise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      `/models/${sku}.glb`,
      (gltf) => {
        glbModelCache.set(sku, gltf.scene);
        glbModelPromiseCache.delete(sku);
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        glbModelPromiseCache.delete(sku);
        reject(error);
      }
    );
  });
  glbModelPromiseCache.set(sku, promise);
  return promise;
}

function preloadBundleModels(bundles) {
  const skus = [...new Set((bundles || []).flatMap((candidate) =>
    (candidate.fixtures || []).map((fixture) => fixture.sku).filter(Boolean)
  ))];
  skus.forEach((sku) => loadGltfScene(sku).catch(() => undefined));
}

function cloneGltfScene(scene) {
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

function applyPBRMaterialsAndShadows(object, finish, category, ceramicMat, metalMat) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => tunePBRMaterial(m, finish, category, ceramicMat, metalMat));
        } else {
          tunePBRMaterial(child.material, finish, category, ceramicMat, metalMat);
        }
      }
    }
  });
}

function tunePBRMaterial(mat, finish, category, ceramicMat, metalMat) {
  if (!mat) return;
  const matName = (mat.name || "").toLowerCase();

  if (matName.includes("wood") || matName.includes("vanity")) {
    mat.color = new THREE.Color("#27272a");
    mat.roughness = 0.65;
    mat.metalness = 0.08;
    mat.needsUpdate = true;
    return;
  }

  if (matName.includes("mirror") || (mat.roughness <= 0.05 && mat.metalness >= 0.95)) {
    mat.color = new THREE.Color("#ffffff");
    mat.roughness = 0.02;
    mat.metalness = 0.98;
    mat.needsUpdate = true;
    return;
  }

  if (matName.includes("frosted") || matName.includes("glass")) {
    mat.transparent = true;
    mat.opacity = 0.35;
    mat.roughness = 0.08;
    mat.needsUpdate = true;
    return;
  }

  if (
    category === "Faucets" ||
    category === "Showers" ||
    matName.includes("metal") ||
    matName.includes("chrome") ||
    matName.includes("brass") ||
    matName.includes("matte_black") ||
    mat.metalness > 0.5
  ) {
    mat.metalness = metalMat.metalness;
    mat.roughness = metalMat.roughness;
    mat.color = new THREE.Color(metalMat.color);
    mat.needsUpdate = true;
    return;
  }

  if (
    category === "Toilets" ||
    category === "Washbasins" ||
    category === "Bathtubs" ||
    matName.includes("ceramic") ||
    matName.includes("china")
  ) {
    mat.roughness = ceramicMat.roughness;
    mat.metalness = ceramicMat.metalness;
    mat.color = new THREE.Color(ceramicMat.color);
    mat.needsUpdate = true;
  }
}

// Procedural Fallback Component
function ProceduralFallback({ category, fixture, ceramicMat, metalMat }) {
  if (category === "Toilets") return <ProceduralToilet fixture={fixture} ceramicMat={ceramicMat} metalMat={metalMat} />;
  if (category === "Washbasins") return <ProceduralWashbasin fixture={fixture} ceramicMat={ceramicMat} />;
  if (category === "Faucets") return <ProceduralFaucet metalMat={metalMat} />;
  if (category === "Showers") return <ProceduralShower fixture={fixture} metalMat={metalMat} />;
  if (category === "Mirrors & Cabinets") return <ProceduralMirror fixture={fixture} />;
  if (category === "Bathtubs") return <ProceduralBathtub ceramicMat={ceramicMat} metalMat={metalMat} />;
  return null;
}

// Kohler Product Model Component — memoized to prevent re-render unless SKU/finish changes
// ITEM 1 FIX: React.memo prevents cascade re-renders from parent
const KohlerProductModel = React.memo(function KohlerProductModel({ fixture, ceramicMat, metalMat }) {
  const { sku, name, category, finish = "White" } = fixture || {};
  const [modelScene, setModelScene] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!sku) {
      console.warn(`[3D Fixture Source] [${category}] Missing SKU for fixture "${name}". Using procedural fallback.`);
      setLoadFailed(true);
      return;
    }

    // Reuse completed and in-flight loads so tier switches never duplicate work.
    if (glbModelCache.has(sku)) {
      const cachedScene = glbModelCache.get(sku);
      const cloned = cloneGltfScene(cachedScene);
      applyPBRMaterialsAndShadows(cloned, finish, category, ceramicMat, metalMat);
      setModelScene(cloned);
      console.log(`[3D Fixture Source] [${category}] "${name}" (SKU: ${sku}) -> CACHE HIT: /models/${sku}.glb | Finish: "${finish}"`);
      return;
    }
    const modelUrl = `/models/${sku}.glb`;

    loadGltfScene(sku).then((scene) => {
      if (cancelled) return;
      const cloned = cloneGltfScene(scene);
      applyPBRMaterialsAndShadows(cloned, finish, category, ceramicMat, metalMat);
      setModelScene(cloned);
      console.log(`[3D Fixture Source] [${category}] "${name}" (SKU: ${sku}) -> SOURCED MODEL: ${modelUrl} | Finish: "${finish}"`);
    }).catch((err) => {
      if (cancelled) return;
      console.warn(`[3D Fixture Source] [${category}] "${name}" (SKU: ${sku}) -> PROCEDURAL FALLBACK (${modelUrl} not found: ${err?.message || 'not found'}) | Finish: "${finish}"`);
      setLoadFailed(true);
    });

    return () => { cancelled = true; };
  }, [sku, finish, category]); // NOTE: ceramicMat/metalMat intentionally NOT in deps — they're stable memos

  if (loadFailed || !modelScene) {
    return <ProceduralFallback category={category} fixture={fixture} ceramicMat={ceramicMat} metalMat={metalMat} />;
  }

  return <primitive object={modelScene} />;
});

// ==========================================
// UNIFIED FIXTURE WRAPPER — memoized + stable material objects
// ==========================================
// ITEM 1 FIX: React.memo + useMemo for ceramicMat/metalMat prevents re-renders
const UnifiedFixture = React.memo(function UnifiedFixture({ fixture }) {
  const { category, position, rotation, finish = "White", sku, name } = fixture || {};
  const [x, y, z] = position || [0, 0, 0];
  const [rx, ry, rz] = rotation || [0, 0, 0];

  // ITEM 1 FIX: memoize material objects — previously re-created every render,
  // causing KohlerProductModel to see new prop references and re-run effects
  const ceramicMat = useMemo(() => getFinishProperties(finish, "ceramic"), [finish]);
  const metalMat = useMemo(() => getFinishProperties(finish, "metal"), [finish]);

  useEffect(() => {
    console.log(`[3D Scene] Placed [${category}] SKU:"${sku || 'N/A'}" Name:"${name || 'Fixture'}" pos:[${x},${y},${z}] rot:[${rx},${ry},${rz}] finish:"${finish}"`);
  }, [category, sku, name, x, y, z, rx, ry, rz, finish]);

  return (
    <group position={[x, y, z]} rotation={[rx, ry, rz]}>
      <KohlerProductModel fixture={fixture} ceramicMat={ceramicMat} metalMat={metalMat} />
    </group>
  );
});

// ==========================================
// 4. ARCHITECTURAL ROOM SHELL
// ==========================================
function ArchitecturalRoomShell({ length = 10, width = 8, height = 8, theme = "Minimalist Modern" }) {
  const halfL = (Number(length) || 10) / 2;
  const halfW = (Number(width) || 8) / 2;
  const h = Number(height) || 8;

  useEffect(() => {
    console.log(`[3D Scene] Room shell: ${length}ft × ${width}ft × ${h}ft | theme:"${theme}"`);
  }, [length, width, h, theme]);

  let floorColor = "#1e293b";
  let wallColor = "#f8fafc";
  let trimColor = "#0f172a";

  if (theme === "Classic Luxury") {
    floorColor = "#2d241e";
    wallColor = "#fdfbf7";
    trimColor = "#b89758";
  } else if (theme === "Japanese Zen") {
    floorColor = "#1e2820";
    wallColor = "#f5f2eb";
    trimColor = "#445041";
  }

  return (
    <group name="ArchitecturalRoomShell">
      {/* Solid Porcelain Floor Slab — ITEM 4 FIX: gridHelper removed (was the floating white plane) */}
      <mesh position={[0, -0.1, 0]} receiveShadow name="FloorSlab">
        <boxGeometry args={[length, 0.2, width]} />
        <meshStandardMaterial color={floorColor} roughness={0.3} metalness={0.08} />
      </mesh>

      {/* North Wall (Back) */}
      <mesh position={[0, h / 2, -halfW - 0.1]} receiveShadow name="NorthWall">
        <boxGeometry args={[length + 0.4, h, 0.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* West Wall (Left) */}
      <mesh position={[-halfL - 0.1, h / 2, 0]} receiveShadow name="WestWall">
        <boxGeometry args={[0.2, h, width]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* Baseboards */}
      <mesh position={[0, 0.2, -halfW + 0.04]} name="NorthBaseboard">
        <boxGeometry args={[length, 0.4, 0.08]} />
        <meshStandardMaterial color={trimColor} />
      </mesh>
      <mesh position={[-halfL + 0.04, 0.2, 0]} name="WestBaseboard">
        <boxGeometry args={[0.08, 0.4, width]} />
        <meshStandardMaterial color={trimColor} />
      </mesh>
    </group>
  );
}

// ==========================================
// 5. CAMERA CONTROLLER & PRESETS
// ==========================================
function CameraController({ viewPreset, cameraSettings }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  const posKey = cameraSettings?.position ? cameraSettings.position.join(",") : "";
  const targetKey = cameraSettings?.target ? cameraSettings.target.join(",") : "";

  useEffect(() => {
    if (!controlsRef.current) return;

    if (viewPreset === "top") {
      camera.position.set(0, 24, 0.01);
      controlsRef.current.target.set(0, 0, 0);
    } else if (viewPreset === "front") {
      camera.position.set(0, 4.5, 18);
      controlsRef.current.target.set(0, 2.5, 0);
    } else {
      if (cameraSettings && cameraSettings.position && cameraSettings.target) {
        const [cx, cy, cz] = cameraSettings.position;
        const [tx, ty, tz] = cameraSettings.target;
        // Scale distance by 1.15 to ensure full room is visible with generous margins
        camera.position.set(cx * 1.15, cy * 1.15, cz * 1.15);
        controlsRef.current.target.set(tx, ty, tz);
      } else {
        camera.position.set(11, 14, 13.5);
        controlsRef.current.target.set(0, 2.0, 0);
      }
    }
    controlsRef.current.update();
  }, [viewPreset, posKey, targetKey, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={4}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

// ==========================================
// 6. AR MODULE — WebXR AR & Apple AR Quick Look Runtime Detection
// ==========================================

// Helper: Detect iOS Safari / WebKit environment for Apple AR Quick Look
function isIOSPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    return true;
  }
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  const a = document.createElement('a');
  return Boolean(a.relList && a.relList.supports && a.relList.supports('ar'));
}

function ARButton({ bundle, onStartAR }) {
  const [arMode, setArMode] = useState('detecting'); // 'webxr' | 'quicklook' | 'unsupported' | 'detecting'
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function detectARSupport() {
      // 1. Android / WebXR path: Check if WebXR immersive-ar session is supported
      if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          if (supported && isMounted) {
            setArMode('webxr');
            return;
          }
        } catch (e) {
          console.debug('[AR] WebXR check:', e);
        }
      }

      // 2. iOS path: Check if device is iOS / iPadOS for Apple AR Quick Look
      if (isIOSPlatform() && isMounted) {
        setArMode('quicklook');
        return;
      }

      // 3. Desktop or unsupported mobile browser: Hide AR control entirely
      if (isMounted) {
        setArMode('unsupported');
      }
    }

    detectARSupport();
    return () => { isMounted = false; };
  }, []);

  const [showModal, setShowModal] = useState(false);

  const handleLaunchWebXR = useCallback(async (selectedFixture) => {
    setShowModal(false);
    setIsStarting(true);
    try {
      if (onStartAR) {
        await onStartAR(selectedFixture);
      } else {
        await launchWebXRARSession({
          bundle,
          selectedFixture,
          onEnd: () => setIsStarting(false)
        });
      }
    } catch (err) {
      console.warn('[AR] Could not start WebXR session:', err);
      setIsStarting(false);
    }
  }, [bundle, onStartAR]);

  // Hide the AR control entirely on desktop or unsupported browsers
  if (arMode === 'unsupported' || arMode === 'detecting') {
    return null;
  }

  const buttonStyle = {
    background: '#0f172a',
    color: '#ffffff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    letterSpacing: '0.02em',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.15s ease'
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isStarting}
        style={buttonStyle}
        title="View Suite or Individual Fixtures in AR"
      >
        <Smartphone size={13} />
        <span>{isStarting ? 'Loading AR...' : 'View in AR'}</span>
      </button>

      {/* AR Fixture & Suite Selection Modal */}
      <ARSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        bundle={bundle}
        arMode={arMode}
        onLaunchWebXR={handleLaunchWebXR}
      />
    </>
  );
}

// ==========================================
// 7. MAIN EXPORT COMPONENT
// ==========================================
export default function Room3DViewer({ bundle, bundles, roomSpecs, bundleKey }) {
  const [viewPreset, setViewPreset] = useState("iso"); // 'iso' | 'top' | 'front'
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [sceneError, setSceneError] = useState(null);

  const fixtures = bundle?.fixtures || [];
  const room = bundle?.room || roomSpecs || { length_ft: 10, width_ft: 8, height_ft: 8 };
  const cameraSettings = bundle?.camera;

  // ITEM 2 FIX: Track bundleKey (includes fixture SKUs) so scene refreshes when fixtures change
  // even if bundle_id/tier/length stay the same (e.g. after swap_item)
  const sceneRefreshKey = bundleKey || `${bundle?.bundle_id}-${bundle?.tier}-${fixtures.length}`;

  useEffect(() => {
    setIsSceneLoading(true);
    const timer = setTimeout(() => setIsSceneLoading(false), 400);
    return () => clearTimeout(timer);
  }, [sceneRefreshKey]);

  useEffect(() => {
    if (bundles?.length) preloadBundleModels(bundles);
  }, [bundles]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#f8fafc',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-grey-200)',
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.02)'
      }}
    >
      {/* Loading Overlay */}
      {isSceneLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(248, 250, 252, 0.88)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 25,
            transition: 'opacity 0.25s ease'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #0f172a',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite'
            }}
          />
          <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em' }}>
            KOHLER 3D REALISTIC VISUALIZER
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
            Loading {bundle?.bundle_name || 'Suite'} ({bundle?.theme || 'Modern'})...
          </div>
        </div>
      )}

      {/* Error State */}
      {sceneError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c', marginBottom: '8px' }}>
            3D Scene Rendering Notice
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '340px', marginBottom: '16px' }}>
            {sceneError}
          </p>
          <button
            onClick={() => setSceneError(null)}
            className="btn btn-primary btn-sm"
          >
            Retry 3D Scene
          </button>
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05
        }}
        camera={{ position: [9, 13, 11], fov: 45, near: 0.1, far: 1000 }}
      >
        <color attach="background" args={["#f1f5f9"]} />
        <fog attach="fog" args={["#f1f5f9", 26, 65]} />

        {/* Ambient Fill Light */}
        <ambientLight intensity={0.48} />

        {/* Directional "Window" Natural Sunlight with Soft Shadows */}
        <directionalLight
          position={[14, 18, 12]}
          intensity={1.65}
          color="#fffdfa"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={45}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0001}
        />

        {/* Cool Skylight Fill */}
        <directionalLight position={[-10, 12, -8]} intensity={0.4} color="#e0f2fe" />
        {/* Warm Accent Point Light */}
        <pointLight position={[0, 7.5, 0]} intensity={0.35} color="#fef3c7" />

        <Suspense fallback={null}>
          {/* HDRI Environment for realistic specular highlights & ambient reflections */}
          <Environment preset="city" environmentIntensity={0.65} />

          <SceneErrorBoundary>
            {/* Room Shell */}
            <ArchitecturalRoomShell
              length={room.length_ft || 10}
              width={room.width_ft || 8}
              height={room.height_ft || 8}
              theme={bundle?.theme || "Minimalist Modern"}
            />

            {/* Kohler Fixtures — key={sku} ensures React reconciles on SKU change */}
            {fixtures.map((f, i) => (
              <UnifiedFixture key={f.sku || i} fixture={f} />
            ))}
          </SceneErrorBoundary>
        </Suspense>

        <CameraController viewPreset={viewPreset} cameraSettings={cameraSettings} />
      </Canvas>

      {/* Floating Camera Preset Bar (Top-Right) */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, zIndex: 10 }}>
        <button
          onClick={() => setViewPreset("iso")}
          className="btn btn-secondary btn-sm"
          style={{
            background: viewPreset === "iso" ? '#0f172a' : 'rgba(255, 255, 255, 0.92)',
            color: viewPreset === "iso" ? '#ffffff' : '#0f172a',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer'
          }}
        >
          <Box size={13} /> 3D Orbit
        </button>

        <button
          onClick={() => setViewPreset("top")}
          className="btn btn-secondary btn-sm"
          style={{
            background: viewPreset === "top" ? '#0f172a' : 'rgba(255, 255, 255, 0.92)',
            color: viewPreset === "top" ? '#ffffff' : '#0f172a',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer'
          }}
        >
          <Compass size={13} /> Top Plan
        </button>

        <button
          onClick={() => setViewPreset("front")}
          className="btn btn-secondary btn-sm"
          style={{
            background: viewPreset === "front" ? '#0f172a' : 'rgba(255, 255, 255, 0.92)',
            color: viewPreset === "front" ? '#ffffff' : '#0f172a',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer'
          }}
        >
          <Eye size={13} /> Eye Level
        </button>

        <button
          onClick={() => setViewPreset("iso")}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            color: '#0f172a',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer'
          }}
          title="Reset Camera Framing"
        >
          <RotateCcw size={13} /> Auto-Fit
        </button>
      </div>

      {/* AR Button — Cross-platform Android WebXR and iOS Apple AR Quick Look */}
      <div style={{ position: 'absolute', top: 56, right: 14, zIndex: 10 }}>
        <ARButton bundle={bundle} />
      </div>

      {/* Floating Status & Dimensions Badge (Bottom-Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#0f172a',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {room.length_ft}' × {room.width_ft}' Room ({room.area_sqft || (room.length_ft * room.width_ft)} sq ft) • 1 Unit = 1 Foot Scale
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            color: '#475569',
            padding: '5px 11px',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            maxWidth: '380px',
            border: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <Info size={13} color="var(--color-grey-500)" style={{ flexShrink: 0 }} />
          <span>
            <b>Interactive 3D:</b> Left-click + drag to orbit • Right-click to pan • Scroll to zoom.
          </span>
        </div>
      </div>
    </div>
  );
}
