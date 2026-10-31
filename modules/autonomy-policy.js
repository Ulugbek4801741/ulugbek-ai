"use strict";

// Permission policy for the three agreed autonomy levels.
// This module classifies proposed actions; it does not execute them.
const RULES = Object.freeze({
  plan_goal: "allow",
  read_approved_knowledge: "allow",
  research_public_web: "allow",
  compare_sources: "allow",
  save_unverified_note: "allow",
  save_verified_knowledge: "approval",
  write_code_in_sandbox: "allow",
  run_tests_in_sandbox: "allow",
  prepare_patch: "allow",
  install_dependency: "approval",
  access_private_user_data: "approval",
  send_external_message: "approval",
  publish_content: "approval",
  modify_production_code: "approval",
  deploy_production: "approval",
  spend_money: "approval",
  change_account_or_permissions: "approval",
  delete_user_data: "blocked",
  disable_safety_controls: "blocked",
  evade_law_or_safety: "blocked",
  harm_person: "blocked",
  control_physical_device: "approval"
});

function evaluateAction(action) {
  if (typeof action !== "string" || !action.trim()) {
    return { decision: "approval", reason: "Noma'lum amal: avval aniqlashtirish va ruxsat kerak." };
  }
  const key = action.trim();
  const decision = RULES[key] || "approval";
  const reasons = {
    allow: "Oldindan belgilangan xavfsiz doirada mustaqil bajarish mumkin.",
    approval: "Tashqi ta'sir, maxfiy ma'lumot yoki muhim o'zgarish ehtimoli bor; bajarishdan oldin ruxsat kerak.",
    blocked: "Bu amal xavfsizlik siyosati bilan taqiqlangan."
  };
  return { action: key, decision, reason: reasons[decision] };
}

function policyStatus() {
  return {
    autonomyLevels: ["safe_independence", "extended_independence", "scientific_research"],
    defaultDecision: "approval",
    unknownActions: "approval",
    blockedActionsCannotBeOverriddenByAgent: true,
    executionEnabled: false,
    note: "Bu ruxsat baholash qatlami; real ijrochi, sandbox va monitoring alohida qurilishi kerak."
  };
}

module.exports = { evaluateAction, policyStatus };
