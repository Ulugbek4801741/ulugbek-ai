# ULUGBEK AI — Oracle Cloud Always Free deployment foundation

This is the first-host deployment path for the existing Node.js application. It does **not** claim multi-region high availability yet. The current app stores task state, lab knowledge, agent memory, and watchdog state in local JSON files under `data/`; therefore run exactly one application instance until those stores are migrated to a shared durable database/queue.

## Why Oracle Cloud Always Free first

Oracle documents Always Free compute resources in the tenancy's home region:
- Ampere A1 allowance equivalent to up to 2 OCPUs and 12 GB RAM in total.
- Up to 200 GB total Block Volume storage, shared by boot and attached volumes.
- Up to two AMD E2.1.Micro instances (1 GB RAM each), subject to the same account and storage limits.
- A free load balancer is listed, but it is not required for the first single-server deployment.

These are account-level quotas, not a promise that capacity is available at signup time. Oracle may show "out of host capacity". Idle Always Free compute can be reclaimed under Oracle's published low-utilization policy. Check the current Always Free eligibility labels and usage in the Console before creating anything. Keep the account on Always Free resources only; do not create paid resources or upgrade billing without the owner's explicit approval.

Official limits: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Region choice

Choose the tenancy's home region carefully; Oracle says Always Free compute and block volumes must be created in that home region. The home region cannot be treated as a freely movable setting later.

Recommended decision:
1. **Frankfurt (Germany)** if available during signup and the free A1 capacity is available. Oracle lists three availability domains there, which offers more placement choices.
2. **Dubai (UAE)** if lower latency for Uzbekistan is more important and the free resources are available. Oracle lists one availability domain there.
3. **Abu Dhabi (UAE)** as another nearby alternative if Dubai is unavailable.

A region having multiple availability domains does not automatically create application failover. A1 quota, free capacity, networking, and storage eligibility must all be checked in the Console. Region list: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm

## Phase 1 — create one primary VM

1. Create an Oracle Cloud Free Tier account at https://www.oracle.com/cloud/free/.
2. Select the preferred home region using the decision above. Use your real billing/contact details; do not create duplicate accounts to bypass quotas.
3. In the OCI Console, create one Ubuntu 24.04 ARM-compatible VM using the **Always Free eligible** Ampere A1 shape. Start with 1 OCPU and 6 GB RAM; keep remaining A1 quota unused for a future standby only after the first VM is verified.
4. Use the default boot volume and verify the total boot + block volume allocation stays within the 200 GB Always Free quota.
5. Create a VCN and public subnet using the OCI wizard. Allow inbound TCP 22 only from your own trusted IP where practical. Do not expose database or Docker management ports publicly.
6. Assign a public IP. Keep SSH private key on your device; never upload it to GitHub or send it in chat.
7. Install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/

## Phase 2 — deploy the app

On the VM, clone the repository and build the container:

```bash
git clone https://github.com/Ulugbek4801741/ulugbek-ai.git
cd ulugbek-ai
docker build -t ulugbek-ai:primary .
mkdir -p data
cp .env.example .env
chmod 600 .env
nano .env
```

Set the required private values in `.env` on the server only. At minimum:
- `FRONTEND_ORIGIN=https://ulugbek4801741.github.io`.
- `LAB_ADMIN_TOKEN`: a different random secret of at least 32 characters.
- `ADMIN_ACCESS_CODE`: a private administrator PIN/passphrase; set it only in the server `.env` file (never in GitHub or chat).
- `ADMIN_SESSION_SECRET`: a unique random secret of at least 32 characters.
- AI provider key only if a paid/hosted model is intentionally enabled. Keep `GEMINI_ALLOW_CHAT_CONTENT=false` unless the owner explicitly approves sending chat content to Google.

Do not paste secrets into GitHub, source files, public issue comments, or this chat. Do not set a billing method or create paid resources as part of this procedure.

Start one instance:

```bash
docker run -d \
  --name ulugbek-ai \
  --restart unless-stopped \
  --init \
  --env-file .env \
  -p 127.0.0.1:3000:3000 \
  -v "$PWD/data:/app/data" \
  ulugbek-ai:primary
```

The service binds to localhost so it is not exposed directly to the Internet. Put a TLS reverse proxy (for example Caddy) in front of it and configure a domain with valid HTTPS before connecting the GitHub Pages frontend. Do not use plain HTTP for the public API.

Verify locally on the VM:

```bash
curl -fsS http://127.0.0.1:3000/api/health
docker ps
docker logs --tail 100 ulugbek-ai
```

Then verify the public HTTPS health URL from a browser:
`https://YOUR_BACKEND_DOMAIN/api/health`

Only after the public HTTPS health check succeeds should `public/config.js` be updated to that exact backend origin.

## Phase 3 — backups and storage

- Keep application state in the mounted `data/` directory, not inside the disposable container.
- Create encrypted, versioned backups of `data/` and database exports to a separate provider. Test restore before relying on backups.
- Cloudflare R2 currently documents a free allowance of 10 GB-month Standard storage, 1 million Class A operations and 10 million Class B operations per month, with no egress fee. It is object storage, **not** a shared POSIX disk or database. Configure alerts and verify account billing settings before use.
  Pricing: https://developers.cloudflare.com/r2/pricing/
- Never place unencrypted secrets, OAuth tokens, or raw private user data in public buckets.
- Do not use a sleeping free database as the only production database. Supabase Free documents 500 MB database and project pausing after one week of inactivity; Koyeb's single Free web service has 512 MB RAM, 0.1 vCPU, 2 GB SSD, scales to zero after one hour, and cannot use persistent volumes or worker services. These are useful for experiments or later independent checks, not a guaranteed always-on failover target.
  Supabase: https://supabase.com/pricing
  Koyeb: https://www.koyeb.com/docs/reference/instances

## Phase 4 — real failover (not enabled yet)

Do **not** start two copies of the current application against separate local JSON stores. They would diverge and could overwrite task state.

Before enabling a second active/standby server, implement and test:
1. A shared durable database for users, conversations, knowledge and audit events.
2. A durable queue with leases, retry limits, idempotency keys and a dead-letter queue.
3. Shared object storage for uploaded files and encrypted backups.
4. A health-check controller hosted outside the primary VM.
5. A tested traffic switch (DNS/load balancer/proxy) and a restore/failover runbook.
6. Human approval for billing, credentials, destructive operations, external messaging and production deployments.

A second VM in the same Oracle region protects against a VM/process failure, not a region-wide outage. Cross-provider standby is a later stage and must use the same database/queue and a tested traffic-switch mechanism.

## Cost and safety guardrails

- This deployment plan is intended to remain within published Always Free quotas.
- Do not create extra VMs, disks, IPs, load balancers, or paid services unless the Console explicitly marks them Always Free and the account owner approves.
- Set budget notifications where available, review usage regularly, and stop if the Console shows billable usage.
- Free-tier availability, regional capacity, eligibility and terms can change. Re-check the provider's current terms before each resource is created.
