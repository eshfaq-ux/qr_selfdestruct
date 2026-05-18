const express = require("express");
const QRCode = require("qrcode");
const { randomBytes } = require("crypto");

const app = express();
const links = {};

// Permanent link for main UPI ID
const PERMANENT_TOKEN = "sparkzone";
links[PERMANENT_TOKEN] = {
  pa: process.env.UPI_ID || "6006331941@ybl",
  pn: process.env.MERCHANT_NAME || "Sparkzone Udhampur City Sports Academy",
  amount: ""
};

// Homepage
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QR Self-Destruct</title>
  <style>
    body{font-family:sans-serif;max-width:700px;margin:50px auto;padding:20px;line-height:1.6}
    code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:14px}
    h1{color:#1a73e8}
    .section{margin:30px 0;padding:20px;background:#f9f9f9;border-radius:8px}
    .label{font-weight:600;color:#333;margin-bottom:5px}
  </style>
</head>
<body>
  <h1>QR Self-Destruct</h1>
  <p>Generate QR codes for UPI payments.</p>
  
  <div class="section">
    <div class="label">🔒 Direct UPI QR (No Warning, Recommended)</div>
    <p>Opens payment app directly without browser warning:</p>
    <code>/direct?pa=UPI_ID&pn=NAME&amount=AMOUNT</code>
    <p style="margin-top:10px"><strong>Example:</strong><br>
    <code>/direct?pa=6006331941@ybl&pn=Sparkzone%20Academy&amount=500</code></p>
  </div>

  <div class="section">
    <div class="label">♻️ Permanent QR (Reusable)</div>
    <p>Direct UPI link that never expires:</p>
    <code>/permanent</code>
  </div>

  <div class="section">
    <div class="label">💥 Self-Destruct QR (One-time use, shows warning)</div>
    <p>Expires after payment confirmation:</p>
    <code>/create?pa=UPI_ID&pn=NAME&amount=AMOUNT</code>
  </div>
</body>
</html>`);
});

// Generate QR: /create?pa=UPI_ID&pn=NAME&amount=500
app.get("/create", async (req, res) => {
  const { pa, pn, amount } = req.query;
  if (!pa) return res.status(400).send("Missing ?pa= (UPI ID)");
  const token = randomBytes(4).toString("hex");
  links[token] = { pa, pn: pn || "", amount: amount || "" };
  const base = (process.env.BASE_URL || `http://localhost:3000`).replace(/\.$/, '');
  console.log(`[+] token=${token} for ${pa}`);
  const qr = await QRCode.toBuffer(`${base}/s/${token}`);
  res.type("png").send(qr);
});

// Generate permanent QR with direct UPI link (no warning)
app.get("/permanent", async (req, res) => {
  const pa = process.env.UPI_ID || "6006331941@ybl";
  const pn = process.env.MERCHANT_NAME || "Sparkzone Udhampur City Sports Academy";
  const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&cu=INR`;
  const qr = await QRCode.toBuffer(upiUrl);
  res.type("png").send(qr);
});

// Generate direct UPI QR (no self-destruct, no warning)
app.get("/direct", async (req, res) => {
  const { pa, pn, amount } = req.query;
  if (!pa) return res.status(400).send("Missing ?pa= (UPI ID)");
  const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn || '')}&am=${amount || ''}&cu=INR`;
  const qr = await QRCode.toBuffer(upiUrl);
  res.type("png").send(qr);
});

// Payment page — shown on scan, NOT destroyed yet
app.get("/s/:token", (req, res) => {
  const data = links[req.params.token];
  if (!data) return res.status(410).send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link Expired</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}.box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1)}h2{color:#e53e3e;margin-bottom:8px}p{color:#666;font-size:14px}</style></head><body><div class="box"><div style="font-size:48px">⏱️</div><h2>Link Expired</h2><p>This one-time payment link has already been used.</p></div></body></html>`);
  const upiUrl = `upi://pay?pa=${data.pa}&pn=${encodeURIComponent(data.pn)}&am=${data.amount}&cu=INR`;
  const merchantName = data.pn || data.pa;
  const token = req.params.token;
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1a56db">
  <title>Pay ${merchantName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#eef2ff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}
    .card{background:white;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.12);max-width:400px;width:100%;overflow:hidden}

    /* Header */
    .header{background:#1a56db;padding:22px 20px 18px;text-align:center;color:white}
    .merchant-icon{width:54px;height:54px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:26px;border:2px solid rgba(255,255,255,.35)}
    .merchant-name{font-size:19px;font-weight:700}
    .upi-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.18);border-radius:20px;padding:4px 11px;font-size:11px;margin-top:8px;font-weight:600;letter-spacing:.2px}

    /* Trust bar */
    .trust-bar{display:flex;justify-content:center;gap:0;background:#f0f4ff;border-bottom:1px solid #e0e8ff}
    .trust-bar span{flex:1;text-align:center;padding:9px 4px;font-size:11px;color:#3b5bdb;font-weight:600;border-right:1px solid #e0e8ff}
    .trust-bar span:last-child{border-right:none}

    /* Content */
    .content{padding:22px 20px}
    .upi-id-box{display:flex;align-items:center;justify-content:center;gap:7px;background:#f8faff;border:1.5px solid #c7d7ff;border-radius:10px;padding:10px 14px;margin-bottom:18px}
    .upi-id-box .label{font-size:11px;color:#6b7280;font-weight:500}
    .upi-id-box .value{font-size:14px;color:#1e3a8a;font-weight:700;font-family:monospace}

    /* Warning box — reframed as info */
    .info-box{background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start}
    .info-box .ico{font-size:18px;flex-shrink:0}
    .info-box p{font-size:12.5px;color:#166534;line-height:1.55}
    .info-box strong{color:#14532d}

    /* Buttons */
    .pay-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:#1a56db;color:white;text-decoration:none;padding:16px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 4px 14px rgba(26,86,219,.35);transition:opacity .15s}
    .pay-btn:active{opacity:.85}
    .confirm-btn{display:none;background:#059669;color:white;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:600;width:100%;cursor:pointer;margin-top:12px;box-shadow:0 4px 12px rgba(5,150,105,.25)}
    .confirm-btn.show{display:block;animation:up .3s ease}
    @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

    .footer-note{margin-top:16px;text-align:center;font-size:11px;color:#9ca3af;line-height:1.7}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="merchant-icon">🏏</div>
      <div class="merchant-name">${merchantName}</div>
      <div class="upi-badge">✅ Verified UPI Merchant</div>
    </div>

    <div class="trust-bar">
      <span>🔒 SSL Secured</span>
      <span>🇮🇳 NPCI / UPI</span>
      <span>⚡ One-time Link</span>
    </div>

    <div class="content">
      <div class="upi-id-box">
        <span class="label">Paying to</span>
        <span class="value">${data.pa}</span>
      </div>

      ${data.amount ? `
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Amount</div>
        <div style="font-size:46px;font-weight:800;color:#111827">₹${data.amount}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px">Indian Rupees</div>
      </div>` : ''}

      <div class="info-box">
        <span class="ico">ℹ️</span>
        <p><strong>Your payment app may show a "leaving app" prompt</strong> — this is a standard security step by your app, not an error. Simply tap <strong>"Continue"</strong> or <strong>"Allow"</strong> to complete the payment.</p>
      </div>

      <a class="pay-btn" href="${upiUrl}" onclick="showConfirm()">
        💳 &nbsp;Pay Now with UPI
      </a>
      <button class="confirm-btn" id="confirmBtn" onclick="location.href='/paid/${token}'">
        ✓ &nbsp;Payment Done — Confirm
      </button>

      <div class="footer-note">
        This is a secure, one-time payment link.<br>
        It will expire once payment is confirmed.
      </div>
    </div>
  </div>
  <script>
    function showConfirm(){setTimeout(()=>document.getElementById('confirmBtn').classList.add('show'),2000)}
  </script>
</body>
</html>`);
});

// User confirms payment — destroys the token
app.get("/paid/:token", (req, res) => {
  if (req.params.token === PERMANENT_TOKEN) {
    return res.send("<h2 style='font-family:sans-serif;text-align:center;margin-top:40vh'>&#10003; Payment confirmed. Thank you!</h2>");
  }
  const exists = links[req.params.token];
  delete links[req.params.token];
  if (!exists) return res.status(410).send("<h2 style='font-family:sans-serif;text-align:center;margin-top:40vh'>Already used.</h2>");
  console.log(`[!] token=${req.params.token} — self-destructed`);
  res.send("<h2 style='font-family:sans-serif;text-align:center;margin-top:40vh'>&#10003; Payment confirmed. This link has expired.</h2>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

