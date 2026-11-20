// your routes code here.
import {Router} from "express";
import {handleGetPostAdd} from "..//controllers/post.controller.js"
import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads/`))
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`
    cb(null, fileName)
  }
});
const upload = multer({storage: storage})

const router = Router();

router.get("/new", handleGetPostAdd)

export default router;