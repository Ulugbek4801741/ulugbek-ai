"use strict";

const HIGH_RISK_PATTERNS = [
  /\b(send|publish|post|message|email|delete|remove|purchase|buy|pay|transfer|trade|deploy|release|chmod|permission|surgery|surgical|diagnos|prescribe)\b/i,
  /yubor|e.lon|o.chir|xarid|to.lov|pul|savdo|joylashtir|ruxsatni o.zgartir|jarrohlik|tashxis|dori yoz/i
];

const REQUIRED_STAGES = ["static_safety", "sandbox_tests", "independent_review"];
const APPROVAL_REQUIRED_ACTIONS = new Set(["send_message", "publish", "delete_file", "external_upload", "purchase", "payment", "trade", "deploy", "change_permissions", "medical_decision", "surgical_action"]);

function classifyRisk(task = "", action = "") {
  const text = `${String(task)} ${String(action)}`;
  if (APPROVAL_REQUIRED_ACTIONS.has(String(action).toLowerCase()) || HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) return "high";
  return "normal";
}

function createWorkflow(task, options = {}) {
  if (typeof task !== "string" || !task.trim()) throw new TypeError("Vazifa matni bo‘sh bo‘lmasligi kerak.");
  if (task.length > 4000) throw new RangeError("Vazifa 4000 belgidan oshmasligi kerak.");
  const risk = classifyRisk(task, options.action || "");
  return {
    id: options.id || null,
    task: task.trim(),
    status: "planned",
    risk,
    assignedAgents: ["universal-coordinator", "internet-agent", "engineering-agent"],
    fallbackAgent: "fallback-agent",
    stages: REQUIRED_STAGES.map((name) => ({ name, status: "pending", evidence: null })),
    requiresHumanApproval: risk === "high" || options.externalEffect === true,
    approval: "not_requested",
    executionAllowed: false,
    note: "Bu rejalashtirish ish oqimi. Tashqi amallar uchun haqiqiy adapterlar va ruxsatlar alohida sozlanishi shart."
  };
}

function recordStageResult(workflow, stageName, passed, evidence = "") {
  if (!workflow || !Array.isArray(workflow.stages)) throw new TypeError("Workflow yaroqsiz.");
  const index = REQUIRED_STAGES.indexOf(stageName);
  if (index < 0) throw new Error("Noma’lum tekshiruv bosqichi.");
  const stage = workflow.stages[index];
  if (index > 0 && workflow.stages.slice(0, index).some((item) => item.status !== "passed")) {
    throw new Error("Oldingi tekshiruv bosqichlari muvaffaqiyatli tugashi kerak.");
  }
  stage.status = passed === true ? "passed" : "failed";
  stage.evidence = String(evidence).slice(0, 1000);
  workflow.status = passed === true ? "reviewing" : "blocked";
  workflow.executionAllowed = false;
  if (passed !== true) workflow.approval = "blocked";
  return workflow;
}

function requestHumanApproval(workflow, decision) {
  if (!workflow || !Array.isArray(workflow.stages)) throw new TypeError("Workflow yaroqsiz.");
  if (decision !== "approve" && decision !== "reject") throw new Error("Qaror approve yoki reject bo‘lishi kerak.");
  const allPassed = workflow.stages.length === REQUIRED_STAGES.length && workflow.stages.every((stage) => stage.status === "passed");
  if (!allPassed) throw new Error("Inson tasdig‘idan oldin uchala tekshiruv ham muvaffaqiyatli tugashi kerak.");
  workflow.approval = decision === "approve" ? "approved" : "rejected";
  workflow.status = decision === "approve" ? "approved_for_adapter" : "rejected";
  // Even approval does not execute tools; a separately configured, permission-scoped adapter is required.
  workflow.executionAllowed = false;
  return workflow;
}

function getWorkflowPolicy() {
  return {
    stages: [...REQUIRED_STAGES],
    highRiskActionsRequiringHumanApproval: [...APPROVAL_REQUIRED_ACTIONS],
    execution: "disabled_without_explicitly-configured-adapter",
    failClosed: true
  };
}

module.exports = { classifyRisk, createWorkflow, recordStageResult, requestHumanApproval, getWorkflowPolicy, REQUIRED_STAGES };