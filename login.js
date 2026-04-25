let debtCount = 0;

// Add debt input row
document.getElementById("add-debt").addEventListener("click", () => {
  const debtsDiv = document.getElementById("debts");

  const debtRow = document.createElement("div");
  debtRow.classList.add("debt-row", "mb-2");
  debtRow.innerHTML = `
    <input type="text" placeholder="Debt Name" id="name-${debtCount}" class="form-control mb-1" />
    <input type="number" placeholder="Balance ($)" id="balance-${debtCount}" class="form-control mb-1" />
    <input type="number" placeholder="Interest Rate (%)" id="rate-${debtCount}" class="form-control mb-1" />
    <input type="number" placeholder="Min Payment ($)" id="min-${debtCount}" class="form-control mb-1" />
    <button type="button" class="btn btn-danger btn-sm mb-2" onclick="removeDebt(this)">Remove</button>
  `;
  debtsDiv.appendChild(debtRow);
  debtCount++;
});

// Remove debt row
function removeDebt(btn) {
  btn.parentElement.remove();
}

// Calculate results
document.getElementById("calculate").addEventListener("click", () => {
  let debts = [];
  for (let i = 0; i < debtCount; i++) {
    const name = document.getElementById(`name-${i}`);
    const balance = document.getElementById(`balance-${i}`);
    const rate = document.getElementById(`rate-${i}`);
    const min = document.getElementById(`min-${i}`);

    if (name && balance && rate && min) {
      debts.push({
        name: name.value,
        balance: parseFloat(balance.value),
        rate: parseFloat(rate.value) / 100,
        min: parseFloat(min.value)
      });
    }
  }

  // Get extra payment, income and percent
  const extraInput = parseFloat(document.getElementById("extra").value) || 0;
  const income = parseFloat(document.getElementById("income")?.value) || 0;
  const percent = parseFloat(document.getElementById("percent")?.value) || 0;

  let extra = extraInput;

  // If income + percent provided, calculate extra payment
  if (income > 0 && percent > 0) {
    const totalToDebt = (income * (percent / 100));
    const minPayments = debts.reduce((sum, d) => sum + d.min, 0);
    extra = Math.max(totalToDebt - minPayments, 0);
  }

  const strategy = document.getElementById("strategy").value;

  const results = calculateDebts(debts, extra, strategy);
  displayResults(results);
});

// Calculation function
function calculateDebts(debts, extra, strategy) {
  let month = 0;
  let totalInterest = 0;
  let balancesOverTime = [];

  debts = JSON.parse(JSON.stringify(debts));

  while (debts.some(d => d.balance > 0) && month < 600) {
    month++;

    // Sort debts
    if (strategy === "snowball") {
      debts.sort((a, b) => a.balance - b.balance);
    } else if (strategy === "avalanche") {
      debts.sort((a, b) => b.rate - a.rate);
    } else if (strategy === "income") {
      debts.sort((a, b) => b.min - a.min);
    }

    let payment = extra;

    for (let debt of debts) {
      if (debt.balance <= 0) continue;

      let interest = (debt.balance * debt.rate) / 12;
      totalInterest += interest;
      debt.balance += interest;

      let payAmount = debt.min;

      if (payment > 0 && debt.balance > 0) {
        payAmount += payment;
        payment = 0;
      }

      debt.balance -= payAmount;
      if (debt.balance < 0) debt.balance = 0;
    }

    balancesOverTime.push({
      month,
      total: debts.reduce((sum, d) => sum + d.balance, 0)
    });
  }

  const today = new Date();
  today.setMonth(today.getMonth() + month);

  return {
    debtFreeDate: today.toLocaleDateString(),
    totalInterest: totalInterest.toFixed(2),
    months: month,
    balancesOverTime
  };
}

// Display results
function displayResults(res) {
  document.getElementById("results").classList.remove("d-none");
  document.getElementById("debtFreeDate").textContent = res.debtFreeDate;
  document.getElementById("totalInterest").textContent = res.totalInterest;
  document.getElementById("months").textContent = res.months;

  const canvas = document.getElementById("chart");
  // Fix: Reset canvas height before creating new chart
  canvas.height = 400;

  const ctx = canvas.getContext("2d");
  if (window.debtChart) window.debtChart.destroy();

  window.debtChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: res.balancesOverTime.map(p => p.month),
      datasets: [{
        label: "Total Debt Balance",
        data: res.balancesOverTime.map(p => p.total),
        borderColor: "#2d6a4f",
        backgroundColor: "rgba(45, 106, 79, 0.2)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: "Months" } },
        y: { title: { display: true, text: "Total Balance ($)" } }
      }
    }
  });
}
