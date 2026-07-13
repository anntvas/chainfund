const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");

const state = {
   campaign: null,
   contributionsPage: 1,
   contributionsPageSize: 20,
   contributionsTotalPages: 1,
   walletAddress: null
};

const elements = {
   campaignLoading: document.getElementById("campaign-loading"),
   campaignError: document.getElementById("campaign-error"),
   campaignContent: document.getElementById("campaign-content"),

   title: document.getElementById("campaign-title"),
   description: document.getElementById("campaign-description"),
   status: document.getElementById("campaign-status"),
   goal: document.getElementById("campaign-goal"),
   raised: document.getElementById("campaign-raised"),
   days: document.getElementById("campaign-days"),
   progressBar: document.getElementById("campaign-progress-bar"),
   percent: document.getElementById("campaign-percent"),
   contributors: document.getElementById("campaign-contributors"),
   owner: document.getElementById("campaign-owner"),

   contributionsLoading: document.getElementById(
      "contributions-loading"
   ),
   contributionsError: document.getElementById(
      "contributions-error"
   ),
   contributionsEmpty: document.getElementById(
      "contributions-empty"
   ),
   contributionsTable: document.getElementById(
      "contributions-table"
   ),
   contributionsList: document.getElementById(
      "campaign-contributions"
   ),
   contributionsPagination: document.getElementById(
      "contributions-pagination"
   ),
   contributionsPreviousButton: document.getElementById(
      "contributions-previous-button"
   ),
   contributionsNextButton: document.getElementById(
      "contributions-next-button"
   ),
   contributionsPageInformation: document.getElementById(
      "contributions-page-information"
   ),

   contributionForm: document.getElementById("contribution-form"),
   contributionAmount: document.getElementById(
      "contribution-amount"
   ),
   contributionSubmitButton: document.getElementById(
      "contribution-submit-button"
   ),
   contributionError: document.getElementById(
      "contribution-error"
   ),
   contributionSuccess: document.getElementById(
      "contribution-success"
   ),
   contributionUnavailable: document.getElementById(
      "contribution-unavailable"
   ),
   walletInformation: document.getElementById(
      "wallet-information"
   ),

   historyLink: document.getElementById(
      "campaign-history-link"
   ),
   dividendsLink: document.getElementById(
   "campaign-dividends-link"
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
   }).format(new Date(dateString));
}

function getDaysLeft(deadline) {
   if (!deadline) {
      return "—";
   }

   const now = new Date();
   const deadlineDate = new Date(deadline);
   const difference = deadlineDate.getTime() - now.getTime();

   if (difference <= 0) {
      return "—";
   }

   const days = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
   );

   return `${days} дн.`;
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

function getStatusLabel(status) {
   const labels = {
      PENDING_DEPLOYMENT: "Развёртывается",
      OPEN: "Активна",
      CLOSED_GOAL_REACHED: "Цель достигнута",
      FAILED_DEADLINE: "Срок истёк"
   };

   return labels[status] || status;
}

function renderStatus(status) {
   const completed =
      status === "CLOSED_GOAL_REACHED" ||
      status === "FAILED_DEADLINE";

   return `
      <span class="status ${completed ? "done" : ""}">
         <span class="dot"></span>
         ${escapeHtml(getStatusLabel(status))}
      </span>
   `;
}

function shortenWallet(address) {
   if (!address || address.length < 12) {
      return address || "—";
   }

   return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function displayError(element, message) {
   element.hidden = false;
   element.textContent = message;
}

function hideMessage(element) {
   element.hidden = true;
   element.textContent = "";
}

function renderCampaign(campaign) {
   const progress = Math.min(
      Number(campaign.financials.progressPercent || 0),
      100
   );

   elements.title.textContent = campaign.title.toUpperCase();
   elements.description.textContent = campaign.description;

   elements.status.innerHTML = renderStatus(campaign.status);

   elements.goal.textContent = formatAmount(
      campaign.financials.targetAmount
   );

   elements.raised.textContent = formatAmount(
      campaign.financials.raisedAmount
   );

   elements.days.textContent = getDaysLeft(campaign.deadline);

   elements.progressBar.style.width = `${progress}%`;

   elements.percent.textContent =
      `${progress.toFixed(0)}% собрано`;

   elements.contributors.textContent =
      `${campaign.financials.contributorsCount} вкладчиков`;

   elements.owner.textContent =
      campaign.creator?.walletAddress || "—";

   elements.historyLink.href =
      `history.html?campaignId=${encodeURIComponent(campaign.id)}`;
   elements.dividendsLink.href =
   `dividends.html?id=${encodeURIComponent(campaign.id)}`;
}

function createContributionRow(contribution) {
   return `
      <div class="tr cols-3">
         <div class="mono muted small">
            ${escapeHtml(
               shortenWallet(contribution.contributorWallet)
            )}
         </div>

         <div class="right mono green">
            ${escapeHtml(formatAmount(contribution.amount))}
         </div>

         <div class="right mono muted small">
            ${escapeHtml(formatDate(contribution.createdAt))}
         </div>
      </div>
   `;
}

function updateContributionsPagination(pagination) {
   state.contributionsTotalPages =
      pagination.totalPages || 1;

   const currentPage = pagination.page || 1;
   const totalPages = Math.max(
      pagination.totalPages || 0,
      1
   );

   elements.contributionsPageInformation.textContent =
      `Страница ${currentPage} из ${totalPages}`;

   elements.contributionsPreviousButton.disabled =
      currentPage <= 1;

   elements.contributionsNextButton.disabled =
      pagination.totalPages === 0 ||
      currentPage >= pagination.totalPages;

   elements.contributionsPagination.hidden =
      pagination.totalPages <= 1;
}

async function loadCampaign() {
   if (!campaignId) {
      throw new Error(
         "В адресе страницы не указан идентификатор кампании."
      );
   }

   const campaign = await api.getCampaign(campaignId);

   state.campaign = campaign;

   renderCampaign(campaign);
}

async function loadContributions() {
   elements.contributionsLoading.hidden = false;
   elements.contributionsError.hidden = true;
   elements.contributionsEmpty.hidden = true;
   elements.contributionsTable.hidden = true;
   elements.contributionsPagination.hidden = true;
   elements.contributionsList.innerHTML = "";

   try {
      const response = await api.getCampaignContributions(
         campaignId,
         state.contributionsPage,
         state.contributionsPageSize
      );

      const contributions = response.items || [];

      elements.contributionsLoading.hidden = true;

      if (contributions.length === 0) {
         elements.contributionsEmpty.hidden = false;
         return;
      }

      elements.contributionsList.innerHTML = contributions
         .map(createContributionRow)
         .join("");

      elements.contributionsTable.hidden = false;

      updateContributionsPagination(response.pagination);
   } catch (error) {
      elements.contributionsLoading.hidden = true;

      displayError(
         elements.contributionsError,
         error.message || "Не удалось загрузить взносы."
      );
   }
}

async function renderDividendsLink() {
   const accessToken =
      localStorage.getItem("accessToken");

   elements.dividendsLink.hidden = true;

   if (
      !accessToken ||
      !state.campaign ||
      state.campaign.status !== "CLOSED_GOAL_REACHED"
   ) {
      return;
   }

   try {
      const currentUser =
         await api.getCurrentUser();

      const currentWallet =
         currentUser?.walletAddress?.toLowerCase();

      const creatorWallet =
         state.campaign.creator
            ?.walletAddress
            ?.toLowerCase();

      const isCreator =
         currentWallet &&
         creatorWallet &&
         currentWallet === creatorWallet;

      elements.dividendsLink.hidden =
         !isCreator;
   } catch (error) {
      console.error(
         "Не удалось проверить владельца кампании:",
         error
      );

      elements.dividendsLink.hidden = true;
   }
}

function renderContributionForm() {
   const campaign = state.campaign;
   const accessToken = localStorage.getItem("accessToken");

   elements.contributionForm.hidden = false;
   elements.contributionUnavailable.hidden = true;
   elements.contributionSubmitButton.disabled = false;

   if (!accessToken) {
      elements.contributionForm.hidden = true;
      elements.contributionUnavailable.hidden = false;
      elements.contributionUnavailable.innerHTML = `
         <div class="notice muted">
            Войдите в аккаунт, чтобы сделать взнос.
            <a class="green" href="auth.html">Войти</a>
         </div>
      `;
      return;
   }

   if (campaign.status === "CLOSED_GOAL_REACHED") {
      elements.contributionForm.hidden = true;
      elements.contributionUnavailable.hidden = false;
      elements.contributionUnavailable.innerHTML = `
         <div class="center">
            <h3 class="green">
               ✓ Цель достигнута
            </h3>
            <p class="muted">
               Сбор средств завершён.
            </p>
         </div>
      `;
      return;
   }

   if (campaign.status === "FAILED_DEADLINE") {
      elements.contributionForm.hidden = true;
      elements.contributionUnavailable.hidden = false;
      elements.contributionUnavailable.innerHTML = `
         <div class="center">
            <h3>Срок кампании истёк</h3>
            <p class="muted">
               Новые взносы больше не принимаются.
            </p>
         </div>
      `;
      return;
   }

   if (campaign.status === "PENDING_DEPLOYMENT") {
      elements.contributionForm.hidden = true;
      elements.contributionUnavailable.hidden = false;
      elements.contributionUnavailable.innerHTML = `
         <div class="notice muted">
            Кампания ещё развёртывается в блокчейне.
         </div>
      `;
      return;
   }

   elements.walletInformation.textContent =
      "После отправки откроется MetaMask для подписи транзакции.";
}

async function connectWallet() {
   if (!window.ethereum) {
      throw new Error("MetaMask не установлен.");
   }

   const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
   });

   if (!accounts.length) {
      throw new Error("Адрес кошелька не получен.");
   }

   state.walletAddress = accounts[0];

   elements.walletInformation.innerHTML = `
      Кошелёк:
      <span class="green">
         ${escapeHtml(shortenWallet(state.walletAddress))}
      </span>
   `;

   return state.walletAddress;
}

function convertToRaw(value, decimals) {
   const text = String(value).trim();

   if (!/^\d+(\.\d+)?$/.test(text)) {
      throw new Error("Введите корректную сумму.");
   }

   const [integerPart, fractionalPart = ""] =
      text.split(".");

   if (fractionalPart.length > decimals) {
      throw new Error(
         `Допустимо не более ${decimals} знаков после запятой.`
      );
   }

   const normalizedFraction = fractionalPart.padEnd(
      decimals,
      "0"
   );

   const raw = `${integerPart}${normalizedFraction}`
      .replace(/^0+/, "") || "0";

   if (raw === "0") {
      throw new Error("Сумма должна быть больше нуля.");
   }

   return raw;
}

async function sendTransaction(transactionRequest) {
   const transaction = {
      from: transactionRequest.from,
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: `0x${BigInt(
         transactionRequest.valueRaw || "0"
      ).toString(16)}`
   };

   if (transactionRequest.gasLimit) {
      transaction.gas = `0x${BigInt(
         transactionRequest.gasLimit
      ).toString(16)}`;
   }

   return window.ethereum.request({
      method: "eth_sendTransaction",
      params: [transaction]
   });
}

async function contribute(event) {
   event.preventDefault();

   hideMessage(elements.contributionError);
   hideMessage(elements.contributionSuccess);

   elements.contributionSubmitButton.disabled = true;
   elements.contributionSubmitButton.textContent =
      "Подготовка транзакции...";

   try {
      if (!state.walletAddress) {
         await connectWallet();
      }

      const decimals =
         state.campaign.financials.targetAmount.decimals;

      const amountRaw = convertToRaw(
         elements.contributionAmount.value,
         decimals
      );

      const chainIdHex = await window.ethereum.request({
         method: "eth_chainId"
      });

      const chainId = Number.parseInt(chainIdHex, 16);

      const prepared = await api.prepareContribution(
         campaignId,
         {
            amountRaw,
            chainId
         }
      );

      elements.contributionSubmitButton.textContent =
         "Подтвердите в MetaMask...";

      const transactionHash = await sendTransaction(
         prepared.transactionRequest
      );

      elements.contributionSubmitButton.textContent =
         "Проверка транзакции...";

      await api.confirmContribution(
         campaignId,
         {
            contributionId: prepared.contribution.id,
            transactionHash
         }
      );

      elements.contributionSuccess.hidden = false;
      elements.contributionSuccess.textContent =
         "Транзакция отправлена и принята на проверку.";

      elements.contributionAmount.value = "";

      await Promise.all([
         loadCampaign(),
         loadContributions()
      ]);

      renderContributionForm();
   } catch (error) {
      displayError(
         elements.contributionError,
         error.message || "Не удалось выполнить взнос."
      );
   } finally {
      elements.contributionSubmitButton.disabled = false;
      elements.contributionSubmitButton.textContent =
         "Внести средства";
   }
}

elements.contributionForm.addEventListener(
   "submit",
   contribute
);

elements.contributionsPreviousButton.addEventListener(
   "click",
   () => {
      if (state.contributionsPage <= 1) {
         return;
      }

      state.contributionsPage -= 1;
      loadContributions();
   }
);

elements.contributionsNextButton.addEventListener(
   "click",
   () => {
      if (
         state.contributionsPage >=
         state.contributionsTotalPages
      ) {
         return;
      }

      state.contributionsPage += 1;
      loadContributions();
   }
);

async function initCampaignPage() {
   elements.campaignLoading.hidden = false;
   elements.campaignError.hidden = true;
   elements.campaignContent.hidden = true;

   try {
      await loadCampaign();

      elements.campaignLoading.hidden = true;
      elements.campaignContent.hidden = false;

      renderContributionForm();

      await renderDividendsLink();

      await loadContributions();
   } catch (error) {
      elements.campaignLoading.hidden = true;

      displayError(
         elements.campaignError,
         error.message || "Не удалось загрузить кампанию."
      );
   }
}

initCampaignPage();