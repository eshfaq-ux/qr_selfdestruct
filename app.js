const express = require("express");
const QRCode = require("qrcode");
const { randomBytes } = require("crypto");

const app = express();
const links = {};

// Homepage
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QR Self-Destruct</title>
  <style>
    body{font-family:sans-serif;max-width:600px;margin:50px auto;padding:20px;line-height:1.6}
    code{background:#f4f4f4;padding:2px 6px;border-radius:3px}
    h1{color:#1a73e8}
  </style>
</head>
<body>
  <h1>QR Self-Destruct</h1>
  <p>Generate self-destructing QR codes for UPI payments.</p>
  <h3>Usage:</h3>
  <p>Create a QR code:</p>
  <code>/create?pa=UPI_ID&pn=NAME&amount=AMOUNT</code>
  <h3>Example:</h3>
  <code>/create?pa=merchant@upi&pn=Shop%20Name&amount=500</code>
</body>
</html>`);
});

// Generate QR: /create?pa=UPI_ID&pn=NAME&amount=500
app.get("/create", async (req, res) => {
  const { pa, pn, amount } = req.query;
  if (!pa) return res.status(400).send("Missing ?pa= (UPI ID)");
  const token = randomBytes(4).toString("hex");
  links[token] = { pa, pn: pn || "", amount: amount || "" };
  const base = process.env.BASE_URL || `http://localhost:3000`;
  console.log(`[+] token=${token} for ${pa}`);
  const qr = await QRCode.toBuffer(`${base}/s/${token}`);
  res.type("png").send(qr);
});

// Payment page — shown on scan, NOT destroyed yet
app.get("/s/:token", (req, res) => {
  const data = links[req.params.token];
  if (!data) return res.status(410).send("<h2>This QR has expired.</h2>");
  const upiUrl = `upi://pay?pa=${data.pa}&pn=${encodeURIComponent(data.pn)}&am=${data.amount}&cu=INR`;
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pay ${data.pn || data.pa}</title>
  <style>
    body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
    .btn{background:#1a73e8;color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:18px;margin:10px;display:inline-block}
    .done{background:#34a853}
  </style>
</head>
<body>
  <h2>Pay ${data.pn || data.pa}</h2>
  ${data.amount ? `<p style="font-size:24px">&#8377;${data.amount}</p>` : ""}
  <a class="btn" href="${upiUrl}">Pay with GPay / PhonePe</a>
  <br><br>
  <a class="btn done" href="/paid/${req.params.token}">&#10003; I have paid</a>
  <p style="color:#aaa;font-size:12px">This link expires after payment is confirmed.</p>
</body>
</html>`);
});

// User confirms payment — destroys the token
app.get("/paid/:token", (req, res) => {
  const exists = links[req.params.token];
  delete links[req.params.token];
  if (!exists) return res.status(410).send("<h2 style='font-family:sans-serif;text-align:center;margin-top:40vh'>Already used.</h2>");
  console.log(`[!] token=${req.params.token} — self-destructed`);
  res.send("<h2 style='font-family:sans-serif;text-align:center;margin-top:40vh'>&#10003; Payment confirmed. This link has expired.</h2>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
