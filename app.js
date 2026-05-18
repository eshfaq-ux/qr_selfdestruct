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
  const base = (process.env.BASE_URL || `http://localhost:3000`).replace(/\.$/, '');
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
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:white;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;width:100%;padding:40px 30px;text-align:center}
    .merchant{color:#333;font-size:24px;font-weight:600;margin-bottom:10px}
    .amount{color:#667eea;font-size:48px;font-weight:700;margin:20px 0}
    .upi-id{color:#888;font-size:14px;margin-bottom:30px}
    .pay-btn{display:block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;text-decoration:none;padding:18px;border-radius:12px;font-size:18px;font-weight:600;margin-bottom:15px;transition:transform 0.2s,box-shadow 0.2s}
    .pay-btn:active{transform:scale(0.98)}
    .confirm-btn{display:none;background:#10b981;color:white;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:600;width:100%;cursor:pointer;margin-top:20px}
    .confirm-btn.show{display:block}
    .info{color:#999;font-size:12px;margin-top:20px;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <div class="merchant">${data.pn || 'Payment'}</div>
    ${data.amount ? `<div class="amount">₹${data.amount}</div>` : '<div class="amount">Pay Now</div>'}
    <div class="upi-id">${data.pa}</div>
    <a class="pay-btn" href="${upiUrl}" onclick="showConfirm()">Pay with UPI App</a>
    <button class="confirm-btn" id="confirmBtn" onclick="location.href='/paid/${req.params.token}'">✓ Payment Completed</button>
    <div class="info">Click the button above to open your payment app. After completing payment, confirm below.</div>
  </div>
  <script>
    function showConfirm(){setTimeout(()=>document.getElementById('confirmBtn').classList.add('show'),2000)}
  </script>
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
