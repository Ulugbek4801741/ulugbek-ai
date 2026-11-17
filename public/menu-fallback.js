"use strict";
(() => {
  const buttonId = "settings-open";
  const modalId = "settings-modal";
  const closeId = "settings-close";
  const get = (id) => document.getElementById(id);

  function setOpen(open) {
    const button = get(buttonId);
    const modal = get(modalId);
    if (!button || !modal) return;
    modal.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      const first = modal.querySelector("button, select, input, textarea");
      if (first) first.focus({ preventScroll: true });
    } else {
      button.focus({ preventScroll: true });
    }
  }

  // Capture phase keeps the menu operable even if another app listener fails.
  document.addEventListener("pointerup", (event) => {
    const button = event.target && event.target.closest && event.target.closest("#" + buttonId);
    if (button && (event.pointerType === "touch" || event.pointerType === "pen")) {
      event.preventDefault();
      setOpen(true);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target || !target.closest) return;
    if (target.closest("#" + buttonId)) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (target.closest("#" + closeId) || target === get(modalId)) {
      setOpen(false);
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && get(modalId) && !get(modalId).hidden) {
      setOpen(false);
    }
  });
})();
