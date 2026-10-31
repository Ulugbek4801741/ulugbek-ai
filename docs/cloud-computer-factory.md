# ULUGBEK AI Cloud Computer Factory

## Goal
Let users create Linux cloud computers by selecting vCPU, RAM, storage, optional GPU, and quantity. A phone is a thin client; real compute and storage must come from a managed server or an explicitly opted-in user-owned device.

## Resource semantics
- vCPU is a virtual allocation, not necessarily dedicated physical cores.
- RAM belongs to each VM. RAM from many VMs does not automatically become one shared RAM pool.
- Clusters distribute supported workloads; applications must be designed for parallel execution.
- Disk capacity is provisioned storage, not unlimited speed or bandwidth.
- GPU is offered only when compatible physical capacity is available.
- Reject or queue requests exceeding real capacity. Never claim a VM is ready before provisioning and health checks pass.

## Architecture
1. Account, authentication, subscription, and consent service.
2. Cloud Computer API and configuration validator.
3. Resource scheduler and quota service.
4. KVM/QEMU VM layer; containers only for workloads that do not need a separate kernel.
5. Per-tenant network isolation, firewall, secrets, and encrypted storage.
6. Browser remote-desktop gateway and lightweight legacy client.
7. Metering, billing, notifications, audit log, and abuse monitoring.
8. Backup/export and verified secure-erasure workflow.

## Six-month non-payment policy
The retention clock starts at the first recorded missed payment, stored in UTC and calculated using calendar months.

- On non-payment, block new sessions and seal the VM volume. Do not expose the disk to the user interface or another tenant.
- Keep the volume inaccessible during the six-month retention window, except through an authenticated export/recovery workflow permitted by policy.
- Notify the customer at suspension and at configured milestones, such as 7, 30, 90, 150 days, and before expiry. Include the expiry date and export instructions.
- If payment is restored before expiry, restore access after billing verification.
- After six calendar months, mark the volume purge_due. Time passing alone must not delete data.
- Require an approved purge job, no legal hold, final notice, and audit event. Use provider-supported secure erasure and verify it.
- Only after verified erasure may storage be released to another tenant. Never transfer or expose previous customer data.
- Obtain affirmative acceptance of the policy before purchase, publish a support/appeal path, and follow applicable privacy and consumer laws.

## Implementation boundary
The lifecycle helper is a pure policy module. It calculates states and guards purge/reassignment eligibility. It does not connect to a database, billing provider, hypervisor, or storage service and does not delete anything. Production requires persistent records, authenticated admin approval, idempotent background jobs, audit logs, backup-restore tests, and integration tests.

## Rollout
1. Local single-VM prototype with fixed limits.
2. Authentication, provisioning, and remote desktop.
3. Billing in test mode and lifecycle notifications.
4. Volume sealing, export, approved purge, and verified release.
5. Multi-VM clusters and optional GPU after capacity/isolation testing.
6. Paid public launch only after load, security, restore, and billing tests.
