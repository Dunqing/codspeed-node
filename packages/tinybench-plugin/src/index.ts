import { initCore, measurement, optimizeFunction } from "@codspeed/core";
import { findUpSync, Options } from "find-up";
import path, { dirname } from "path";
import { get as getStackTrace } from "stack-trace";
import { Bench, Task } from "tinybench";
import { fileURLToPath } from "url";

declare const __VERSION__: string;

type CodSpeedBenchOptions = Task["opts"] & {
  uri: string;
};

function isCodSpeedBenchOptions(
  options: Task["opts"]
): options is CodSpeedBenchOptions {
  return "uri" in options;
}

export function withCodSpeed(bench: Bench): Bench {
  if (!measurement.isInstrumented()) {
    const rawRun = bench.run;
    bench.run = async () => {
      console.warn(
        `[CodSpeed] ${bench.tasks.length} benches detected but no instrumentation found, falling back to tinybench`
      );
      return await rawRun.bind(bench)();
    };
    return bench;
  }
  initCore();

  const rawAdd = bench.add;
  bench.add = (name, fn, opts: CodSpeedBenchOptions) => {
    const callingFile = getCallingFile();
    const uri = `${callingFile}::${name}`;
    const options = Object.assign({}, opts ?? {}, { uri });
    return rawAdd.bind(bench)(name, fn, options);
  };
  const rootCallingFile = getCallingFile();

  bench.run = async () => {
    console.log(`[CodSpeed] running with @codspeed/tinybench v${__VERSION__}`);
    for (const task of bench.tasks) {
      const uri = isCodSpeedBenchOptions(task.opts)
        ? task.opts.uri
        : `${rootCallingFile}::${task.name}`;
      await optimizeFunction(task.fn);
      await (async function __codspeed_root_frame__() {
        measurement.startInstrumentation();
        await task.fn();
        measurement.stopInstrumentation(uri);
      })();
      console.log(`    ✔ Measured ${uri}`);
    }
    console.log(`[CodSpeed] Done running ${bench.tasks.length} benches.`);
    return bench.tasks;
  };
  return bench;
}

function getCallingFile(): string {
  const stack = getStackTrace();
  let callingFile = stack[2].getFileName(); // [here, withCodSpeed, actual caller]
  const gitDir = getGitDir(callingFile);
  if (gitDir === undefined) {
    throw new Error("Could not find a git repository");
  }
  if (callingFile.startsWith("file://")) {
    callingFile = fileURLToPath(callingFile);
  }
  return path.relative(gitDir, callingFile);
}

function getGitDir(path: string): string | undefined {
  const dotGitPath = findUpSync(".git", {
    cwd: path,
    type: "directory",
  } as Options);
  return dotGitPath ? dirname(dotGitPath) : undefined;
}
