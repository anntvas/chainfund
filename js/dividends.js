const REQUIRED_CHAIN_ID = 31337;
const TOKEN_DECIMALS = 18;

const params = new URLSearchParams(
   window.location.search
);

const campaignId = params.get("id");

const state = {
   campaign: null,
   preparedPayout: null,
   transactionRequest: null,
   distributionPreview: null,
   isSubmitting: false
};

const elements = {
   backLink: document.getElementById("back-link"),
   subtitle: document.getElementById("subtitle"),

   pageError: document.getElementById("page-error"),
   pageSuccess: document.getElementById("page-success"),

   raisedAmount:
      document.getElementById("raised-amount"),

   contributorsCount:
      document.getElementById("contributors-count"),

   distributedAmount:
      document.getElementById("distributed-amount"),

   profitAmount:
      document.getElementById("profit-amount"),

   previewButton:
      document.getElementById("preview-button"),

   previewSection:
      document.getElementById("preview-section"),

   previewRecipients:
      document.getElementById("preview-recipients"),

   previewTotal:
      document.getElementById("preview-total"),

   previewStatus:
      document.getElementById("preview-status"),

   distributionRows:
      document.getElementById("distribution-rows"),

   confirmPayoutButton:
      document.getElementById(
         "confirm-payout-button"
      ),

   payoutsLoading:
      document.getElementById("payouts-loading"),

   payoutsEmpty:
      document.getElementById("payouts-empty"),

   payoutsList:
      document.getElementById("payouts-list")
};

function showError(message) {
   elements.pageError.hidden = false;
   elements.pageSuccess.hidden = true;

   elements.pageError.textContent = message;
   elements.pageSuccess.textContent = "";
}

function showSuccess(message) {
   elements.pageSuccess.hidden = false;
   elements.pageError.hidden = true;

   elements.pageSuccess.textContent = message;
   elements.pageError.textContent = "";
}

function hideMessages() {
   elements.pageError.hidden = true;
   elements.pageSuccess.hidden = true;

   elements.pageError.textContent = "";
   elements.pageSuccess.textContent = "";
}

function setPreviewButtonState(
   disabled,
   text = "Рассчитать распределение"
) {
   elements.previewButton.disabled = disabled;
   elements.previewButton.textContent = text;
}

function setConfirmButtonState(
   disabled,
   text = "Подтвердить выплату в MetaMask"
) {
   elements.confirmPayoutButton.disabled =
      disabled;

   elements.confirmPayoutButton.textContent =
      text;
}

function escapeHtml(value) {
   return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function shortenAddress(address) {
   if (!address) {
      return "—";
   }

   if (address.length <= 16) {
      return address;
   }

   return (
      address.slice(0, 8) +
      "..." +
      address.slice(-6)
   );
}

function normalizeAddress(address) {
   return String(address || "").toLowerCase();
}

function convertToRaw(
   value,
   decimals = TOKEN_DECIMALS
) {
   const text = String(value)
      .trim()
      .replace(",", ".");

   if (!/^\d+(\.\d+)?$/.test(text)) {
      throw new Error(
         "Введите корректную сумму дивидендов."
      );
   }

   const [integerPart, fractionalPart = ""] =
      text.split(".");

   if (fractionalPart.length > decimals) {
      throw new Error(
         `Допустимо не более ${decimals} знаков после запятой.`
      );
   }

   const normalizedFraction =
      fractionalPart.padEnd(decimals, "0");

   const raw =
      `${integerPart}${normalizedFraction}`
         .replace(/^0+/, "") || "0";

   if (raw === "0") {
      throw new Error(
         "Сумма дивидендов должна быть больше нуля."
      );
   }

   return raw;
}

function toHex(value) {
   if (
      value === null ||
      value === undefined ||
      value === ""
   ) {
      return "0x0";
   }

   return `0x${BigInt(value).toString(16)}`;
}

function formatTokenAmount(amount) {
   if (!amount) {
      return "0 VFT";
   }

   const symbol = amount.symbol || "VFT";

   if (
      amount.formatted !== null &&
      amount.formatted !== undefined
   ) {
      const numericValue =
         Number(amount.formatted);

      if (Number.isFinite(numericValue)) {
         return `${numericValue.toLocaleString(
            "ru-RU",
            {
               minimumFractionDigits: 0,
               maximumFractionDigits: 6
            }
         )} ${symbol}`;
      }

      return `${amount.formatted} ${symbol}`;
   }

   return `${amount.raw || "0"} ${symbol}`;
}

function formatDate(value) {
   if (!value) {
      return "—";
   }

   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return "—";
   }

   return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
   });
}

function getPayoutStatusText(status) {
   const statuses = {
      PREPARED: "Подготовлена",
      PENDING: "Проверяется",
      CONFIRMED: "Подтверждена",
      FAILED: "Ошибка",
      REVERTED: "Отменена блокчейном"
   };

   return statuses[status] || status || "—";
}

function getErrorMessage(error) {
   if (error?.code === 4001) {
      return "Транзакция была отклонена в MetaMask.";
   }

   if (error?.code === -32002) {
      return (
         "В MetaMask уже открыт запрос. " +
         "Откройте расширение и завершите его."
      );
   }

   if (
      error?.message
         ?.toLowerCase()
         .includes("insufficient funds")
   ) {
      return (
         "На кошельке недостаточно тестового ETH " +
         "для оплаты комиссии."
      );
   }

   if (
      error?.code === "PAYOUT_NOT_ALLOWED"
   ) {
      return (
         error.message ||
         "Распределение дивидендов сейчас недоступно."
      );
   }

   if (
      error?.code === "PAYOUT_ALREADY_EXECUTED"
   ) {
      return (
         "Для этой кампании выплата уже была выполнена."
      );
   }

   if (
      error?.code === "NO_CONFIRMED_CONTRIBUTORS"
   ) {
      return (
         "У кампании нет подтверждённых вкладчиков."
      );
   }

   if (
      error?.code ===
      "TRANSACTION_SENDER_MISMATCH"
   ) {
      return (
         "Транзакция отправлена не с кошелька создателя кампании."
      );
   }

   return (
      error?.message ||
      "Не удалось выполнить операцию."
   );
}

async function connectWallet() {
   if (!window.ethereum) {
      throw new Error(
         "MetaMask не установлен."
      );
   }

   const accounts =
      await window.ethereum.request({
         method: "eth_requestAccounts"
      });

   if (!accounts?.length) {
      throw new Error(
         "MetaMask не вернул подключённый аккаунт."
      );
   }

   return accounts[0];
}

async function getCurrentChainId() {
   if (!window.ethereum) {
      throw new Error(
         "MetaMask не установлен."
      );
   }

   const chainIdHex =
      await window.ethereum.request({
         method: "eth_chainId"
      });

   return Number.parseInt(chainIdHex, 16);
}

async function switchNetwork(chainId) {
   const chainIdHex =
      `0x${Number(chainId).toString(16)}`;

   try {
      await window.ethereum.request({
         method: "wallet_switchEthereumChain",
         params: [
            {
               chainId: chainIdHex
            }
         ]
      });
   } catch (error) {
      if (error?.code !== 4902) {
         throw new Error(
            `Переключите MetaMask на сеть с chainId ${chainId}.`
         );
      }

      await window.ethereum.request({
         method: "wallet_addEthereumChain",
         params: [
            {
               chainId: chainIdHex,
               chainName: "Local Hardhat",
               nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18
               },
               rpcUrls: [
                  "http://127.0.0.1:8545"
               ]
            }
         ]
      });
   }
}

async function ensureCorrectNetwork(chainId) {
   const currentChainId =
      await getCurrentChainId();

   if (currentChainId === Number(chainId)) {
      return;
   }

   await switchNetwork(chainId);

   const updatedChainId =
      await getCurrentChainId();

   if (updatedChainId !== Number(chainId)) {
      throw new Error(
         `Нужна сеть с chainId ${chainId}.`
      );
   }
}

function validateTransactionRequest(
   transactionRequest
) {
   if (!transactionRequest) {
      throw new Error(
         "Backend не вернул данные транзакции."
      );
   }

   if (!transactionRequest.from) {
      throw new Error(
         "В транзакции отсутствует адрес отправителя."
      );
   }

   if (!transactionRequest.to) {
      throw new Error(
         "В транзакции отсутствует адрес контракта."
      );
   }

   if (!transactionRequest.data) {
      throw new Error(
         "В транзакции отсутствуют данные вызова контракта."
      );
   }

   if (
      transactionRequest.expiresAt &&
      new Date(
         transactionRequest.expiresAt
      ).getTime() <= Date.now()
   ) {
      throw new Error(
         "Подготовленная транзакция просрочена. Рассчитайте распределение заново."
      );
   }
}

async function sendTransaction(
   transactionRequest
) {
   validateTransactionRequest(
      transactionRequest
   );

   const connectedAccount =
      await connectWallet();

   const expectedChainId =
      Number(
         transactionRequest.chainId ||
         REQUIRED_CHAIN_ID
      );

   await ensureCorrectNetwork(
      expectedChainId
   );

   if (
      normalizeAddress(connectedAccount) !==
      normalizeAddress(
         transactionRequest.from
      )
   ) {
      throw new Error(
         "В MetaMask выбран другой аккаунт. " +
         `Выберите адрес ${transactionRequest.from}.`
      );
   }

   const transaction = {
      from: connectedAccount,
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: toHex(
         transactionRequest.valueRaw || "0"
      )
   };

   if (transactionRequest.gasLimit) {
      transaction.gas = toHex(
         transactionRequest.gasLimit
      );
   }

   if (transactionRequest.maxFeePerGas) {
      transaction.maxFeePerGas = toHex(
         transactionRequest.maxFeePerGas
      );
   }

   if (
      transactionRequest.maxPriorityFeePerGas
   ) {
      transaction.maxPriorityFeePerGas =
         toHex(
            transactionRequest
               .maxPriorityFeePerGas
         );
   }

   console.log(
      "Транзакция выплаты для MetaMask:",
      transaction
   );

   const transactionHash =
      await window.ethereum.request({
         method: "eth_sendTransaction",
         params: [transaction]
      });

   if (!transactionHash) {
      throw new Error(
         "MetaMask не вернул хеш транзакции."
      );
   }

   return transactionHash;
}

function calculateContributionAmount(
   sharePercent
) {
   const raisedFormatted =
      state.campaign
         ?.financials
         ?.raisedAmount
         ?.formatted;

   const raised =
      Number(raisedFormatted || 0);

   const share =
      Number(sharePercent || 0);

   if (
      !Number.isFinite(raised) ||
      !Number.isFinite(share)
   ) {
      return 0;
   }

   return raised * share / 100;
}

function formatCalculatedAmount(
   value,
   symbol = "VFT"
) {
   const numericValue = Number(value || 0);

   return `${numericValue.toLocaleString(
      "ru-RU",
      {
         minimumFractionDigits: 0,
         maximumFractionDigits: 6
      }
   )} ${symbol}`;
}

function renderCampaignSummary() {
   const campaign = state.campaign;

   elements.subtitle.textContent =
      campaign.title;

   elements.raisedAmount.textContent =
      formatTokenAmount(
         campaign.financials?.raisedAmount
      );

   elements.contributorsCount.textContent =
      String(
         campaign.financials
            ?.contributorsCount ?? 0
      );

   elements.distributedAmount.textContent =
      formatTokenAmount(
         campaign.financials
            ?.totalProfitDistributed
      );

   if (elements.backLink) {
      elements.backLink.href =
         `campaign.html?id=${encodeURIComponent(
            campaignId
         )}`;
   }
}

function renderDistributionPreview() {
   const preview =
      state.distributionPreview;

   if (!preview) {
      elements.previewSection.hidden = true;
      elements.distributionRows.innerHTML = "";
      return;
   }

   elements.previewSection.hidden = false;

   elements.previewRecipients.textContent =
      String(preview.recipientsCount ?? 0);

   elements.previewTotal.textContent =
      formatTokenAmount(
         preview.distributedAmount
      );

   const items =
      preview.itemsPreview || [];

   if (!items.length) {
      elements.distributionRows.innerHTML = `
         <div class="tr cols-4">
            <div class="muted">
               Нет данных о распределении.
            </div>
            <div></div>
            <div></div>
            <div></div>
         </div>
      `;

      return;
   }

   const symbol =
      state.campaign
         ?.financials
         ?.raisedAmount
         ?.symbol || "VFT";

   elements.distributionRows.innerHTML =
      items.map(item => {
         const address =
            item.walletAddress || "—";

         const payoutAmount =
            formatTokenAmount(item.amount);

         const sharePercent =
            Number(
               item.sharePercent ?? 0
            );

         const contribution =
            item.contributionAmount
               ? formatTokenAmount(
                    item.contributionAmount
                 )
               : formatCalculatedAmount(
                    calculateContributionAmount(
                       sharePercent
                    ),
                    symbol
                 );

         const share =
            sharePercent.toLocaleString(
               "ru-RU",
               {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6
               }
            );

         return `
            <div class="tr cols-4">
               <div
                  class="mono muted small"
                  title="${escapeHtml(address)}"
               >
                  ${escapeHtml(
                     shortenAddress(address)
                  )}
               </div>

               <div class="right mono">
                  ${escapeHtml(contribution)}
               </div>

               <div
                  class="right mono"
                  style="color: var(--accent)"
               >
                  ${escapeHtml(share)}%
               </div>

               <div class="right mono green">
                  ${escapeHtml(payoutAmount)}
               </div>
            </div>
         `;
      }).join("");
}

function renderPayouts(payouts) {
   elements.payoutsLoading.hidden = true;

   if (!payouts.length) {
      elements.payoutsEmpty.hidden = false;
      elements.payoutsList.innerHTML = "";
      return;
   }

   elements.payoutsEmpty.hidden = true;

   elements.payoutsList.innerHTML =
      payouts.map(payout => {
         const hash =
            payout.transactionHash;

         return `
            <article class="card">
               <div class="between">
                  <div>
                     <div class="label">
                        СУММА ДИВИДЕНДОВ
                     </div>

                     <div class="stat-value mt">
                        ${escapeHtml(
                           formatTokenAmount(
                              payout.profitAmount
                           )
                        )}
                     </div>
                  </div>

                  <span class="status">
                     ${escapeHtml(
                        getPayoutStatusText(
                           payout.status
                        )
                     )}
                  </span>
               </div>

               <div class="grid grid-3 mt">
                  <div>
                     <div class="label">
                        ПОЛУЧАТЕЛЕЙ
                     </div>

                     <div class="mono mt">
                        ${escapeHtml(
                           payout.recipientsCount ?? 0
                        )}
                     </div>
                  </div>

                  <div>
                     <div class="label">
                        СОЗДАНА
                     </div>

                     <div class="mono small mt">
                        ${escapeHtml(
                           formatDate(
                              payout.createdAt
                           )
                        )}
                     </div>
                  </div>

                  <div>
                     <div class="label">
                        ТРАНЗАКЦИЯ
                     </div>

                     <div
                        class="mono small mt"
                        title="${escapeHtml(hash || "")}"
                     >
                        ${escapeHtml(
                           hash
                              ? shortenAddress(hash)
                              : "Ожидается"
                        )}
                     </div>
                  </div>
               </div>

               <a
                  class="btn mt"
                  href="history.html?campaignId=${encodeURIComponent(
                     campaignId
                  )}"
               >
                  Открыть историю выплат
               </a>
            </article>
         `;
      }).join("");
}

async function loadPayouts() {
   elements.payoutsLoading.hidden = false;
   elements.payoutsEmpty.hidden = true;

   try {
      const response =
         await api.getCampaignPayouts(
            campaignId,
            1,
            20
         );

      renderPayouts(
         response?.items || []
      );
   } catch (error) {
      elements.payoutsLoading.hidden = true;

      console.error(
         "Ошибка загрузки выплат:",
         error
      );

      showError(
         getErrorMessage(error)
      );
   }
}

async function loadCampaign() {
   if (!campaignId) {
      throw new Error(
         "В адресе страницы отсутствует ID кампании."
      );
   }

   const campaign =
      await api.getCampaign(campaignId);

   state.campaign = campaign;

   renderCampaignSummary();
}

async function validatePayoutAccess() {
   const accessToken =
      localStorage.getItem("accessToken");

   if (!accessToken) {
      throw new Error(
         "Для выплаты дивидендов необходимо войти."
      );
   }

   const currentUser =
      await api.getCurrentUser();

   const currentWallet =
      normalizeAddress(
         currentUser?.walletAddress
      );

   const creatorWallet =
      normalizeAddress(
         state.campaign
            ?.creator
            ?.walletAddress
      );

   if (
      !currentWallet ||
      currentWallet !== creatorWallet
   ) {
      throw new Error(
         "Выплату дивидендов может выполнить только создатель кампании."
      );
   }

   if (
      state.campaign.status !==
      "CLOSED_GOAL_REACHED"
   ) {
      throw new Error(
         "Выплата дивидендов доступна только после достижения цели кампании."
      );
   }

   if (
      Number(
         state.campaign
            ?.financials
            ?.contributorsCount || 0
      ) === 0
   ) {
      throw new Error(
         "У кампании нет подтверждённых вкладчиков."
      );
   }

   if (
      Number(
         state.campaign
            ?.financials
            ?.payoutsCount || 0
      ) > 0
   ) {
      throw new Error(
         "Для этой кампании выплата уже была выполнена."
      );
   }
}

async function preparePayout() {
   if (state.isSubmitting) {
      return;
   }

   hideMessages();

   try {
      const profitAmountRaw =
         convertToRaw(
            elements.profitAmount.value
         );

      state.isSubmitting = true;

      setPreviewButtonState(
         true,
         "Подготовка выплаты..."
      );

      setConfirmButtonState(true);

      const response =
         await api.preparePayout(
            campaignId,
            {
               profitAmountRaw,
               chainId: REQUIRED_CHAIN_ID
            }
         );

      console.log(
         "Подготовленная выплата:",
         response
      );

      if (
         !response?.payout?.id ||
         !response?.transactionRequest ||
         !response?.distributionPreview
      ) {
         throw new Error(
            "Backend вернул неполные данные выплаты."
         );
      }

      state.preparedPayout =
         response.payout;

      state.transactionRequest =
         response.transactionRequest;

      state.distributionPreview =
         response.distributionPreview;

      renderDistributionPreview();

      elements.previewStatus.textContent =
         "ПОДГОТОВЛЕНО";

      elements.profitAmount.disabled = true;

      setPreviewButtonState(
         true,
         "Распределение подготовлено"
      );

      setConfirmButtonState(false);

      showSuccess(
         "Распределение рассчитано. Проверьте данные и подтвердите выплату в MetaMask."
      );
   } catch (error) {
      console.error(
         "Ошибка подготовки выплаты:",
         error
      );

      state.preparedPayout = null;
      state.transactionRequest = null;
      state.distributionPreview = null;

      renderDistributionPreview();

      elements.profitAmount.disabled = false;

      showError(
         getErrorMessage(error)
      );
   } finally {
      state.isSubmitting = false;

      if (!state.preparedPayout) {
         setPreviewButtonState(false);
         setConfirmButtonState(true);
      }
   }
}

async function confirmPayout() {
   if (state.isSubmitting) {
      return;
   }

   hideMessages();

   try {
      if (
         !state.preparedPayout?.id ||
         !state.transactionRequest
      ) {
         throw new Error(
            "Сначала рассчитайте распределение дивидендов."
         );
      }

      state.isSubmitting = true;

      setConfirmButtonState(
         true,
         "Подтвердите транзакцию в MetaMask..."
      );

      const transactionHash =
         await sendTransaction(
            state.transactionRequest
         );

      console.log(
         "Хеш выплаты:",
         transactionHash
      );

      setConfirmButtonState(
         true,
         "Передача транзакции на проверку..."
      );

      const confirmation =
         await api.confirmPayout(
            campaignId,
            {
               payoutId:
                  state.preparedPayout.id,

               transactionHash
            }
         );

      console.log(
         "Подтверждение выплаты:",
         confirmation
      );

      elements.previewStatus.textContent =
         "ОТПРАВЛЕНО";

      showSuccess(
         "Транзакция выплаты отправлена и принята backend на проверку."
      );

      state.preparedPayout = null;
      state.transactionRequest = null;

      elements.profitAmount.value = "";
      elements.profitAmount.disabled = true;

      setPreviewButtonState(
         true,
         "Выплата отправлена"
      );

      setConfirmButtonState(
         true,
         "Транзакция отправлена"
      );

      await Promise.all([
         loadCampaign(),
         loadPayouts()
      ]);
   } catch (error) {
      console.error(
         "Ошибка подтверждения выплаты:",
         error
      );

      showError(
         getErrorMessage(error)
      );

      if (
         state.preparedPayout &&
         state.transactionRequest
      ) {
         setConfirmButtonState(false);
      }
   } finally {
      state.isSubmitting = false;
   }
}

async function init() {
   hideMessages();

   elements.previewSection.hidden = true;
   elements.payoutsEmpty.hidden = true;

   setPreviewButtonState(true);
   setConfirmButtonState(true);

   if (!campaignId) {
      showError(
         "Кампания не указана."
      );

      return;
   }

   try {
      await loadCampaign();
      await validatePayoutAccess();
      await loadPayouts();

      setPreviewButtonState(false);
   } catch (error) {
      console.error(
         "Ошибка загрузки страницы выплат:",
         error
      );

      showError(
         getErrorMessage(error)
      );

      setPreviewButtonState(true);
      setConfirmButtonState(true);
   }
}

elements.previewButton?.addEventListener(
   "click",
   preparePayout
);

elements.confirmPayoutButton?.addEventListener(
   "click",
   confirmPayout
);

init();