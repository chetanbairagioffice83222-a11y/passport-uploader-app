import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const upload = multer();
app.use(express.json());
app.use(cors());

const SHOP = process.env.SHOP_DOMAIN;
const TOKEN = process.env.ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;

app.post("/apps/passport-upload", upload.single("file"), async (req, res) => {
  try {
    const base64 = req.file.buffer.toString("base64");

    const resp = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/files.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file: {
          attachment: base64,
          filename: req.file.originalname,
          mime_type: req.file.mimetype
        }
      })
    });

    const json = await resp.json();
    const fileId = json.file?.id;

    return res.json({ file_id: fileId });
  } catch (error) {
    return res.json({ error });
  }
});

app.listen(process.env.PORT, () => console.log("✅ App Running on port " + process.env.PORT));
