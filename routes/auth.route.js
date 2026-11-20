import { Router } from "express";
import {
  requestOTP,
  verifyOTPAndLogin,
  handleGetUserSignIn,
  handleGetLogin,
  logout,
} from "../controllers/auth.controller.js";

const router = Router();

// Page routes
router.get("/signup", handleGetUserSignIn);
router.get("/signin", handleGetLogin);
router.get("/login", handleGetLogin);
router.get("/logout", logout);

// API routes
router.post("/send-otp", requestOTP);
router.post("/verify-otp", verifyOTPAndLogin);
router.post("/logout", logout);

export default router;
