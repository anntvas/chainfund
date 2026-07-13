const params = new URLSearchParams(window.location.search);

const campaignId =
   params.get("campaignId") ||
   params.get("id");

const state = {
   page: 1,
   pageSize: 20,
   totalPages: 1
};

const elements = {
   campaignName: document.getElementById("campaign-name"),
   pageLoading: document.getElementById("page-loading"),
   pageError: document.getElementById("page-error"),
   payoutsEmpty: document.getElementById("payouts-empty"),
   historyContent: document.getElementById("history-content"),

   payoutsList: document.getElementById("payouts-list"),
   payoutDetail: document.getElementById("payout-detail"),

   pagination: document.getElementById("payout-pagination"),
   previousButton: document.getElementById("previous-page-button"),
   nextButton: document.getElementById("next-page-button"),
   pageInformation: document.getElementById("page-information"),

   backLink: document.getElementById("back-link")
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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

function getPayoutStatusLabel(status) {
   const labels = {
      PREPARED: "Подготовлена",
      PENDING: "Проверяется",
      CONFIRMED: "Подтверждена",
      FAILED: "Ошибка",
      REVERTED: "Отменена"
   };

   return labels[status] || status;
}

function shortenWallet(address) {
   if (!address || address.length < 12) {
      return address || "—";
   }

   return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function createPayoutRow(payout, index) {
   const number =
      (state.page - 1) * state.pageSize + index + 1;

   return `
      <button
         class="tr cols-4"
         type="button"
         style="
            width: 100%;
            color: inherit;
            background: none;
            border-left: 0;
            border-right: 0;
            border-top: 0;
            text-align: left;
            cursor: pointer;
         "
         data-payout-id="${escapeHtml(payout.id)}"
      >
         <div class="mono muted">
            #${number}
         </div>

         <div>
            ${escapeHtml(formatDate(payout.createdAt))}
         </div>

         <div class="right">
            ${escapeHtml(payout.recipientsCount)}
         </div>

         <div class="right mono green">
            ${escapeHtml(formatAmount(payout.profitAmount))}
         </div>
      </button>
   `;
}

function createDistributionRow(distribution) {
   return `
      <div
         class="between"
         style="
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
         "
      >
         <div>
            <div class="mono">
               ${escapeHtml(
                  shortenWallet(distribution.walletAddress)
               )}
            </div>

            <div
               class="mono small"
               style="color: var(--accent)"
            >
               ${escapeHtml(
                  Number(distribution.sharePercent || 0).toFixed(2)
               )}%
            </div>

            <div class="muted small">
               Вклад:
               ${escapeHtml(
                  formatAmount(distribution.contributionAmount)
               )}
            </div>
         </div>

         <div class="mono green">
            ${escapeHtml(
               formatAmount(distribution.payoutAmount)
            )}
         </div>
      </div>
   `;
}

async function loadCampaign() {
   const campaign = await api.getCampaign(campaignId);

   elements.campaignName.textContent = campaign.title;

   if (elements.backLink) {
      elements.backLink.href =
         `campaign.html?id=${encodeURIComponent(campaignId)}`;
   }
}

function updatePagination(pagination) {
   state.totalPages = pagination.totalPages || 1;

   const currentPage = pagination.page || 1;
   const totalPages = Math.max(
      pagination.totalPages || 0,
      1
   );

   elements.pageInformation.textContent =
      `Страница ${currentPage} из ${totalPages}`;

   elements.previousButton.disabled =
      currentPage <= 1;

   elements.nextButton.disabled =
      pagination.totalPages === 0 ||
      currentPage >= pagination.totalPages;

   elements.pagination.hidden =
      pagination.totalPages <= 1;
}

async function loadPayouts() {
   elements.pageLoading.hidden = false;
   elements.pageError.hidden = true;
   elements.payoutsEmpty.hidden = true;
   elements.historyContent.hidden = true;
   elements.pagination.hidden = true;
   elements.payoutsList.innerHTML = "";

   try {
      const response = await api.getCampaignPayouts(
         campaignId,
         state.page,
         state.pageSize
      );

      const payouts = response.items || [];

      elements.pageLoading.hidden = true;

      if (payouts.length === 0) {
         elements.payoutsEmpty.hidden = false;
         return;
      }

      elements.payoutsList.innerHTML = payouts
         .map(createPayoutRow)
         .join("");

      elements.historyContent.hidden = false;

      updatePagination(response.pagination);

      bindPayoutButtons();
   } catch (error) {
      elements.pageLoading.hidden = true;
      elements.pageError.hidden = false;

      elements.pageError.textContent =
         error.message ||
         "Не удалось загрузить историю выплат.";
   }
}

function bindPayoutButtons() {
   const buttons = elements.payoutsList.querySelectorAll(
      "[data-payout-id]"
   );

   buttons.forEach(button => {
      button.addEventListener("click", () => {
         const payoutId =
            button.dataset.payoutId;

         loadPayoutDetail(payoutId);
      });
   });
}

async function loadPayoutDetail(payoutId) {
   elements.payoutDetail.className = "card muted";

   elements.payoutDetail.textContent =
      "Загрузка информации о выплате...";

   try {
      const [payout, distributionsResponse] =
         await Promise.all([
            api.getPayout(campaignId, payoutId),

            api.getPayoutDistributions(
               campaignId,
               payoutId,
               1,
               100
            )
         ]);

      const distributions =
         distributionsResponse.items || [];

      elements.payoutDetail.className = "card";

      elements.payoutDetail.innerHTML = `
         <div class="between">
            <div>
               <h2 class="card-title">
                  ВЫПЛАТА
               </h2>

               <div class="muted small">
                  ${escapeHtml(
                     getPayoutStatusLabel(payout.status)
                  )}
               </div>
            </div>

            <span class="mono green">
               ${escapeHtml(
                  formatAmount(payout.profitAmount)
               )}
            </span>
         </div>

         <div class="mt small">
            <div class="between">
               <span class="muted">
                  Дата
               </span>

               <span>
                  ${escapeHtml(
                     formatDate(payout.createdAt)
                  )}
               </span>
            </div>

            <div class="between mt">
               <span class="muted">
                  Получателей
               </span>

               <span>
                  ${escapeHtml(payout.recipientsCount)}
               </span>
            </div>

            <div class="between mt">
               <span class="muted">
                  Распределено
               </span>

               <span class="mono green">
                  ${escapeHtml(
                     formatAmount(payout.distributedAmount)
                  )}
               </span>
            </div>
         </div>

         <div class="mt">
            ${
               distributions.length
                  ? distributions
                     .map(createDistributionRow)
                     .join("")
                  : `
                     <div class="muted">
                        Данные распределения отсутствуют.
                     </div>
                  `
            }
         </div>
      `;
   } catch (error) {
      elements.payoutDetail.className =
         "card error-message";

      elements.payoutDetail.textContent =
         error.message ||
         "Не удалось загрузить информацию о выплате.";
   }
}

elements.previousButton.addEventListener("click", () => {
   if (state.page <= 1) {
      return;
   }

   state.page -= 1;
   loadPayouts();
});

elements.nextButton.addEventListener("click", () => {
   if (state.page >= state.totalPages) {
      return;
   }

   state.page += 1;
   loadPayouts();
});

async function initHistoryPage() {
   if (!campaignId) {
      elements.pageLoading.hidden = true;
      elements.pageError.hidden = false;

      elements.pageError.textContent =
         "В адресе страницы не указан идентификатор кампании.";

      return;
   }

   try {
      await loadCampaign();
      await loadPayouts();
   } catch (error) {
      elements.pageLoading.hidden = true;
      elements.pageError.hidden = false;

      elements.pageError.textContent =
         error.message ||
         "Не удалось загрузить кампанию.";
   }
}

initHistoryPage();