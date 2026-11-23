import { BadRequestError } from "../../shared/errors/index.js";

/**
 * Validation rules for discovery filters, follow actions, and shortlisting.
 */

export function validateFollowPayload({ targetType, targetId }) {
  if (!targetType || !["USER", "STARTUP"].includes(targetType)) {
    throw new BadRequestError("Valid targetType (USER or STARTUP) is required.");
  }
  if (!targetId) {
    throw new BadRequestError("targetId is required.");
  }
  return { targetType, targetId };
}

export function validateShortlistPayload({ itemType, itemId, note }) {
  if (!itemType || !["USER", "STARTUP"].includes(itemType)) {
    throw new BadRequestError("Valid itemType (USER or STARTUP) is required.");
  }
  if (!itemId) {
    throw new BadRequestError("itemId is required.");
  }
  return {
    itemType,
    itemId,
    note: (note || "").slice(0, 300),
  };
}
