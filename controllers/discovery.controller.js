import {
  searchMembers,
  searchStartups,
  globalSearch,
  getSuggestedMatches,
  toggleFollow,
  getFollowingIds,
  toggleShortlist,
  getShortlist,
  getShortlistIds,
} from "../services/discovery.service.js";

/**
 * Controller handling member and startup directory discovery,
 * filterable search views, suggested matches, social follow tracking,
 * and private shortlisting endpoints.
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

    const userId = req.user?.userId;
    const [followingIds, shortlistIds] = await Promise.all([
      getFollowingIds(userId),
      getShortlistIds(userId),
    ]);

    if (tab === "startups") {
      startups = await searchStartups(q, startupFilters, userId);
    } else if (tab === "all") {
      const results = await globalSearch(q, userId);
      members = results.members;
      startups = results.startups;
    } else if (tab === "shortlist") {
      const shortlist = await getShortlist(userId);
      members = shortlist.members;
      startups = shortlist.startups;
    } else {
      members = await searchMembers(q, memberFilters, userId);
    }

    return res.render("discovery/index", {
      user: res.locals.user,
      members,
      startups,
      query: q,
      tab,
      memberFilters,
      startupFilters,
      followingMemberIds: followingIds.memberIds,
      followingStartupIds: followingIds.startupIds,
      shortlistedMemberIds: shortlistIds.memberIds,
      shortlistedStartupIds: shortlistIds.startupIds,
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

export async function getSuggestedMatchesApi(req, res) {
  try {
    const matches = await getSuggestedMatches(req.user?.userId);
    return res.status(200).json({
      success: true,
      recommendedMembersCount: matches.recommendedMembers.length,
      recommendedStartupsCount: matches.recommendedStartups.length,
      matches,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function toggleFollowApi(req, res) {
  try {
    const { targetType, targetId } = req.body;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: "targetType and targetId are required." });
    }
    const result = await toggleFollow(req.user?.userId, targetType, targetId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function toggleShortlistApi(req, res) {
  try {
    const { itemType, itemId, note } = req.body;
    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, message: "itemType and itemId are required." });
    }
    const result = await toggleShortlist(req.user?.userId, itemType, itemId, note);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getShortlistApi(req, res) {
  try {
    const shortlist = await getShortlist(req.user?.userId);
    return res.status(200).json({
      success: true,
      membersCount: shortlist.members.length,
      startupsCount: shortlist.startups.length,
      shortlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
