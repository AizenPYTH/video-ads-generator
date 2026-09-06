import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera as ThreePerspectiveCamera, Vector3 } from "three";
import { resolveCamera, type Camera3D } from "./state";

/**
 * The scene camera, driven entirely by a `Camera3D` state computed from
 * the current frame. Nothing here accumulates between frames, so the
 * same frame always yields the same view - in the Player and on the
 * render farm.
 */
export const CameraRig: React.FC<{ camera: Camera3D; aspect: number }> = ({ camera, aspect }) => {
  const set = useThree((state) => state.set);
  const cam = useMemo(() => new ThreePerspectiveCamera(32, 1, 0.05, 100), []);

  useLayoutEffect(() => {
    set({ camera: cam });
  }, [cam, set]);

  useLayoutEffect(() => {
    const { position, target } = resolveCamera(camera);
    cam.position.set(position[0], position[1], position[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(new Vector3(target[0], target[1], target[2]));
    if (camera.roll !== 0) cam.rotateZ((camera.roll * Math.PI) / 180);
    cam.fov = camera.fov;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [cam, camera, aspect]);

  return null;
};
