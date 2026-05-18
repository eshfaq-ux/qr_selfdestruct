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
  const base = (process.env.BASE_URL || `http://localhost:3000`).replace(/\.$/, '');
  console.log(`[+] token=${token} for ${pa}`);
  const qr = await QRCode.toBuffer(`${base}/s/${token}`);
  res.type("png").send(qr);
});

// Generate permanent QR
app.get("/permanent", async (req, res) => {
  const base = (process.env.BASE_URL || `http://localhost:3000`).replace(/\.$/, '');
  const qr = await QRCode.toBuffer(`${base}/s/${PERMANENT_TOKEN}`);
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
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:white;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:420px;width:100%;overflow:hidden}
    .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;color:white}
    .icon{width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 15px;font-size:30px}
    .merchant{font-size:22px;font-weight:600;line-height:1.3}
    .content{padding:35px 30px}
    .amount-label{color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    .amount{color:#333;font-size:52px;font-weight:700;margin-bottom:30px}
    .pay-btn{display:block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;text-decoration:none;padding:18px;border-radius:14px;font-size:18px;font-weight:600;text-align:center;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 4px 15px rgba(102,126,234,0.4)}
    .pay-btn:active{transform:scale(0.98)}
    .confirm-btn{display:none;background:#10b981;color:white;border:none;padding:16px;border-radius:14px;font-size:16px;font-weight:600;width:100%;cursor:pointer;margin-top:15px;box-shadow:0 4px 15px rgba(16,185,129,0.3)}
    .confirm-btn.show{display:block;animation:slideIn 0.3s ease}
    @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .info{color:#999;font-size:13px;margin-top:25px;text-align:center;line-height:1.6}
    .secure{display:flex;align-items:center;justify-content:center;gap:5px;color:#10b981;font-size:12px;margin-top:20px;font-weight:500}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">🏏</div>
      <div class="merchant">${data.pn || 'Payment'}</div>
    </div>
    <div class="content">
      ${data.amount ? `<div class="amount-label">Amount to Pay</div><div class="amount">₹${data.amount}</div>` : '<div class="amount-label">Payment</div><div class="amount" style="font-size:28px">Enter Amount in App</div>'}
      <a class="pay-btn" href="${upiUrl}" onclick="showConfirm()">💳 Pay with UPI App</a>
      <button class="confirm-btn" id="confirmBtn" onclick="location.href='/paid/${req.params.token}'">✓ Payment Completed</button>
      <div class="secure">🔒 Secure Payment</div>
      <div class="info">Tap the button above to open your payment app. After completing the payment, confirm below to close this link.</div>
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

