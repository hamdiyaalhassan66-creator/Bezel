// Fire a toast from anywhere (no props or context needed):
//   toast("Project saved")
//   toast("Moved to Trash", { action: { label: "Undo", onClick: () => restore(id) } })
//   toast("Couldn't copy the link", { type: "error" })
// opts: { type: "success" | "error", action: { label, onClick }, duration (ms) }
export function toast(message, opts = {}) {
  window.dispatchEvent(new CustomEvent("bezel:toast", { detail: { message, ...opts } }));
}