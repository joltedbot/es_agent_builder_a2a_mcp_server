import { execFile } from "child_process";

const EXEC_TIMEOUT = parseInt(process.env.A2A_EXEC_TIMEOUT ?? "120000", 10);
const WORK_DIR = process.env.A2A_WORK_DIR ?? process.cwd();
const ALLOWED_TOOLS = "Read,Edit,Bash,Grep,Glob,Write";
const MAX_TURNS = "10";

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
    ];

    execFile("claude", args, { timeout: EXEC_TIMEOUT, cwd: WORK_DIR, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error(`Claude execution timed out after ${EXEC_TIMEOUT}ms`));
          return;
        }
        reject(new Error(`Claude CLI error: ${error.message}`));
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
  });
}
