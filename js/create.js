const REQUIRED_CHAIN_ID = 31337;

const elements = {
   form: document.getElementById("create-form"),
   title: document.getElementById("campaign-title"),
   description: document.getElementById("campaign-description"),
   target: document.getElementById("campaign-target"),
   deadline: document.getElementById("campaign-deadline"),
   metadataUri: document.getElementById("campaign-metadata-uri"),
   submitButton: document.getElementById("create-submit-button"),
   error: document.getElementById("create-error"),
   success: document.getElementById("create-success")
};

function showError(message) {
   elements.error.hidden = false;
   elements.success.hidden = true;

   elements.error.textContent = message;
   elements.success.textContent = "";
}

function showSuccess(message) {
   elements.success.hidden = false;
   elements.error.hidden = true;

   elements.success.textContent = message;
   elements.error.textContent = "";
}

function hideMessages() {
   elements.error.hidden = true;
   elements.success.hidden = true;

   elements.error.textContent = "";
   elements.success.textContent = "";
}

function setSubmitState(disabled, text) {
   elements.submitButton.disabled = disabled;
   elements.submitButton.textContent = text;
}

function convertToRaw(value, decimals = 18) {
   const text = String(value)
      .trim()
      .replace(",", ".");

   if (!/^\d+(\.\d+)?$/.test(text)) {
      throw new Error(
         "Введите корректную целевую сумму."
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
         "Целевая сумма должна быть больше нуля."
      );
   }

   return raw;
}

function getDeadlineIso() {
   const value = elements.deadline.value;

   if (!value) {
      throw new Error(
         "Укажите дату окончания кампании."
      );
   }

   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      throw new Error(
         "Дата окончания указана неверно."
      );
   }

   if (date.getTime() <= Date.now()) {
      throw new Error(
         "Дата окончания должна быть в будущем."
      );
   }

   return date.toISOString();
}

function validateMetadataUri(value) {
   const uri = value.trim();

   if (!uri) {
      return null;
   }

   const isHttp =
      uri.startsWith("http://") ||
      uri.startsWith("https://");

   const isIpfs =
      uri.startsWith("ipfs://");

   if (!isHttp && !isIpfs) {
      throw new Error(
         "Metadata URI должен начинаться с http://, https:// или ipfs://."
      );
   }

   return uri;
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

function normalizeAddress(address) {
   return String(address || "").toLowerCase();
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

   if (error?.code === -32603) {
      return (
         error?.data?.message ||
         "MetaMask не смог выполнить транзакцию."
      );
   }

   if (
      error?.message?.includes(
         "insufficient funds"
      )
   ) {
      return (
         "На кошельке недостаточно ETH " +
         "для оплаты комиссии."
      );
   }

   if (
      error?.message?.includes(
         "Internal JSON-RPC error"
      )
   ) {
      return (
         "Ошибка локальной блокчейн-сети. " +
         "Проверьте, что сеть запущена и контракт развёрнут."
      );
   }

   return (
      error?.message ||
      "Не удалось создать кампанию."
   );
}

async function ensureMetaMaskInstalled() {
   if (!window.ethereum) {
      throw new Error(
         "MetaMask не установлен. Установите расширение MetaMask и повторите попытку."
      );
   }
}

async function connectWallet() {
   await ensureMetaMaskInstalled();

   const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
   });

   if (!accounts || accounts.length === 0) {
      throw new Error(
         "MetaMask не вернул подключённый аккаунт."
      );
   }

   return accounts[0];
}

async function getCurrentChainId() {
   const chainIdHex =
      await window.ethereum.request({
         method: "eth_chainId"
      });

   return Number.parseInt(chainIdHex, 16);
}

async function switchToRequiredNetwork() {
   const chainIdHex =
      `0x${REQUIRED_CHAIN_ID.toString(16)}`;

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
            `Переключите MetaMask на сеть с chainId ${REQUIRED_CHAIN_ID}.`
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

async function ensureCorrectNetwork(expectedChainId) {
   const currentChainId =
      await getCurrentChainId();

   if (currentChainId === expectedChainId) {
      return;
   }

   await switchToRequiredNetwork();

   const chainIdAfterSwitch =
      await getCurrentChainId();

   if (chainIdAfterSwitch !== expectedChainId) {
      throw new Error(
         `Нужна сеть с chainId ${expectedChainId}.`
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
         "Подготовленная транзакция просрочена. Создайте кампанию заново."
      );
   }
}

async function sendTransaction(
   transactionRequest
) {
   validateTransactionRequest(
      transactionRequest
   );

   const connectedAddress =
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
      normalizeAddress(connectedAddress) !==
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
      from: connectedAddress,
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
      "Транзакция для MetaMask:",
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

async function createCampaign(event) {
   event.preventDefault();
   hideMessages();

   const accessToken =
      localStorage.getItem("accessToken");

   if (!accessToken) {
      showError(
         "Для создания кампании необходимо войти."
      );

      setTimeout(() => {
         location.href = "auth.html";
      }, 900);

      return;
   }

   let createdCampaignId = null;

   setSubmitState(
      true,
      "Создание кампании..."
   );

   try {
      const title =
         elements.title.value.trim();

      const description =
         elements.description.value.trim();

      if (title.length < 3) {
         throw new Error(
            "Название должно содержать минимум 3 символа."
         );
      }

      if (description.length < 10) {
         throw new Error(
            "Описание должно содержать минимум 10 символов."
         );
      }

      const requestBody = {
         title,
         description,
         targetAmountRaw: convertToRaw(
            elements.target.value,
            18
         ),
         deadline: getDeadlineIso(),
         chainId: REQUIRED_CHAIN_ID,
         metadataUri: validateMetadataUri(
            elements.metadataUri.value
         )
      };

      console.log(
         "Запрос на создание кампании:",
         requestBody
      );

      const result =
         await api.createCampaign(
            requestBody
         );

      console.log(
         "Ответ backend:",
         result
      );

      const campaign = result?.campaign;
      const transactionRequest =
         result?.transactionRequest;

      if (!campaign?.id) {
         throw new Error(
            "Backend не вернул идентификатор созданной кампании."
         );
      }

      createdCampaignId = campaign.id;

      setSubmitState(
         true,
         "Подтвердите транзакцию в MetaMask..."
      );

      showSuccess(
         "Кампания сохранена. Подтвердите транзакцию в MetaMask."
      );

      const transactionHash =
         await sendTransaction(
            transactionRequest
         );

      console.log(
         "Хеш транзакции:",
         transactionHash
      );

      setSubmitState(
         true,
         "Подтверждение транзакции..."
      );

      showSuccess(
         "Транзакция отправлена. Подтверждаем развёртывание кампании..."
      );

      const confirmation =
         await api.confirmCampaignDeployment(
            campaign.id,
            transactionHash
         );

      console.log(
         "Ответ подтверждения deployment:",
         confirmation
      );

      showSuccess(
         "Кампания успешно создана и отправлена на развёртывание в блокчейне."
      );

      setTimeout(() => {
         location.href =
            `campaign.html?id=${encodeURIComponent(
               campaign.id
            )}`;
      }, 900);
   } catch (error) {
      console.error(
         "Ошибка создания кампании:",
         error
      );

      let message =
         getErrorMessage(error);

      if (
         createdCampaignId &&
         error?.code === 4001
      ) {
         message +=
            " Кампания сохранена, но пока не развёрнута в блокчейне.";
      }

      showError(message);
   } finally {
      setSubmitState(
         false,
         "Создать кампанию"
      );
   }
}

if (elements.form) {
   elements.form.addEventListener(
      "submit",
      createCampaign
   );
}

if (!localStorage.getItem("accessToken")) {
   showError(
      "Для создания кампании необходимо войти."
   );

   elements.submitButton.disabled = true;
}