import { tryIntrospect } from "./introspection";
import { MongoMeasurement } from "./mongoMeasurement";
tryIntrospect();

import native_core from "./native_core";
import { initOptimization } from "./optimization";

declare const __VERSION__: string;

const linuxPerf = new native_core.LinuxPerf();

export const isBound = native_core.isBound;

export let mongoMeasurement: MongoMeasurement;

export const setupCore = () => {
  initOptimization();
  native_core.Measurement.stopInstrumentation(
    `Metadata: codspeed-node ${__VERSION__}`
  );
  linuxPerf.start();
  mongoMeasurement = new MongoMeasurement();
};

export const teardownCore = () => {
  linuxPerf.stop();
  const aggregate = mongoMeasurement.terminate();
  if (aggregate !== undefined) {
    console.log(`[CodSpeed] Mongo Aggregate: ${aggregate}`);
    return;
  }
  console.log(`[CodSpeed] Mongo Aggregate: no aggregate`);
};

export { optimizeFunction, optimizeFunctionSync } from "./optimization";
export const Measurement = native_core.Measurement;
