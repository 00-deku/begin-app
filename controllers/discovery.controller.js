import {
  searchMembers,
  searchStartups,
  globalSearch,
} from "../services/discovery.service.js";

/**
 * Controller handling member and startup directory discovery,
 * filterable search views, and unified search JSON endpoints.
 */

export async function renderDiscoveryPage(req, res) {
  try {
    const q = req.query.q || "";
    const tab = req.query.tab || "members";

    const memberFilters = {
      skill: req.query.skill,
      year: req.query.year,
      branch: req.query.branch,
      availability: req.query.availability,
      lookingFor: req.query.lookingFor,
    };

    const startupFilters = {
      industry: req.query.industry,
      stage: req.query.stage,
      hasOpenRoles: req.query.hasOpenRoles,
    };

    let members = [];
    let startups = [];

    if (tab === "startups") {
      startups = await searchStartups(q, startupFilters, req.user?.userId);
    } else if (tab === "all") {
      const results = await globalSearch(q, req.user?.userId);
      members = results.members;
      startups = results.startups;
    } else {
      members = await searchMembers(q, memberFilters, req.user?.userId);
    }

    return res.render("discovery/index", {
      user: res.locals.user,
      members,
      startups,
      query: q,
      tab,
      memberFilters,
      startupFilters,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load discovery directory.",
    });
  }
}

export async function searchMembersApi(req, res) {
  try {
    const q = req.query.q || "";
    const filters = {
      skill: req.query.skill,
      year: req.query.year,
      branch: req.query.branch,
      availability: req.query.availability,
      lookingFor: req.query.lookingFor,
    };

    const members = await searchMembers(q, filters, req.user?.userId);
    return res.status(200).json({ success: true, count: members.length, members });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function searchStartupsApi(req, res) {
  try {
    const q = req.query.q || "";
    const filters = {
      industry: req.query.industry,
      stage: req.query.stage,
      hasOpenRoles: req.query.hasOpenRoles,
    };

    const startups = await searchStartups(q, filters, req.user?.userId);
    return res.status(200).json({ success: true, count: startups.length, startups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function globalSearchApi(req, res) {
  try {
    const q = req.query.q || "";
    const results = await globalSearch(q, req.user?.userId);
    return res.status(200).json({
      success: true,
      query: q,
      membersCount: results.members.length,
      startupsCount: results.startups.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
