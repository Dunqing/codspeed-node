import {
  Measurement,
  optimizeFunction,
  setupCore,
  teardownCore,
} from "@codspeed/core";
import { existsSync, writeFileSync } from "fs";
import { Benchmark, Suite } from "vitest";
import { NodeBenchmarkRunner } from "vitest/runners";
import { getBenchFn } from "vitest/suite";

declare const __VERSION__: string;

/**
 * @deprecated
 * TODO: try to use something like `updateTask` from `@vitest/runner` instead to use the output
 * of vitest instead console.log but at the moment, `updateTask` is not exposed
 */
function logCodSpeed(message: string) {
  console.log(`[CodSpeed] ${message}`);
}

async function runBenchmarkSuite(
  suite: Suite,
  runner: NodeBenchmarkRunner,
  parentSuiteName?: string
) {
  const benchmarkGroup: Benchmark[] = [];
  const benchmarkSuiteGroup: Suite[] = [];
  for (const task of suite.tasks) {
    if (task.mode !== "run") continue;

    if (task.meta?.benchmark) benchmarkGroup.push(task as Benchmark);
    else if (task.type === "suite") benchmarkSuiteGroup.push(task);
  }

  const currentSuiteName = parentSuiteName
    ? parentSuiteName + "::" + suite.name
    : suite.name;

  // run nested suites first, sequentially
  if (benchmarkSuiteGroup.length) {
    for (const subSuite of benchmarkSuiteGroup) {
      await runBenchmarkSuite(subSuite, runner, currentSuiteName);
    }
  }

  // return early if there are no benchmarks to run
  if (benchmarkGroup.length === 0) {
    return;
  }

  for (const benchmark of benchmarkGroup) {
    const uri = `${currentSuiteName}::${benchmark.name}`;
    // @ts-expect-error we do not need to bind the function to an instance of tinybench's Bench
    const fn = getBenchFn(benchmark).bind(this);

    // run optimizations
    await optimizeFunction(fn);

    // run instrumented benchmark
    await (async function __codspeed_root_frame__() {
      Measurement.startInstrumentation();
      await fn();
      Measurement.stopInstrumentation(uri);
    })();

    logCodSpeed(`${uri} done`);
  }
}

const ALREADY_RUN_ONCE_FILE = "/tmp/codspeed-vitest-runner-already-run-once";

/**
 * TODO: call `setupCore` and `teardownCore` only once for all suites and files.
 * At the moment it will be called once for each bench file.
 */
class CodSpeedRunner extends NodeBenchmarkRunner {
  /**
   * Called once per file, see Called with a list containing a single file: https://github.com/vitest-dev/vitest/blob/114a993c002628385210034a6ed625195fcc04f3/packages/vitest/src/runtime/entry.ts#L46
   *
   * TODO: this uses a file to know if it has already been run, but this is really not ideal
   * TODO: `teardownCore` is not called because there is no way to know when all the tests are done
   */
  onBeforeRunFiles() {
    if (existsSync(ALREADY_RUN_ONCE_FILE)) {
      logCodSpeed("setup - already run once, skipping");
      return;
    }
    logCodSpeed(`setup - running with @codspeed/vitest-runner v${__VERSION__}`);
    setupCore();
    writeFileSync(ALREADY_RUN_ONCE_FILE, "");
  }

  async runSuite(suite: Suite): Promise<void> {
    logCodSpeed(`running suite ${suite.name}`);
    await runBenchmarkSuite(suite, this);
    logCodSpeed(`running suite ${suite.name} done`);
  }

  /**
   * Called once per file, see Called with a list containing a single file: https://github.com/vitest-dev/vitest/blob/114a993c002628385210034a6ed625195fcc04f3/packages/vitest/src/runtime/entry.ts#L46
   *
   * TODO: calling this will prevent having another benchmark file working, as it will stop the perf map generation
   */
  onAfterRunFiles() {
    logCodSpeed(`running teardown`);
    teardownCore();
  }
}

export default CodSpeedRunner;
