const elements = {
   loading: document.getElementById("dashboard-loading"),
   error: document.getElementById("dashboard-error"),
   content: document.getElementById("dashboard-content"),

   username: document.getElementById("dashboard-username"),
   wallet: document.getElementById("dashboard-wallet"),

   createdCampaignsCount: document.getElementById(
      "created-campaigns-count"
   ),
   supportedCampaignsCount: document.getElementById(
      "supported-campaigns-count"
   ),
   totalContributed: document.getElementById(
      "total-contributed"
   ),
   totalDividends: document.getElementById(
      "total-dividends"
   ),

   myCampaigns: document.getElementById("my-campaigns"),
   myCampaignsEmpty: document.getElementById(
      "my-campaigns-empty"
   ),

   myContributions: document.getElementById(
      "my-contributions"
   ),
   myContributionsTable: document.getElementById(
      "my-contributions-table"
   ),
   myContributionsEmpty: document.getElementById(
      "my-contributions-empty"
   )
};

function escapeHtml(value) {
   return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
   if (!dateString) {
      return "—";
   }

   return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
   }).format(new Date(dateString));
}

function getTokenAmount(amount) {
   if (!amount) {
      return "0";
   }

   if (
      amount.formatted !== null &&
      amount.formatted !== undefined
   ) {
      return amount.formatted;
   }

   const raw = amount.raw || "0";
   const decimals = Number(amount.decimals || 0);

   if (decimals === 0) {
      return raw;
   }

   const normalized = raw.padStart(decimals + 1, "0");
   const integerPart = normalized.slice(0, -decimals);

   const fractionalPart = normalized
      .slice(-decimals)
      .replace(/0+$/, "");

   return fractionalPart
      ? `${integerPart}.${fractionalPart}`
      : integerPart;
}

function formatAmount(amount) {
   if (!amount) {
      return "0";
   }

   const numericValue = Number(getTokenAmount(amount));

   const formattedValue = numericValue.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
   });

   return `${formattedValue} ${amount.symbol || ""}`.trim();
}

function getCampaignStatusLabel(status) {
   const labels = {
      PENDING_DEPLOYMENT: "Развёртывается",
      OPEN: "Активна",
      CLOSED_GOAL_REACHED: "Цель достигнута",
      FAILED_DEADLINE: "Срок истёк"
   };

   return labels[status] || status;
}

function getContributionStatusLabel(status) {
   const labels = {
      PREPARED: "Подготовлен",
      PENDING: "Проверяется",
      CONFIRMED: "Подтверждён",
      FAILED: "Ошибка",
      REVERTED: "Отменён"
   };

   return labels[status] || status;
}

function renderCampaignStatus(status) {
   const finished =
      status === "CLOSED_GOAL_REACHED" ||
      status === "FAILED_DEADLINE";

   return `
      <span class="status ${finished ? "done" : ""}">
         <span class="dot"></span>
         ${escapeHtml(getCampaignStatusLabel(status))}
      </span>
   `;
}

function createCampaignCard(campaign) {
   const progress = Math.min(
      Number(campaign.financials?.progressPercent || 0),
      100
   );

   const canOpenDividends =
      campaign.status === "CLOSED_GOAL_REACHED";

   return `
      <article class="card">
         <div class="between">
            <h3 class="card-title">
               ${escapeHtml(campaign.title)}
            </h3>

            ${renderCampaignStatus(campaign.status)}
         </div>

         <p class="muted small">
            ${escapeHtml(campaign.shortDescription || "")}
         </p>

         <div class="progress">
            <span style="width: ${progress}%"></span>
         </div>

         <div class="between mt mono small">
            <span class="green">
               ${escapeHtml(
                  formatAmount(campaign.financials?.raisedAmount)
               )}
            </span>

            <span class="muted">
               из
               ${escapeHtml(
                  formatAmount(campaign.financials?.targetAmount)
               )}
            </span>
         </div>

         <div class="between mt">
            <a
               class="btn"
               href="campaign.html?id=${encodeURIComponent(campaign.id)}"
            >
               Подробнее
            </a>

            ${
               canOpenDividends
                  ? `
                     <a
                        class="btn btn-primary"
                        href="dividends.html?id=${encodeURIComponent(campaign.id)}"
                     >
                        Дивиденды
                     </a>
                  `
                  : ""
            }
         </div>
      </article>
   `;
}

function createContributionRow(item) {
   const contribution = item.contribution;
   const campaign = item.campaign;

   return `
      <a
         class="tr cols-4"
         href="campaign.html?id=${encodeURIComponent(campaign.id)}"
      >
         <div>
            <strong>
               ${escapeHtml(campaign.title)}
            </strong>
         </div>

         <div class="right mono green">
            ${escapeHtml(formatAmount(contribution.amount))}
         </div>

         <div class="right">
            ${escapeHtml(
               getContributionStatusLabel(contribution.status)
            )}
         </div>

         <div class="right mono muted small">
            ${escapeHtml(formatDate(contribution.createdAt))}
         </div>
      </a>
   `;
}

function renderUser(user) {
   elements.username.textContent = [
      user.firstName,
      user.lastName
   ]
      .filter(Boolean)
      .join(" ") || user.username;

   elements.wallet.textContent = user.walletAddress;
}

function renderAggregates(aggregates) {
   elements.createdCampaignsCount.textContent =
      aggregates.createdCampaignsCount ?? 0;

   elements.supportedCampaignsCount.textContent =
      aggregates.supportedCampaignsCount ?? 0;

   elements.totalContributed.textContent =
      formatAmount(aggregates.totalContributed);

   elements.totalDividends.textContent =
      formatAmount(aggregates.totalDividendsReceived);
}

function renderCampaigns(campaigns) {
   elements.myCampaigns.innerHTML = "";
   elements.myCampaignsEmpty.hidden = true;

   if (!campaigns.length) {
      elements.myCampaignsEmpty.hidden = false;
      return;
   }

   elements.myCampaigns.innerHTML = campaigns
      .map(createCampaignCard)
      .join("");
}

function renderContributions(contributions) {
   elements.myContributions.innerHTML = "";
   elements.myContributionsTable.hidden = true;
   elements.myContributionsEmpty.hidden = true;

   if (!contributions.length) {
      elements.myContributionsEmpty.hidden = false;
      return;
   }

   elements.myContributions.innerHTML = contributions
      .map(createContributionRow)
      .join("");

   elements.myContributionsTable.hidden = false;
}

async function loadDashboard() {
   const accessToken = localStorage.getItem("accessToken");

   if (!accessToken) {
      location.href = "auth.html";
      return;
   }

   elements.loading.hidden = false;
   elements.error.hidden = true;
   elements.content.hidden = true;

   try {
      const dashboard = await api.getDashboard(10);

      renderUser(dashboard.user);
      renderAggregates(dashboard.aggregates);
      renderCampaigns(dashboard.createdCampaigns || []);
      renderContributions(dashboard.contributions || []);

      elements.loading.hidden = true;
      elements.content.hidden = false;
   } catch (error) {
      elements.loading.hidden = true;
      elements.error.hidden = false;

      if (error.status === 401 || error.status === 403) {
         clearTokens();
         location.href = "auth.html";
         return;
      }

      elements.error.textContent =
         error.message ||
         "Не удалось загрузить личный кабинет.";
   }
}

loadDashboard();