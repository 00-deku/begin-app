import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import connectDB from "./database/connection.js";
import postRoute from "./routes/post.route.js";
import authRoute from "./routes/auth.route.js";
import { attachUser, requireOnboarded } from "./middlewares/auth.middleware.js";
import onboardingRoute from "./routes/onboarding.route.js";
import profileRoute from "./routes/profile.route.js";
import startupRoute from "./routes/startup.route.js";
import discoveryRoute from "./routes/discovery.route.js";

import { getSuggestedMatches } from "./services/discovery.service.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to Database
connectDB();

app.use(express.static("public"));
app.use(express.static(path.resolve("./public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Attach user to every request (from JWT cookie)
app.use(attachUser);

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Routes
app.use("/post", postRoute);
app.use("/api/auth", authRoute);
app.use("/auth", authRoute);
app.use("/user", authRoute);
app.use("/onboarding", onboardingRoute);
app.use("/profile", profileRoute);
app.use("/api/profile", profileRoute);
app.use("/startup", startupRoute);
app.use("/api/startup", startupRoute);
app.use("/discovery", discoveryRoute);
app.use("/api/discovery", discoveryRoute);

// Pages
app.get("/", requireOnboarded, async (req, res) => {
  let suggested = { recommendedMembers: [], recommendedStartups: [] };
  if (req.user?.userId) {
    try {
      suggested = await getSuggestedMatches(req.user.userId);
    } catch {
      // Gracefully fall back if matching service encounters an issue
    }
  }

  return res.render("home", {
    user: res.locals.user,
    suggestedMembers: suggested.recommendedMembers || [],
    suggestedStartups: suggested.recommendedStartups || [],
  });
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
