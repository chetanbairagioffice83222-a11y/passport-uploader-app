import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

// ✅ Correct Multer Setup (Must be memoryStorage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());
app.use(cors());

const SHOP = process.env.SHOP_DOMAIN;
const TOKEN = process.env.ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;

// ✅ Upload API
app.post("/apps/passport-upload", upload.single("file"), async (req, res) => {
  console.log("📩 Request Received, File:", req.file); // Debug log

  try {
    if (!req.file) {
      return res.json({ error: "No file received" });
    }

    // Convert to base64
    const base64 = req.file.buffer.toString("base64");

    // 1️⃣ Upload Image To Shopify Files
    const fileResp = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/files.json`, {
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

    const fileJson = await fileResp.json();
    console.log("📤 File Upload Response:", fileJson);

    const uploadedFile = fileJson.file;

    if (!uploadedFile || !uploadedFile.id) {
      return res.json({ error: "❌ Shopify File Upload Failed", shopify_response: fileJson });
    }

    // 2️⃣ Fetch Latest Order
    const orderResp = await fetch(
      `https://${SHOP}/admin/api/${API_VERSION}/orders.json?limit=1&status=any`,
      { headers: { "X-Shopify-Access-Token": TOKEN } }
    );

    const orderJson = await orderResp.json();
    const latestOrder = orderJson.orders[0];

    if (!latestOrder) {
      return res.json({ warning: "✅ File uploaded but no order found" });
    }

    // 3️⃣ Attach File to the Order Metafield
    const metafieldResp = await fetch(
      `https://${SHOP}/admin/api/${API_VERSION}/orders/${latestOrder.id}/metafields.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          metafield: {
            namespace: "custom",
            key: "passport",
            type: "file_reference",
            value: uploadedFile.id
          }
        })
      }
    );

    const metafieldJson = await metafieldResp.json();
    console.log("🔗 Metafield Attach Response:", metafieldJson);

    return res.json({
      success: true,
      message: "✅ Passport image successfully attached to the latest order",
      image_file_id: uploadedFile.id,
      order_id: latestOrder.id
    });

  } catch (error) {
    console.log("🔥 Error:", error);
    return res.json({ error: error.message });
  }
});

// Server Start
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Appssssssssssss Running on Port:", process.env.PORT || 3000)
);

