import { spawn } from "child_process";

const rawTimeout = parseInt(process.env.A2A_EXEC_TIMEOUT ?? "120000", 10);
const EXEC_TIMEOUT = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 120000;
const WORK_DIR = process.env.A2A_WORK_DIR ?? process.cwd();
const ALLOWED_TOOLS = "Read,Edit,Bash,Grep,Glob,Write";
const MAX_TURNS = "10";
const MAX_BUFFER = 2 * 1024 * 1024;

export function executeClaude(message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      message,
      "--output-format",
      "json",
      "--allowedTools",
      ALLOWED_TOOLS,
      "--max-turns",
      MAX_TURNS,
      "--",
    ];

    const child = spawn("claude", args, {
      cwd: WORK_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, EXEC_TIMEOUT);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_BUFFER) {
        killed = true;
        child.kill("SIGTERM");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_BUFFER) {
        stderr += chunk.toString();
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (killed) {
        reject(new Error(`Claude execution timed out after ${EXEC_TIMEOUT}ms`));
        return;
      }

      if (code !== 0) {
        console.error(`[claude-executor] exited with code ${code}, stderr: ${stderr.slice(0, 200)}`);
        reject(new Error(`Claude CLI exited with code ${code}`));
        return;
      }

      if (stderr) {
        console.error(`[claude-executor] stderr: ${stderr.slice(0, 200)}`);
      }

      try {
        const output = JSON.parse(stdout);
        // Claude --output-format json returns { result: "text", ... }
        const text = output.result ?? output.text ?? output.content ?? stdout;
        resolve(typeof text === "string" ? text : JSON.stringify(text));
      } catch {
        // If not valid JSON, return raw stdout
        resolve(stdout.trim());
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Claude CLI error: ${err.message}`));
    });
  });
}
