import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import connectDB from "./database/connection.js";
import postRoute from "./routes/post.route.js";
import authRoute from "./routes/auth.route.js";
import { attachUser, requireOnboarded } from "./middlewares/auth.middleware.js";
import onboardingRoute from "./routes/onboarding.route.js";

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


// Pages
app.get("/", requireOnboarded, (req, res) => {
  return res.render("home", { user: res.locals.user });
});

app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});
