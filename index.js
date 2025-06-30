const express = require("express");
const Canvas = require("canvas");
const axios = require("axios");
const path = require("path");

const app = express();

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

function parseRichText(text) {
  return text.replace(/\*/g, "").replace(/_/g, "");
}

app.get("/", (req, res) => {
  res.send("✅ FakeChat API is running!");
});

app.get("/fakechat", async (req, res) => {
  const uid = req.query.uid;
  const name = req.query.name || "User";
  const rawText1 = req.query.text1 || "Hello 👋";
  const rawText2 = req.query.text2 || "";
  const mode = req.query.mode === "dark" ? "dark" : "light";

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
  const bg = await Canvas.loadImage(path.join(__dirname, mode === "dark" ? "bg_dark.jpeg" : "Screenshot_20250630-145701-01.jpeg"));

  const canvas = Canvas.createCanvas(720, 369);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(bg, 0, 0, 720, 369);

  // Avatar (top left)
  ctx.save(); ctx.beginPath();
  ctx.arc(80, 80, 50, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(avatar, 30, 30, 100, 100); ctx.restore();

  // Name (bold, moved 5px down)
  ctx.font = "bold 40px Arial";
  ctx.fillStyle = mode === "dark" ? "#ffffff" : "#000000";
  ctx.fillText(name, 150, 85);

  // Function to draw message bubble
  const drawMessage = (rawText, yPos) => {
    const text = parseRichText(rawText);
    const padding = 20;
    const radius = 20;
    const maxWidth = 500;

    ctx.font = "32px Arial";
    const lines = wrapText(ctx, text, maxWidth);
    const boxHeight = lines.length * 40 + padding;
    const boxWidth = maxWidth + padding * 2;
    const x = 150;
    const y = yPos;

    // Message Bubble
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxWidth - radius, y);
    ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
    ctx.lineTo(x + boxWidth, y + boxHeight - radius);
    ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius, y + boxHeight);
    ctx.lineTo(x + radius, y + boxHeight);
    ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = mode === "dark" ? "#2f2f2f" : "#e0e0e0";
    ctx.fill();

    // Draw each line of text
    ctx.fillStyle = mode === "dark" ? "#ffffff" : "#000000";
    lines.forEach((line, i) => {
      const isBold = rawText.includes(`*${line}*`);
      const isItalic = rawText.includes(`_${line}_`);
      ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}32px Arial`;
      ctx.fillText(line, x + padding, y + 40 + i * 40);
    });

    return { nextY: y + boxHeight + 10, lastY: y + boxHeight };
  };

  const msg1 = drawMessage(rawText1, 100);
  let msg2 = null;
  if (rawText2) {
    msg2 = drawMessage(rawText2, msg1.nextY);
  }

  // Seen text (10px font, positioned below last message)
  const timeY = msg2 ? msg2.lastY + 10 : msg1.lastY + 10;
  ctx.font = "10px Arial";
  ctx.fillStyle = "#999";
  ctx.fillText("Seen • 2:35 PM", 160, timeY);

  // Seen avatar (bottom right, 16x16 = 5x smaller)
  ctx.save(); ctx.beginPath();
  ctx.arc(688, 300, 8, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(avatar, 680, 292, 16, 16); ctx.restore();

  res.setHeader("Content-Type", "image/png");
  res.send(canvas.toBuffer("image/png"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ FakeChat API running on port", PORT));
