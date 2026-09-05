import type React from "react";
import type { Phases } from "../phases";
import type { DeviceType } from "../../../src/types";
import type { Theme } from "../theme";

export interface ScreenDims {
  width: number;
  height: number;
}

/**
 * What every animated device needs. `screen` is a render prop: the device
 * works out how big its own screen is, then asks for the content at that
 * size, so the carousel never has to guess a bezel.
 */
export interface AnimatedDeviceProps {
  device: DeviceType;
  theme: Theme;
  phases: Phases;
  /** The area on the canvas the device has to fit inside. */
  box: ScreenDims;
  screen: (dims: ScreenDims) => React.ReactNode;
}
