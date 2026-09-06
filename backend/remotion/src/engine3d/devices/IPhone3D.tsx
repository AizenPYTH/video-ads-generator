import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { type Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type CanvasTexture, type Object3D } from "three";
import { MM, modelUrl } from "../assets";

/**
 * The iPhone 15 Pro from the runtime GLB. Real geometry, the source's PBR
 * materials, and a "Screen" mesh whose material we own so any texture we
 * paint lands on the actual display surface.
 *
 * Model space is millimetres, phone standing up, screen facing +z, centre
 * of the body at the origin. `MM` scales it to world units.
 */
export const IPHONE_MM = { width: 69.8, height: 145.9, depth: 10.8 } as const;

const SCREEN_ROUGHNESS = 0.14;

function applyScreen(root: Object3D, texture: CanvasTexture, brightness: number): MeshStandardMaterial | null {
  const screen = root.getObjectByName("Screen");
  if (!(screen instanceof Mesh)) {
    console.warn("[IPhone3D] no Screen mesh in the model; the display will stay dark");
    return null;
  }
  screen.renderOrder = 10;
  const material =
    screen.material instanceof MeshStandardMaterial && screen.material.name === "ScreenRuntime"
      ? screen.material
      : new MeshStandardMaterial({ name: "ScreenRuntime" });
  material.color.set("#000000");
  material.emissive.set("#ffffff");
  material.emissiveMap = texture;
  material.emissiveIntensity = 1.05 * brightness;
  material.roughness = SCREEN_ROUGHNESS;
  material.metalness = 0;
  material.envMapIntensity = 0.9;
  // The body mesh has a face on the display plane. Pull the screen a hair
  // toward the camera in depth so it always wins that fight.
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  material.needsUpdate = true;
  screen.material = material;
  return material;
}

/** The source's glass gets a proper physical material once, on load. */
function refineMaterials(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
    const material = object.material;
    if (!(material instanceof MeshStandardMaterial)) return;
    material.envMapIntensity = 1.45;
    if (object.name === "Glass" || object.name === "LensGlass") {
      const physical = new MeshPhysicalMaterial({
        map: material.map,
        color: material.color,
        metalness: 0,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.2,
        transparent: object.name === "LensGlass",
        opacity: object.name === "LensGlass" ? 0.7 : 1,
      });
      object.material = physical;
    }
  });
}

export const IPhone3D: React.FC<{
  screen: CanvasTexture;
  brightness?: number;
  position?: [number, number, number];
  /** Degrees. */
  rotation?: [number, number, number];
  scale?: number;
}> = ({ screen, brightness = 1, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const gltf = useGLTF(modelUrl("iphone"));
  // One clone per instance so two phones in a scene do not share a screen.
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true) as Group;
    refineMaterials(clone);
    return clone;
  }, [gltf.scene]);

  // The model arrives asynchronously. Under Remotion's manual frame loop
  // nothing re-renders on its own after that, so ask for a frame once the
  // screen material is in place - otherwise the render shows whatever
  // was on screen before the phone loaded.
  const advance = useThree((state) => state.advance);
  useLayoutEffect(() => {
    applyScreen(model, screen, brightness);
    advance(performance.now());
  }, [model, screen, brightness, advance]);

  useEffect(
    () => () => {
      model.traverse((object) => {
        if (object instanceof Mesh) {
          const material = object.material;
          if (material instanceof MeshStandardMaterial && material.name === "ScreenRuntime") material.dispose();
        }
      });
    },
    [model],
  );

  const rad = rotation.map((deg) => (deg * Math.PI) / 180) as [number, number, number];
  return (
    <group position={position} rotation={rad} scale={scale}>
      {/* Centre the body: the source's front face sits at z=0 with the body behind it. */}
      <primitive object={model} scale={MM} position={[0, 0, (IPHONE_MM.depth / 2) * MM]} />
    </group>
  );
};

useGLTF.preload(modelUrl("iphone"));
