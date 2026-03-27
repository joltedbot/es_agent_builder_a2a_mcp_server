const host = process.env.A2A_HOST ?? "127.0.0.1";
const port = parseInt(process.env.A2A_PORT ?? "3008", 10);

export function getAgentCard() {
  return {
    name: "Claude Code Agent",
    description:
      "AI coding assistant powered by Claude Code. Capable of reading, writing, and analyzing code, running shell commands, and performing complex software engineering tasks.",
    version: "1.0.0",
    default_input_modes: ["text"],
    default_output_modes: ["text"],
    capabilities: {
      streaming: false,
    },
    supported_interfaces: [
      {
        protocol_binding: "JSONRPC",
        url: `http://${host}:${port}`,
      },
    ],
    skills: [
      {
        id: "code_assistance",
        name: "Code Assistance",
        description:
          "Read, write, edit, and analyze code. Fix bugs, implement features, refactor, and review code.",
        tags: ["coding", "development"],
        examples: [
          "Fix the failing test in src/auth.ts",
          "Add input validation to the login endpoint",
          "Explain how the routing system works",
        ],
      },
      {
        id: "shell_commands",
        name: "Shell Commands",
        description:
          "Run shell commands, build projects, run tests, manage git operations.",
        tags: ["shell", "devops"],
        examples: [
          "Run the test suite and fix any failures",
          "What is the git status of this project?",
        ],
      },
      {
        id: "file_operations",
        name: "File Operations",
        description:
          "Search, read, create, and modify files across the project.",
        tags: ["files", "search"],
        examples: [
          "Find all files that import the auth module",
          "Create a new configuration file for the API",
        ],
      },
    ],
  };
}
