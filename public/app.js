const productGrid = document.querySelector("#product-grid");
const serviceGrid = document.querySelector("#service-grid");
const dialog = document.querySelector("#checkout-dialog");
const closeDialog = document.querySelector("#close-dialog");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutFormView = document.querySelector("#checkout-form-view");
const paymentView = document.querySelector("#payment-view");
const itemIdInput = document.querySelector("#item-id");
const titleEl = document.querySelector("#checkout-title");
const subtitleEl = document.querySelector("#checkout-subtitle");
const currencySelect = document.querySelector("#pay-currency");
const errorEl = document.querySelector("#checkout-error");

let catalog = [];
let pollTimer = null;

function cardMarkup(item) {
  const actionText = item.type === "service" ? "Reserve engagement" : "Acquire";
  const secondary = item.type === "service" && item.checkoutLabel ? item.checkoutLabel : "Crypto settlement";
  return `
    <article class="card">
      <div>
        <div class="card-meta">${item.eyebrow}</div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="card-actions">
          <button class="card-button" data-buy="${item.id}">${actionText}</button>
          <a class="repo-link" href="${item.repoUrl}" target="_blank" rel="noopener">View origin →</a>
        </div>
      </div>
      <div class="card-price">
        <span>${secondary}</span>
        <strong>${item.displayPrice}</strong>
      </div>
    </article>
  `;
}

async function loadStore() {
  const [catalogResponse, optionsResponse, healthResponse] = await Promise.all([
    fetch("/api/catalog"),
    fetch("/api/payment-options"),
    fetch("/api/health")
  ]);

  catalog = await catalogResponse.json();
  const options = await optionsResponse.json();
  const health = await healthResponse.json();

  productGrid.innerHTML = catalog.filter(x => x.type === "product").map(cardMarkup).join("");
  serviceGrid.innerHTML = catalog.filter(x => x.type === "service").map(cardMarkup).join("");

  currencySelect.innerHTML = options.map(option =>
    `<option value="${option.code}">${option.label} — ${option.network}</option>`
  ).join("");

  if (!health.paymentsEnabled) {
    document.querySelectorAll("[data-buy]").forEach(button => {
      button.dataset.disabledReason = "Payment setup is still being completed.";
    });
  }
}

function openCheckout(itemId) {
  const item = catalog.find(x => x.id === itemId);
  if (!item) return;

  clearInterval(pollTimer);
  checkoutForm.reset();
  errorEl.textContent = "";
  itemIdInput.value = item.id;
  titleEl.textContent = item.type === "service" ? "Reserve your engagement" : "Acquire this asset";
  subtitleEl.textContent = item.type === "service"
    ? `${item.name} · ${item.checkoutLabel || item.displayPrice} credited toward your final engagement.`
    : `${item.name} · ${item.displayPrice}`;

  checkoutFormView.hidden = false;
  paymentView.hidden = true;
  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const buyButton = event.target.closest("[data-buy]");
  if (buyButton) openCheckout(buyButton.dataset.buy);
});

closeDialog.addEventListener("click", () => {
  clearInterval(pollTimer);
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const inside = rect.top <= event.clientY && event.clientY <= rect.bottom &&
    rect.left <= event.clientX && event.clientX <= rect.right;
  if (!inside) {
    clearInterval(pollTimer);
    dialog.close();
  }
});

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";

  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Preparing secure payment…";

  try {
    const body = {
      itemId: itemIdInput.value,
      customerName: document.querySelector("#customer-name").value,
      customerEmail: document.querySelector("#customer-email").value,
      payCurrency: currencySelect.value
    };

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create payment.");

    showPayment(data);
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Create secure crypto payment";
  }
});

function humanStatus(status) {
  const map = {
    waiting: "Waiting for payment",
    confirming: "Payment detected · confirming",
    confirmed: "Blockchain confirmed",
    sending: "Settlement in progress",
    finished: "Payment complete",
    partially_paid: "Partial payment received",
    failed: "Payment failed",
    refunded: "Payment refunded",
    expired: "Payment window expired"
  };
  return map[status] || String(status || "Waiting").replaceAll("_", " ");
}

function showPayment(data) {
  checkoutFormView.hidden = true;
  paymentView.hidden = false;

  document.querySelector("#payment-amount").textContent =
    `${data.payAmount} ${String(data.payCurrency || "").toUpperCase()}`;
  document.querySelector("#payment-address").textContent = data.payAddress;
  document.querySelector("#payment-order").textContent = data.orderId;
  updateStatus(data.status);

  document.querySelector("#copy-address").onclick = async () => {
    await navigator.clipboard.writeText(data.payAddress);
    document.querySelector("#copy-address").textContent = "Copied";
    setTimeout(() => (document.querySelector("#copy-address").textContent = "Copy"), 1200);
  };

  pollPayment(data.paymentId);
}

function updateStatus(status) {
  document.querySelector("#payment-status").textContent = humanStatus(status);
  document.querySelector("#status-dot").classList.toggle("complete", status === "finished");
}

function pollPayment(paymentId) {
  clearInterval(pollTimer);

  const check = async () => {
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`);
      const data = await response.json();
      if (!response.ok) return;
      updateStatus(data.status);
      if (["finished", "failed", "expired", "refunded"].includes(data.status)) {
        clearInterval(pollTimer);
      }
    } catch {}
  };

  check();
  pollTimer = setInterval(check, 10000);
}

loadStore().catch(() => {
  productGrid.innerHTML = "<p>Collection temporarily unavailable.</p>";
  serviceGrid.innerHTML = "<p>Commissions temporarily unavailable.</p>";
});
