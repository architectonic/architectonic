#!/usr/bin/env node

import { agentCommand, remove, update, upgrade } from "../lib/manage.js";
import { init, installResolved } from "../lib/install.js";
import { diff, doctor, listCommand, mapCommand, status, verify } from "../lib/inspect.js";
import { helpCommand, helpFull, selfCheck, welcome } from "../lib/help.js";
import { onboard } from "../lib/organization.js";
import { COMMANDS, VERSION, icon, parse, printErr, println, resolveAddTargets } from "../lib/runtime.js";

const argv = process.argv.slice(2);

function main() {
  if (!argv.length) return welcome();
  if (argv.includes("--version") || argv.includes("-V")) return println(VERSION);
  if (argv.includes("--self-check")) return selfCheck();
  const command = argv[0];
  if (argv.includes("--help") || argv.includes("-h")) {
    if (COMMANDS.includes(command)) return helpCommand(command);
    return helpFull();
  }
  if (command === "init") return init(argv.slice(1));
  if (command === "add") {
    const parsed = parse(argv.slice(1));
    return installResolved(resolveAddTargets(parsed.targets), parsed.dir, parsed.source);
  }
  if (command === "onboard") return onboard(argv.slice(1));
  if (command === "list") return listCommand(argv.slice(1));
  if (command === "doctor") return doctor(argv.slice(1));
  if (command === "verify") return verify(argv.slice(1));
  if (command === "map") return mapCommand(argv.slice(1));
  if (command === "status") return status(argv.slice(1));
  if (command === "diff") return diff(argv.slice(1));
  if (command === "update") return update(argv.slice(1));
  if (command === "upgrade") return upgrade(argv.slice(1));
  if (command === "remove") return remove(argv.slice(1));
  if (command === "agent") return agentCommand(argv.slice(1));
  throw new Error(`Unknown command: ${command}\nRun architectonic --help.`);
}

try {
  main();
} catch (error) {
  printErr(`${icon("fail")} ${error.message}`);
  process.exitCode = 1;
}
