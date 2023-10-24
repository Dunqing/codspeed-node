import { Measurement, setupCore, teardownCore } from "@codspeed/core";
import { Benchmark, Suite } from "vitest";
import { NodeBenchmarkRunner } from "vitest/runners";
import { getBenchFn } from "vitest/suite";

declare const __VERSION__: string;

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
    await fn();

    // run instrumented benchmark
    await (async function __codspeed_root_frame__() {
      Measurement.startInstrumentation();
      await fn();
      Measurement.stopInstrumentation(uri);
    })();

    // TODO: try to use something like `updateTask` instead to use the output of vitest instead console.log
    console.log(`[CodSpeed] ${uri} done`);
  }
}

class CodSpeedRunner extends NodeBenchmarkRunner {
  async runSuite(suite: Suite): Promise<void> {
    // TODO: try to use something like `updateTask` instead to use the output of vitest instead console.log
    console.log(
      `[CodSpeed] running with @codspeed/vitest-runner v${__VERSION__}`
    );

    // TODO move in module scope, or try to find a lifecycle that actually works with bench
    setupCore();
    await runBenchmarkSuite(suite, this);
    // TODO move in module scope, or try to find a lifecycle that actually works with bench
    teardownCore();

    // TODO: try to use something like `updateTask` instead to use the output of vitest instead console.log
    console.log(`[CodSpeed] Done running benches.`);
  }
}

export default CodSpeedRunner;
