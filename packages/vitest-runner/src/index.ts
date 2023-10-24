import {
  Measurement,
  optimizeFunction,
  setupCore,
  teardownCore,
} from "@codspeed/core";
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

  // run nested suites first
  if (benchmarkSuiteGroup.length) {
    await Promise.all(
      benchmarkSuiteGroup.map((subSuite) =>
        runBenchmarkSuite(subSuite, runner, currentSuiteName)
      )
    );
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

class CodSpeedRunner extends NodeBenchmarkRunner {
  /**
   * First thing that's getting called before actually collecting and running tests.
   *
   * Called with a list containing a single file: https://github.com/vitest-dev/vitest/blob/114a993c002628385210034a6ed625195fcc04f3/packages/vitest/src/runtime/entry.ts#L46
   */
  onBeforeCollect() {
    logCodSpeed(`running with @codspeed/vitest-runner v${__VERSION__}`);
    setupCore();
  }

  async runSuite(suite: Suite): Promise<void> {
    logCodSpeed(`running suite ${suite.name}`);
    await runBenchmarkSuite(suite, this);
    logCodSpeed(`running suite ${suite.name} done`);
  }
}

// TODO: change this with a new lifecycle method that runs after all paths have been run for all files
process.on("beforeExit", () => {
  console.log("beforeExit");
  teardownCore();
  logCodSpeed(`done running`);
});

process.on("disconnect", () => {
  console.log("disconnect");
  teardownCore();
  logCodSpeed(`done running`);
});

process.on("exit", () => {
  console.log("exit");
  teardownCore();
  logCodSpeed(`done running`);
});

export default CodSpeedRunner;
