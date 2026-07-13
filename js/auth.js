if (getAccessToken()) {
   location.href = "index.html";
}

let walletAddress = null;

const connectButton = document.getElementById(
   "connect-wallet-button"
);

const walletNotice = document.getElementById(
   "wallet-notice"
);

const loginForm = document.getElementById(
   "login-form"
);

const registerForm = document.getElementById(
   "register-form"
);

const loginButton = document.getElementById(
   "login-button"
);

const registerButton = document.getElementById(
   "register-button"
);

const loginTab = document.getElementById(
   "show-login-button"
);

const registerTab = document.getElementById(
   "show-register-button"
);

const errorBlock = document.getElementById(
   "auth-error"
);

const successBlock = document.getElementById(
   "auth-success"
);

function showError(message) {
   errorBlock.hidden = false;
   successBlock.hidden = true;

   errorBlock.textContent = message;
   successBlock.textContent = "";
}

function showSuccess(message) {
   successBlock.hidden = false;
   errorBlock.hidden = true;

   successBlock.textContent = message;
   errorBlock.textContent = "";
}

function clearMessages() {
   errorBlock.hidden = true;
   successBlock.hidden = true;

   errorBlock.textContent = "";
   successBlock.textContent = "";
}

function shortenWallet(address) {
   if (!address || address.length < 12) {
      return address || "";
   }

   return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showLogin() {
   loginForm.hidden = false;
   registerForm.hidden = true;

   loginTab.classList.add("btn-primary");
   registerTab.classList.remove("btn-primary");

   clearMessages();
}

function showRegister() {
   loginForm.hidden = true;
   registerForm.hidden = false;

   registerTab.classList.add("btn-primary");
   loginTab.classList.remove("btn-primary");

   clearMessages();
}

function setWalletConnected(address) {
   walletAddress = address;

   walletNotice.innerHTML = `
      Кошелёк:
      <span class="green">
         ${shortenWallet(address)}
      </span>
   `;

   connectButton.textContent =
      "MetaMask подключён";

   loginButton.disabled = false;
   registerButton.disabled = false;
}

function resetWallet() {
   walletAddress = null;

   walletNotice.textContent =
      "Кошелёк не подключён";

   connectButton.textContent =
      "Подключить MetaMask";

   loginButton.disabled = true;
   registerButton.disabled = true;
}

async function connectWallet() {
   clearMessages();

   if (!window.ethereum) {
      showError(
         "MetaMask не установлен. Установите расширение и повторите попытку."
      );
      return;
   }

   connectButton.disabled = true;
   connectButton.textContent =
      "Подключение...";

   try {
      const accounts =
         await window.ethereum.request({
            method: "eth_requestAccounts"
         });

      if (!accounts || accounts.length === 0) {
         throw new Error(
            "MetaMask не вернул адрес кошелька."
         );
      }

      setWalletConnected(accounts[0]);

      showSuccess(
         "Кошелёк успешно подключён."
      );
   } catch (error) {
      resetWallet();

      if (error.code === 4001) {
         showError(
            "Подключение MetaMask было отменено."
         );
      } else {
         showError(
            error.message ||
            "Не удалось подключить MetaMask."
         );
      }
   } finally {
      connectButton.disabled = false;

      if (walletAddress) {
         connectButton.textContent =
            "MetaMask подключён";
      }
   }
}

async function restoreWalletConnection() {
   if (!window.ethereum) {
      return;
   }

   try {
      const accounts =
         await window.ethereum.request({
            method: "eth_accounts"
         });

      if (accounts && accounts.length > 0) {
         setWalletConnected(accounts[0]);
      }
   } catch (error) {
      console.error(
         "Не удалось проверить подключение MetaMask:",
         error
      );
   }
}

async function login(event) {
   event.preventDefault();
   clearMessages();

   if (!walletAddress) {
      showError(
         "Сначала подключите MetaMask."
      );
      return;
   }

   loginButton.disabled = true;
   loginButton.textContent = "Вход...";

   try {
      const response =
         await api.login(walletAddress);

      saveTokens(response.tokens);

      showSuccess(
         "Вход выполнен успешно."
      );

      location.href = "index.html";
   } catch (error) {
      if (
         error.code === "WALLET_NOT_REGISTERED" ||
         error.status === 404
      ) {
         showRegister();

         showError(
            "Этот кошелёк ещё не зарегистрирован. Заполните форму регистрации."
         );
      } else {
         showError(
            error.message ||
            "Не удалось выполнить вход."
         );
      }
   } finally {
      loginButton.disabled = false;
      loginButton.textContent =
         "Войти через MetaMask";
   }
}

async function register(event) {
   event.preventDefault();
   clearMessages();

   if (!walletAddress) {
      showError(
         "Сначала подключите MetaMask."
      );
      return;
   }

   const username = document
      .getElementById("username")
      .value
      .trim();

   const firstName = document
      .getElementById("first-name")
      .value
      .trim();

   const lastName = document
      .getElementById("last-name")
      .value
      .trim();

   if (!username) {
      showError(
         "Введите имя пользователя."
      );
      return;
   }

   if (!firstName) {
      showError(
         "Введите имя."
      );
      return;
   }

   if (!lastName) {
      showError(
         "Введите фамилию."
      );
      return;
   }

   registerButton.disabled = true;
   registerButton.textContent =
      "Регистрация...";

   try {
      const response =
         await api.register({
            walletAddress,
            username,
            firstName,
            lastName
         });

      saveTokens(response.tokens);

      showSuccess(
         "Регистрация выполнена успешно."
      );

      location.href = "index.html";
   } catch (error) {
      if (
         error.code === "WALLET_ALREADY_REGISTERED"
      ) {
         showLogin();

         showError(
            "Этот кошелёк уже зарегистрирован. Выполните вход."
         );
      } else if (
         error.code === "USERNAME_TAKEN"
      ) {
         showError(
            "Такое имя пользователя уже занято."
         );
      } else {
         showError(
            error.message ||
            "Не удалось зарегистрироваться."
         );
      }
   } finally {
      registerButton.disabled = false;
      registerButton.textContent =
         "Зарегистрироваться";
   }
}

connectButton.addEventListener(
   "click",
   connectWallet
);

loginTab.addEventListener(
   "click",
   showLogin
);

registerTab.addEventListener(
   "click",
   showRegister
);

loginForm.addEventListener(
   "submit",
   login
);

registerForm.addEventListener(
   "submit",
   register
);

if (window.ethereum) {
   window.ethereum.on(
      "accountsChanged",
      accounts => {
         clearMessages();

         if (!accounts || accounts.length === 0) {
            resetWallet();

            showError(
               "Кошелёк MetaMask отключён."
            );

            return;
         }

         setWalletConnected(accounts[0]);

         showSuccess(
            "Активный кошелёк изменён."
         );
      }
   );
}

showLogin();
resetWallet();
restoreWalletConnection();