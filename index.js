import express from "express";
import path from "path";
import dotenv from "dotenv";
import connectDB from "./database/connection.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to Database
connectDB();

app.use(express.static("public"));
app.use(express.static(path.resolve("./public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.get("/", (req, res) => {
  return res.render("home");
});

app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});
