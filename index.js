import express from "express";
import mongoose from "mongoose";
import path from "path";
const app = express();

import dotenv from "dotenv";
dotenv.config();

app.use(express.static("public"));
app.use(express.static(path.resolve("./public")))
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

mongoose.connect(process.env.MONGO_URI).then((data)=>{console.log("MongoDB Connected")}).catch((error)=>{console.log(`${e}`)})
const PORT = process.env.PORT || 8000;

app.get("/", (req,res)=> {
    return res.render("home")
})

app.listen(PORT, ()=> {`server started at ${PORT}`})