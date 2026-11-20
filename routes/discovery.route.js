import { Router } from "express";
import {
  renderDiscoveryPage,
  searchMembersApi,
  searchStartupsApi,
  globalSearchApi,
} from "../controllers/discovery.controller.js";
import { requireAuth, requireOnboarded } from "../middlewares/auth.middleware.js";

const router = Router();

// Page views
router.get("/", requireAuth, requireOnboarded, renderDiscoveryPage);

// REST API search endpoints
router.get("/members", requireAuth, searchMembersApi);
router.get("/startups", requireAuth, searchStartupsApi);
router.get("/search", requireAuth, globalSearchApi);

router.get("/api/members", requireAuth, searchMembersApi);
router.get("/api/startups", requireAuth, searchStartupsApi);
router.get("/api/search", requireAuth, globalSearchApi);

export default router;
