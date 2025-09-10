#!/usr/bin/env node

/**
 * iOS 위치 시뮬레이션 (pymobiledevice3) 자동화 스크립트
 *
 * 기능:
 *  - (옵션) tunneld 기동: sudo python3 -m pymobiledevice3 remote tunneld --host 127.0.0.1 --port 49151
 *  - 위치 주입:          pymobiledevice3 developer dvt simulate-location set -- <lat> <lon>
 *  - 위치 원복:          pymobiledevice3 developer dvt simulate-location reset
 *
 * 사전 요구사항:
 *  - macOS 권장
 *  - python3, pip, 그리고  pymobiledevice3 설치 (pip install -U pymobiledevice3)
 *  - iPhone: Developer Mode 활성화 + 이 컴퓨터 신뢰(Trust)
 *
 * 사용법:
 *  - node src/ios-location.js --lat 37.56478 --lon 126.9912
 *  - node src/ios-location.js 37.56478 126.9912
 *  - node src/ios-location.js --reset
 *  - node src/ios-location.js --no-tunnel --lat -27.32112 --lon 153.06814
 */

const { spawn } = require("child_process");
const net = require("net");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 49151;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    lat: null,
    lon: null,
    reset: false,
    noTunnel: false // 이미 tunneld를 따로 띄웠다면 true로
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--host") opts.host = args[++i] || DEFAULT_HOST;
    else if (a === "--port") opts.port = Number(args[++i] || DEFAULT_PORT);
    else if (a === "--lat") opts.lat = args[++i];
    else if (a === "--lon") opts.lon = args[++i];
    else if (a === "--reset") opts.reset = true;
    else if (a === "--no-tunnel") opts.noTunnel = true;
    else if (!a.startsWith("-")) {
      if (opts.lat === null) opts.lat = a;
      else if (opts.lon === null) opts.lon = a;
    }
  }

  return opts;
}

function printUsageAndExit() {
  console.log(`
Usage:
  ios-simloc [--lat <value>] [--lon <value>] [--host 127.0.0.1] [--port 49151]
  ios-simloc <lat> <lon>
  ios-simloc --reset
  ios-simloc --no-tunnel --lat <value> --lon <value>

Examples:
  ios-simloc 37.56478 126.9912
  ios-simloc --lat 37.56478 --lon 126.9912
  ios-simloc --reset
  ios-simloc --no-tunnel --lat -27.32112 --lon 153.06814
`);
  process.exit(1);
}

function waitForPort(host, port, timeoutMs = 15000, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        tryAgain();
      });
      socket.once("error", () => {
        socket.destroy();
        tryAgain();
      });
      socket.connect(port, host);
    };

    const tryAgain = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout: ${host}:${port} not ready within ${timeoutMs}ms`));
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

function spawnTunneld(host, port) {
  const cmd = "sudo";
  const args = [
    "python3",
    "-m",
    "pymobiledevice3",
    "remote",
    "tunneld",
    "--host",
    host,
    "--port",
    String(port)
  ];

  console.log(`[tunneld] launching: ${cmd} ${args.join(" ")}`);
  const child = spawn(cmd, args, {
    stdio: "inherit" // sudo 비밀번호 입력을 위해 inherit
  });

  return child;
}

function runSimulateLocation(lat, lon) {
  return new Promise((resolve, reject) => {
    const cmd = "pymobiledevice3";
    const args = [
      "developer",
      "dvt",
      "simulate-location",
      "set",
      "--", // 음수 위/경도 옵션 파싱 방지
      String(lat),
      String(lon)
    ];

    console.log(`[simulate] running: ${cmd} ${args.join(" ")}`);
    const child = spawn(cmd, args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`simulate-location exited with code ${code}`));
    });
  });
}

async function runResetLocation() {
  const cmd = "pymobiledevice3";
  const makeArgs = (sub) => ["developer", "dvt", "simulate-location", sub];

  const tryRun = (sub) =>
    new Promise((resolve) => {
      const args = makeArgs(sub);
      console.log(`[reset] running: ${cmd} ${args.join(" ")}`);
      const child = spawn(cmd, args, { stdio: "inherit" });
      child.on("error", () => resolve(false));
      child.on("exit", (code) => resolve(code === 0));
    });

  // Some pymobiledevice3 versions use 'clear' instead of 'reset'. Try a few.
  const candidates = ["reset", "clear", "unset", "stop"];
  for (const sub of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await tryRun(sub);
    if (ok) return;
    console.log(`[reset] '${sub}' failed, trying next if available...`);
  }
  throw new Error(
    "simulate-location reset/clear failed. Check 'pymobiledevice3 developer dvt simulate-location -h' for supported subcommands."
  );
}

(async () => {
  const opts = parseArgs();
  const doReset = opts.reset === true;

  if (!doReset && (opts.lat == null || opts.lon == null)) {
    printUsageAndExit();
  }

  let tunnelProc = null;

  try {
    if (!opts.noTunnel) {
      tunnelProc = spawnTunneld(opts.host, opts.port);

      const clean = () => {
        if (tunnelProc && !tunnelProc.killed) {
          try {
            process.kill(tunnelProc.pid, "SIGTERM");
          } catch (_) {}
        }
      };
      process.on("SIGINT", () => { clean(); process.exit(130); });
      process.on("SIGTERM", () => { clean(); process.exit(143); });

      console.log(`[tunneld] waiting for ${opts.host}:${opts.port} ...`);
      await waitForPort(opts.host, opts.port, 20000, 300);
      console.log("[tunneld] ready.");
    } else {
      console.log("[tunneld] skipped (--no-tunnel). Make sure tunneld is already running.");
    }

    if (doReset) {
      await runResetLocation();
      console.log("[reset] done.");
    } else {
      await runSimulateLocation(opts.lat, opts.lon);
      console.log("[simulate] done.");
    }
  } catch (err) {
    if (doReset) console.error("[reset] failed:", err.message);
    else console.error("[error]", err.message);
    process.exitCode = doReset ? 2 : 1;
  } finally {
    if (tunnelProc && !tunnelProc.killed) {
      try {
        process.kill(tunnelProc.pid, "SIGTERM");
      } catch (_) {}
    }
  }
})();
