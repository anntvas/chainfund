const state = {
   page: 1,
   pageSize: 10,
   query: "",
   status: "",
   sort: "CREATED_AT_DESC",
   totalPages: 1
};

const elements = {
   heroActions: document.getElementById("hero-actions"),

   popularLoading: document.getElementById("popular-loading"),
   popularError: document.getElementById("popular-error"),
   popularEmpty: document.getElementById("popular-empty"),
   popularCampaigns: document.getElementById("popular-campaigns"),

   searchForm: document.getElementById("campaign-search-form"),
   searchInput: document.getElementById("campaign-search"),
   statusSelect: document.getElementById("campaign-status"),
   sortSelect: document.getElementById("campaign-sort"),
   resetButton: document.getElementById("reset-search-button"),

   campaignsLoading: document.getElementById("campaigns-loading"),
   campaignsError: document.getElementById("campaigns-error"),
   campaignsEmpty: document.getElementById("campaigns-empty"),
   campaignsTable: document.getElementById("campaigns-table"),
   allCampaigns: document.getElementById("all-campaigns"),

   pagination: document.getElementById("campaign-pagination"),
   previousButton: document.getElementById("previous-page-button"),
   nextButton: document.getElementById("next-page-button"),
   pageInformation: document.getElementById("page-information")
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

function getStatusLabel(status) {
   const labels = {
      PENDING_DEPLOYMENT: "Развёртывается",
      OPEN: "Идёт сбор",
      CLOSED_GOAL_REACHED: "Цель достигнута",
      FAILED_DEADLINE: "Срок истёк"
   };

   return labels[status] || status;
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

function createPopularCard(campaign) {
   const progress = Math.min(
      Number(campaign.progressPercent || 0),
      100
   );

   return `
      <a
         class="card"
         href="campaign.html?id=${encodeURIComponent(campaign.id)}"
      >
         <div class="card-body">
            <div class="card-topline">
               <span class="status-badge">
                  ${escapeHtml(getStatusLabel(campaign.status))}
               </span>

               <span class="mono muted">
                  ${escapeHtml(formatDate(campaign.deadline))}
               </span>
            </div>

            <h3>${escapeHtml(campaign.title)}</h3>

            <p>
               ${escapeHtml(campaign.shortDescription)}
            </p>

            <div class="progress">
               <div
                  class="progress-fill"
                  style="width: ${progress}%"
               ></div>
            </div>

            <div class="card-stats">
               <span>
                  <strong>
                     ${escapeHtml(formatAmount(campaign.raisedAmount))}
                  </strong>
                  собрано
               </span>

               <span class="right">
                  <strong>
                     ${escapeHtml(progress.toFixed(0))}%
                  </strong>
                  от цели
               </span>
            </div>
         </div>
      </a>
   `;
}

function createCampaignRow(campaign) {
   return `
      <a
         class="tr cols-5"
         href="campaign.html?id=${encodeURIComponent(campaign.id)}"
      >
         <div>
            <strong>
               ${escapeHtml(campaign.title)}
            </strong>

            <div class="muted">
               ${escapeHtml(campaign.shortDescription)}
            </div>
         </div>

         <div class="right mono green">
            ${escapeHtml(formatAmount(campaign.raisedAmount))}
         </div>

         <div class="right mono muted">
            ${escapeHtml(formatAmount(campaign.targetAmount))}
         </div>

         <div class="right">
            ${escapeHtml(formatDate(campaign.deadline))}
         </div>

         <div class="right">
            ${escapeHtml(getStatusLabel(campaign.status))}
         </div>
      </a>
   `;
}

function renderHeroActions() {
   const accessToken = localStorage.getItem("accessToken");

   if (accessToken) {
      elements.heroActions.innerHTML = `
         <a class="btn btn-primary" href="create.html">
            + Создать кампанию
         </a>
      `;
   } else {
      elements.heroActions.innerHTML = `
         <a class="btn btn-primary" href="auth.html">
            Войти через кошелёк
         </a>
      `;
   }
}

async function loadPopularCampaigns() {
   elements.popularLoading.hidden = false;
   elements.popularError.hidden = true;
   elements.popularEmpty.hidden = true;
   elements.popularCampaigns.innerHTML = "";

   try {
      const response = await api.getHome(2, 0);
      const campaigns = response.popularCampaigns || [];

      elements.popularLoading.hidden = true;

      if (campaigns.length === 0) {
         elements.popularEmpty.hidden = false;
         return;
      }

      elements.popularCampaigns.innerHTML = campaigns
         .map(createPopularCard)
         .join("");
   } catch (error) {
      elements.popularLoading.hidden = true;
      elements.popularError.hidden = false;
      elements.popularError.textContent =
         error.message || "Не удалось загрузить популярные кампании.";
   }
}

function updatePagination(pagination) {
   state.totalPages = pagination.totalPages || 1;

   const currentPage = pagination.page || 1;
   const totalPages = Math.max(pagination.totalPages || 0, 1);

   elements.pageInformation.textContent =
      `Страница ${currentPage} из ${totalPages}`;

   elements.previousButton.disabled = currentPage <= 1;

   elements.nextButton.disabled =
      pagination.totalPages === 0 ||
      currentPage >= pagination.totalPages;

   elements.pagination.hidden =
      pagination.totalPages <= 1;
}

async function loadCampaigns() {
   elements.campaignsLoading.hidden = false;
   elements.campaignsError.hidden = true;
   elements.campaignsEmpty.hidden = true;
   elements.campaignsTable.hidden = true;
   elements.pagination.hidden = true;
   elements.allCampaigns.innerHTML = "";

   try {
      const response = await api.getCampaigns({
         query: state.query,
         status: state.status ? [state.status] : [],
         sort: state.sort,
         page: state.page,
         pageSize: state.pageSize
      });

      const campaigns = response.items || [];

      elements.campaignsLoading.hidden = true;

      if (campaigns.length === 0) {
         elements.campaignsEmpty.hidden = false;
         return;
      }

      elements.allCampaigns.innerHTML = campaigns
         .map(createCampaignRow)
         .join("");

      elements.campaignsTable.hidden = false;

      updatePagination(response.pagination);
   } catch (error) {
      elements.campaignsLoading.hidden = true;
      elements.campaignsError.hidden = false;
      elements.campaignsError.textContent =
         error.message || "Не удалось загрузить кампании.";
   }
}

function applyFilters() {
   state.query = elements.searchInput.value.trim();
   state.status = elements.statusSelect.value;
   state.sort = elements.sortSelect.value;
   state.page = 1;

   loadCampaigns();
}

elements.searchForm.addEventListener("submit", event => {
   event.preventDefault();
   applyFilters();
});

elements.statusSelect.addEventListener("change", applyFilters);

elements.sortSelect.addEventListener("change", applyFilters);

elements.resetButton.addEventListener("click", () => {
   elements.searchForm.reset();

   state.query = "";
   state.status = "";
   state.sort = "CREATED_AT_DESC";
   state.page = 1;

   loadCampaigns();
});

elements.previousButton.addEventListener("click", () => {
   if (state.page <= 1) {
      return;
   }

   state.page -= 1;
   loadCampaigns();

   document
      .getElementById("all-title")
      .scrollIntoView({ behavior: "smooth" });
});

elements.nextButton.addEventListener("click", () => {
   if (state.page >= state.totalPages) {
      return;
   }

   state.page += 1;
   loadCampaigns();

   document
      .getElementById("all-title")
      .scrollIntoView({ behavior: "smooth" });
});

renderHeroActions();
loadPopularCampaigns();
loadCampaigns();