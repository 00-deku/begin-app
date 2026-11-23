import { BadRequestError } from "../../shared/errors/index.js";

/**
 * Validation rules for profile updates and past work entries.
 */

const VALID_AVAILABILITY = [
  "Open to join",
  "Looking for co-founder",
  "Just exploring",
];

const VALID_LINK_TYPES = [
  "GitHub",
  "Behance",
  "Portfolio",
  "Figma",
  "Live Demo",
  "Other",
];

export function validatePastWorkPayload({ title, url, linkType, description }) {
  if (!title || !title.trim()) {
    throw new BadRequestError("Project title is required.");
  }
  if (!url || !url.trim()) {
    throw new BadRequestError("Project URL is required.");
  }

  const selectedLinkType = linkType && VALID_LINK_TYPES.includes(linkType) ? linkType : "Portfolio";

  return {
    title: title.trim(),
    url: url.trim(),
    linkType: selectedLinkType,
    description: (description || "").trim().slice(0, 280),
  };
}

export function validatePrivacyPayload(body) {
  const privacy = {};
  if (body.hideYear !== undefined) {
    privacy.hideYear = body.hideYear === true || body.hideYear === "true";
  }
  if (body.hideBranch !== undefined) {
    privacy.hideBranch = body.hideBranch === true || body.hideBranch === "true";
  }
  if (body.allowIntroRequests !== undefined) {
    privacy.allowIntroRequests = body.allowIntroRequests === true || body.allowIntroRequests === "true";
  }
  return privacy;
}
