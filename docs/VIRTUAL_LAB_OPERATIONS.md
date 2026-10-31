# ULUGBEK AI Virtual Laboratory — Operations

## Specialist roster

The initial virtual roster has eight roles:

1. Chief Scientist — prioritizes work and coordinates research plans.
2. Benchmark Analyst — designs repeatable evaluations.
3. Public Researcher — plans research from official public and permitted sources.
4. Security Auditor — threat models and reviews proposed changes.
5. Software Architect — produces implementation plans and acceptance criteria.
6. Product Strategist — studies user needs and drafts product proposals.
7. Systems Engineer — plans safe computer and IoT integrations.
8. Quality Verifier — defines regression and acceptance checks.

These are software roles in a deterministic simulation coordinator. They are not eight independent trained neural models and do not currently browse, learn new weights, write code, or operate devices.

## Run locally

Requires Node.js 20 or newer; no additional package is needed.

```sh
node --test virtual-lab.test.js
```

The module can be imported by a future worker:

```js
const { createVirtualLab } = require("./virtual-lab");
const lab = createVirtualLab();
await lab.load();
await lab.enqueue({ type: "benchmark", title: "Evaluate Uzbek reasoning" });
const report = await lab.runCycle({ maxTasks: 8 });
console.log(report.status);
```

## Task types

- `benchmark`
- `research`
- `product`
- `security`
- `engineering`
- `device`

Unknown task types are rejected. The coordinator creates transparent plans and records limitations. It never evaluates downloaded code, invokes a shell, accesses secrets, sends messages, changes production, or controls physical equipment.

## Persistence and hosting

The default state file is `data/virtual-lab.json` with restrictive file permissions and atomic replacement. This is suitable only for a local prototype. It is not durable on ephemeral hosting and is not a distributed queue. Before unattended multi-month operation, migrate state to a managed database, add worker leases/locking, backups, alerting, and independent health monitoring.

## Parallelism and time

The current implementation processes a bounded batch sequentially. The eight roles are a roster, not eight CPU/GPU workers. Real parallel execution requires provisioned CPU/GPU capacity, concurrency limits, task isolation, and a durable queue. No system can turn one physical second into a billion hours; throughput is bounded by hardware, model inference speed, network latency, and budget.

## Production gates

The lab may eventually research public information, produce isolated patches, run allowlisted tests, and open pull requests. Human approval remains required for production merge/deploy, billing, external communications, access to private data, admin/security changes, and all physical or medical device control.
