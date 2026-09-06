import React from "react";
import { Placed } from "./Stage";
import { rgba } from "../palette";

/**
 * What grounds an object: the soft shadow it casts on the surface under it.
 * Lies flat in the world (rotated 90 degrees about X), so it foreshortens
 * correctly as the camera looks down and skews with an orbit.
 */
export const ContactShadow: React.FC<{
  /** Footprint in stage px. */
  width: number;
  depth: number;
  /** Where the floor is, in stage px below the origin. */
  y: number;
  z?: number;
  /** 0..1 */
  strength?: number;
  /** Blur radius in px. */
  softness?: number;
}> = ({ width, depth, y, z = 0, strength = 0.7, softness = 40 }) => (
  <Placed x={0} y={y} z={z} rotateX={90} width={width * 1.6} height={depth * 1.6}>
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse at center, rgba(0,0,0,${strength}) 0%, rgba(0,0,0,${strength * 0.5}) 35%, transparent 70%)`,
        filter: `blur(${softness}px)`,
      }}
    />
  </Placed>
);

/**
 * A faint pool of light on the floor under a lit screen - what makes an
 * open laptop in a dark room look switched on.
 */
export const ScreenSpill: React.FC<{
  width: number;
  depth: number;
  y: number;
  z?: number;
  color: string;
  /** 0..1 */
  intensity: number;
}> = ({ width, depth, y, z = 0, color, intensity }) => (
  <Placed x={0} y={y} z={z} rotateX={90} width={width * 1.8} height={depth * 1.4}>
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 50% 30%, ${color} 0%, transparent 65%)`,
        opacity: intensity,
        filter: "blur(30px)",
        mixBlendMode: "screen",
      }}
    />
  </Placed>
);

/**
 * A desk or floor plane: a big surface lying flat, lit from the middle and
 * falling to black at the edges so it reads as a surface in a dark room
 * rather than a rectangle. Gives a camera move something to parallax.
 */
export const Surface: React.FC<{
  /** Stage px below the origin. */
  y: number;
  /** Size of the plane; make it far bigger than the frame. */
  size: number;
  /** Brand hex the pool of light is tinted with. */
  color: string;
  /** Where the lit pool sits along the depth, 0 (near) .. 1 (far). */
  focus?: number;
  opacity?: number;
}> = ({ y, size, color, focus = 0.4, opacity = 1 }) => (
  <Placed x={0} y={y} z={0} rotateX={90} width={size} height={size}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        // Only ever lighter than the room, and fading to nothing: a plane
        // that darkens the environment draws its own far edge as a horizon.
        background: `radial-gradient(ellipse at 50% ${focus * 100}%, ${rgba(color, 0.42)} 0%, ${rgba(color, 0.16)} 28%, transparent 58%)`,
        mixBlendMode: "screen",
      }}
    />
  </Placed>
);
