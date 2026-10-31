# ULUGBEK AI Virtual Laboratory — Operations

## Eight coordinators and an elastic worker pool

The eight specialist roles are permanent coordination functions, not a fixed limit on how many tasks can be handled:

1. Chief Scientist — prioritizes work and coordinates research plans.
2. Benchmark Analyst — designs repeatable evaluations.
3. Public Researcher — plans research from official public and permitted sources.
4. Security Auditor — threat models and reviews proposed changes.
5. Software Architect — produces implementation plans and acceptance criteria.
6. Product Strategist — studies user needs and drafts product proposals.
7. Systems Engineer — plans safe computer and IoT integrations.
8. Quality Verifier — defines regression and acceptance checks.

For each workload, the coordinator can assign many temporary worker slots. The pool is elastic in configuration: it can process a larger batch than eight tasks, and its concurrency can be increased when real compute capacity is provisioned. The current prototype has a hard safety cap of 64 concurrent worker slots per process; the default is 4. This is a deliberate prototype limit, not a claim that 64 machines or independent AI models exist. A future distributed deployment can use many worker processes across multiple machines, with capacity controlled by actual CPU/GPU, memory, queue depth, rate limits, and budget. It must never create billions of live processes.

These are currently software roles in a deterministic simulation coordinator. They are not eight independent trained neural models or real autonomous researchers.

## Run locally

Requires Node.js 20 or newer; no additional package is needed.

```sh
node --test virtual-lab.test.js
```

The module can be imported by a future worker:

```js
const { createVirtualLab } = require("./virtual-lab");
const lab = createVirtualLab({ maxWorkers: 4 });
await lab.load();
await lab.enqueue({ type: "benchmark", title: "Evaluate Uzbek reasoning" });
const report = await lab.runCycle({ maxTasks: 100, concurrency: 4 });
console.log(report.status);
```

Set `VIRTUAL_LAB_MAX_WORKERS` to configure the process concurrency (1–64). Do not raise it beyond the actual resources available to the process.

## Task types

- `benchmark`
- `research`
- `product`
- `security`
- `engineering`
- `device`

Unknown task types are rejected. The coordinator creates transparent plans and records limitations. It never evaluates downloaded code, invokes a shell, accesses secrets, sends messages, changes production, or controls physical equipment.

## Persistence and hosting

The default state file is `data/virtual-lab.json` with restrictive file permissions and atomic replacement. This is suitable only for a local prototype. It is not durable on ephemeral hosting and is not a distributed queue. Before unattended multi-month operation, migrate state to a managed database, add worker leases/locking, retries with dead-letter handling, backups, alerting, and independent health monitoring. Distributed workers must claim tasks transactionally so two workers do not execute the same task.

## Parallelism and time

The prototype uses a bounded in-process worker pool; its current task handler is a deterministic simulation, not parallel neural-network inference. More workers do not automatically mean more intelligence or faster results. Real scaling requires provisioned compute, independent worker processes, a durable queue, task isolation, model-serving capacity, rate limits, observability, and a budget. One physical second cannot become a billion hours, and eight billion simultaneously running agents are not a realistic target. The scalable goal is to create as many short-lived worker tasks as the infrastructure can safely sustain.

## Production gates

The lab may eventually research public information, produce isolated patches, run allowlisted tests, and open pull requests. Human approval remains required for production merge/deploy, billing, external communications, access to private data, admin/security changes, and all physical or medical device control.
