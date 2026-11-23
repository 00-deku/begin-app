/**
 * String and regex utility helpers.
 */

export function escapeRegex(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function sanitizeEmail(email) {
  return (email || "").toLowerCase().trim();
}
