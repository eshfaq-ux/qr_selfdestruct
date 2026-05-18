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
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f4ff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}
    .card{background:white;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.12);max-width:400px;width:100%;overflow:hidden}
    .header{background:#1a56db;padding:24px 20px 20px;text-align:center;color:white}
    .merchant-icon{width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:26px;border:2px solid rgba(255,255,255,.3)}
    .merchant-name{font-size:20px;font-weight:700;letter-spacing:.2px}
    .upi-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 10px;font-size:11px;margin-top:8px;font-weight:500}
    .content{padding:24px 20px}
    .amount-box{background:#f8faff;border:1.5px solid #e0e8ff;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px}
    .amount-label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
    .amount{color:#111827;font-size:44px;font-weight:800}
    .amount-sub{color:#6b7280;font-size:12px;margin-top:2px}
    .alert-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start}
    .alert-box .icon{font-size:16px;flex-shrink:0;margin-top:1px}
    .alert-box p{font-size:12.5px;color:#92400e;line-height:1.5}
    .alert-box strong{color:#78350f}
    .pay-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:#1a56db;color:white;text-decoration:none;padding:16px;border-radius:12px;font-size:17px;font-weight:700;text-align:center;box-shadow:0 4px 14px rgba(26,86,219,.35);transition:opacity .15s}
    .pay-btn:active{opacity:.85}
    .confirm-btn{display:none;background:#059669;color:white;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:600;width:100%;cursor:pointer;margin-top:12px;box-shadow:0 4px 12px rgba(5,150,105,.25)}
    .confirm-btn.show{display:block;animation:up .3s ease}
    @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .footer{margin-top:18px;text-align:center}
    .footer p{font-size:11.5px;color:#9ca3af;line-height:1.6}
    .trust-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px;padding-top:12px;border-top:1px solid #f3f4f6}
    .trust-item{display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;font-weight:500}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="merchant-icon">🏏</div>
      <div class="merchant-name">${merchantName}</div>
      <div class="upi-badge">✅ Verified UPI Merchant</div>
    </div>
    <div class="content">
      <div class="amount-box">
        <div class="amount-label">Amount to Pay</div>
        ${data.amount
          ? `<div class="amount">₹${data.amount}</div><div class="amount-sub">Indian Rupees</div>`
          : `<div class="amount" style="font-size:22px;padding:6px 0">Open app to enter amount</div>`}
      </div>

      <div class="alert-box">
        <span class="icon">💡</span>
        <p><strong>Heads up:</strong> Your payment app may show a prompt saying you're leaving the app — <strong>this is normal and safe.</strong> Tap <em>"Continue"</em> or <em>"Allow"</em> to proceed with the payment.</p>
      </div>

      <a class="pay-btn" href="${upiUrl}" onclick="showConfirm()">
        <span>💳</span> Open Payment App
      </a>
      <button class="confirm-btn" id="confirmBtn" onclick="location.href='/paid/${token}'">
        ✓ I've Completed the Payment
      </button>

      <div class="footer">
        <p>Paying to <strong>${data.pa}</strong></p>
        <div class="trust-row">
          <span class="trust-item">🔒 Secure</span>
          <span class="trust-item">🇮🇳 UPI / NPCI</span>
          <span class="trust-item">⚡ One-time link</span>
        </div>
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

