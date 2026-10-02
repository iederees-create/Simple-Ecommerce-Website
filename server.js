import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const NOWPAYMENTS_API_BASE = (process.env.NOWPAYMENTS_API_BASE || "https://api.nowpayments.io/v1").replace(/\/$/, "");
const PAYMENTS_ENABLED = String(process.env.STORE_PAYMENTS_ENABLED || "false").toLowerCase() === "true";

const catalog = [
  {
    id: "executive-crm",
    type: "product",
    name: "Executive CRM System",
    eyebrow: "Private Client Operations",
    price: 349,
    displayPrice: "$349",
    description: "A refined client, lead and opportunity management foundation for independent firms and private practices.",
    repo: "iederees-create/CRM-Template",
    repoUrl: "https://github.com/iederees-create/CRM-Template",
    includes: ["CRM interface source", "Client pipeline structure", "Deployment guide", "Commercial-use licence"]
  },
  {
    id: "budget-intelligence",
    type: "product",
    name: "Business Budget Intelligence",
    eyebrow: "Financial Visibility",
    price: 249,
    displayPrice: "$249",
    description: "An interactive business budget and profitability workspace with visual reporting and decision-ready summaries.",
    repo: "iederees-create/Business-Budget-Planner",
    repoUrl: "https://github.com/iederees-create/Business-Budget-Planner",
    includes: ["Budget planner source", "Profitability views", "Charting dashboard", "Setup notes"]
  },
  {
    id: "sales-intelligence",
    type: "product",
    name: "Sales Intelligence Dashboard",
    eyebrow: "Revenue Intelligence",
    price: 399,
    displayPrice: "$399",
    description: "A visual sales analysis suite for turning CSV and spreadsheet data into executive-level performance views.",
    repo: "iederees-create/Sales-Overview-Dashboard",
    repoUrl: "https://github.com/iederees-create/Sales-Overview-Dashboard",
    includes: ["Dashboard source", "Multiple chart views", "Data import workflow", "Commercial-use licence"]
  },
  {
    id: "commerce-launch",
    type: "product",
    name: "Commerce Launch System",
    eyebrow: "Digital Commerce",
    price: 549,
    displayPrice: "$549",
    description: "A launch-ready storefront foundation for premium products and services, prepared for modern payment integrations.",
    repo: "iederees-create/Simple-Ecommerce-Website",
    repoUrl: "https://github.com/iederees-create/Simple-Ecommerce-Website",
    includes: ["Storefront source", "Checkout structure", "Deployment guide", "Brand customization notes"]
  },
  {
    id: "growth-analytics",
    type: "product",
    name: "Analytics & Growth Toolkit",
    eyebrow: "Strategic Growth",
    price: 449,
    displayPrice: "$449",
    description: "A practical digital marketing, data analysis and data science toolkit for founders who want clearer growth decisions.",
    repo: "iederees-create/freelance-analytics-solutions",
    repoUrl: "https://github.com/iederees-create/freelance-analytics-solutions",
    includes: ["Analytics service framework", "Growth planning assets", "Data analysis structure", "Implementation notes"]
  },
  {
    id: "private-web-presence",
    type: "service",
    name: "Bespoke Digital Presence",
    eyebrow: "Private Commission",
    price: 500,
    displayPrice: "From $2,500",
    checkoutLabel: "$500 reservation",
    description: "A discreet, custom digital presence for founders, executives, private firms and premium personal brands.",
    repo: "iederees-create/Responsive-Website",
    repoUrl: "https://github.com/iederees-create/Responsive-Website",
    includes: ["Private discovery", "Custom design direction", "Responsive build", "Launch support"]
  },
  {
    id: "executive-data",
    type: "service",
    name: "Executive Data Intelligence",
    eyebrow: "Private Commission",
    price: 750,
    displayPrice: "From $3,500",
    checkoutLabel: "$750 reservation",
    description: "A private dashboard and reporting engagement that turns operational data into clear executive decisions.",
    repo: "iederees-create/eCommerce-Data-Analysis",
    repoUrl: "https://github.com/iederees-create/eCommerce-Data-Analysis",
    includes: ["Data audit", "Dashboard design", "Decision metrics", "Executive handover"]
  },
  {
    id: "crm-architecture",
    type: "service",
    name: "CRM Architecture & Pipeline",
    eyebrow: "Private Commission",
    price: 1000,
    displayPrice: "From $4,500",
    checkoutLabel: "$1,000 reservation",
    description: "A tailored client-operations system for high-touch businesses that need cleaner pipelines, follow-up and visibility.",
    repo: "iederees-create/CRM-Template",
    repoUrl: "https://github.com/iederees-create/CRM-Template",
    includes: ["Workflow mapping", "CRM architecture", "Pipeline configuration", "Team handover"]
  },
  {
    id: "ai-automation",
    type: "service",
    name: "AI Workflow & Automation",
    eyebrow: "Private Commission",
    price: 1250,
    displayPrice: "From $5,500",
    checkoutLabel: "$1,250 reservation",
    description: "Purpose-built AI and automation workflows that remove repetitive work while keeping human approval where it matters.",
    repo: "iederees-create/gptanalysisapp",
    repoUrl: "https://github.com/iederees-create/gptanalysisapp",
    includes: ["Workflow discovery", "AI integration", "Automation build", "Operational safeguards"]
  },
  {
    id: "private-commerce",
    type: "service",
    name: "Private Commerce & Crypto Checkout",
    eyebrow: "Private Commission",
    price: 1500,
    displayPrice: "From $6,500",
    checkoutLabel: "$1,500 reservation",
    description: "A premium commerce build with custom checkout, crypto payment integration and a polished customer journey.",
    repo: "iederees-create/Simple-Ecommerce-Website",
    repoUrl: "https://github.com/iederees-create/Simple-Ecommerce-Website",
    includes: ["Commerce architecture", "NOWPayments integration", "Payment-status flow", "Launch support"]
  }
];

const orders = new Map();

app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    paymentsConfigured: Boolean(NOWPAYMENTS_API_KEY && NOWPAYMENTS_IPN_SECRET),
    paymentsEnabled: PAYMENTS_ENABLED
  });
});

app.get("/api/catalog", (_req, res) => {
  res.json(catalog);
});

app.get("/api/payment-options", (_req, res) => {
  res.json([
    { code: "btc", label: "Bitcoin", network: "Bitcoin" },
    { code: "eth", label: "Ethereum", network: "Ethereum" },
    { code: "usdttrc20", label: "USDT", network: "TRON (TRC20)" },
    { code: "usdterc20", label: "USDT", network: "Ethereum (ERC20)" },
    { code: "usdc", label: "USDC", network: "Ethereum" },
    { code: "usdcsol", label: "USDC", network: "Solana" }
  ]);
});

app.post("/api/checkout", async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) {
      return res.status(503).json({ error: "Payments are not enabled yet. Add the server secrets and set STORE_PAYMENTS_ENABLED=true." });
    }
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(503).json({ error: "NOWPayments API key is not configured on the server." });
    }

    const { itemId, payCurrency, customerName, customerEmail } = req.body || {};
    const item = catalog.find((entry) => entry.id === itemId);
    if (!item) return res.status(404).json({ error: "Item not found." });

    const allowedCurrencies = new Set(["btc", "eth", "usdttrc20", "usdterc20", "usdc", "usdcsol"]);
    if (!allowedCurrencies.has(String(payCurrency || "").toLowerCase())) {
      return res.status(400).json({ error: "Please choose one of the supported checkout currencies." });
    }
    if (!String(customerEmail || "").includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const orderId = `FD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const description = item.type === "service"
      ? `${item.name} — engagement reservation`
      : item.name;

    const payload = {
      price_amount: item.price,
      price_currency: "usd",
      pay_currency: String(payCurrency).toLowerCase(),
      order_id: orderId,
      order_description: description,
      ipn_callback_url: `${PUBLIC_BASE_URL}/api/nowpayments/ipn`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false
    };

    const response = await fetch(`${NOWPAYMENTS_API_BASE}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAYMENTS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("NOWPayments create payment error", data);
      return res.status(response.status).json({ error: data.message || "NOWPayments could not create the payment.", details: data });
    }

    orders.set(String(data.payment_id), {
      orderId,
      itemId: item.id,
      customerName: String(customerName || "").trim(),
      customerEmail: String(customerEmail || "").trim(),
      paymentId: String(data.payment_id),
      status: data.payment_status,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      orderId,
      paymentId: data.payment_id,
      status: data.payment_status,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      payCurrency: data.pay_currency,
      priceAmount: data.price_amount,
      priceCurrency: data.price_currency,
      item: {
        id: item.id,
        name: item.name,
        type: item.type
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create checkout right now." });
  }
});

app.get("/api/payments/:paymentId", async (req, res) => {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return res.status(503).json({ error: "NOWPayments API key is not configured." });
    }
    const paymentId = encodeURIComponent(req.params.paymentId);
    const response = await fetch(`${NOWPAYMENTS_API_BASE}/payment/${paymentId}`, {
      headers: { "x-api-key": NOWPAYMENTS_API_KEY }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.message || "Could not retrieve payment status." });

    const saved = orders.get(String(req.params.paymentId));
    if (saved) {
      saved.status = data.payment_status;
      saved.updatedAt = new Date().toISOString();
      orders.set(String(req.params.paymentId), saved);
    }

    res.json({
      paymentId: data.payment_id,
      status: data.payment_status,
      payAddress: data.pay_address,
      payAmount: data.pay_amount,
      payCurrency: data.pay_currency,
      actuallyPaid: data.actually_paid,
      orderId: data.order_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve payment status." });
  }
});

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortObject(value[key]);
      return acc;
    }, {});
  }
  return value;
}

app.post("/api/nowpayments/ipn", (req, res) => {
  try {
    if (!NOWPAYMENTS_IPN_SECRET) return res.status(503).send("IPN secret not configured");

    const receivedSignature = String(req.get("x-nowpayments-sig") || "").toLowerCase();
    if (!receivedSignature) return res.status(401).send("Missing signature");

    const sortedPayload = JSON.stringify(sortObject(req.body));
    const expectedSignature = crypto
      .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
      .update(sortedPayload)
      .digest("hex")
      .toLowerCase();

    const receivedBuffer = Buffer.from(receivedSignature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const valid = receivedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

    if (!valid) return res.status(401).send("Invalid signature");

    const paymentId = String(req.body?.payment_id || "");
    if (paymentId) {
      const saved = orders.get(paymentId) || {};
      orders.set(paymentId, {
        ...saved,
        paymentId,
        orderId: req.body.order_id || saved.orderId,
        status: req.body.payment_status || saved.status,
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("IPN processing error", error);
    res.status(500).send("IPN processing error");
  }
});

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Francis Digital Atelier running on port ${PORT}`);
});
