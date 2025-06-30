const express = require("express");
const Canvas = require("canvas");
const axios = require("axios");
const path = require("path");

const app = express();

app.get("/", (req, res) => {
  res.send("✅ FakeChat API is running!");
});

app.get("/fakechat", async (req, res) => {
  const uid = req.query.uid;
  const name = req.query.name || "User";
  const text1 = req.query.text1 || "Hello";
  const text2 = req.query.text2 || "";
  const text3 = req.query.text3 || "";

  if (!uid) return res.status(400).send("❌ Please provide uid");

  const avatarURL = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`;
  const fallbackURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=512&background=random`;

  let avatarBuffer;
  try {
    const resAvatar = await axios.get(avatarURL, { responseType: "arraybuffer" });
    avatarBuffer = resAvatar.data;
  } catch (err) {
    const resFallback = await axios.get(fallbackURL, { responseType: "arraybuffer" });
    avatarBuffer = resFallback.data;
  }

  const avatar = await Canvas.loadImage(avatarBuffer);
  const bg = await Canvas.loadImage(path.join(__dirname, "bg.jpeg"));

  const canvas = Canvas.createCanvas(720, 369);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(bg, 0, 0, 720, 369);

  // Avatar (top left)
  ctx.save(); ctx.beginPath();
  ctx.arc(35, 35, 20, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(avatar, 15, 15, 40, 40); ctx.restore();

  // Name and Message
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(name, 70, 40);

  ctx.font = "20px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(text1, 70, 70);

  if (text2) {
    ctx.font = "italic 18px Arial";
    ctx.fillStyle = "#ccc";
    ctx.fillText(text2, 100, 310);
  }

  // Seen avatar (bottom right)
  ctx.save(); ctx.beginPath();
  ctx.arc(680, 290, 20, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(avatar, 660, 270, 40, 40); ctx.restore();

  res.setHeader("Content-Type", "image/png");
  res.send(canvas.toBuffer("image/png"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ FakeChat API running on port", PORT));
