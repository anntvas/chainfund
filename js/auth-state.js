function shortenWallet(address) {
   if (!address || address.length < 12) {
      return address || "";
   }

   return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function createNavigation(user = null) {
   const isAuthenticated = Boolean(getAccessToken());

   return `
      <nav class="navbar">
         <div class="container nav-inner">
            <a class="brand" href="index.html">
               <span class="brand-mark">↗</span>
               CHAIN<span class="green">FUND</span>
            </a>

            <div class="nav-actions">
               ${
                  isAuthenticated
                     ? `
                        ${
                           user
                              ? `
                                 <span class="wallet-chip">
                                    <span class="dot"></span>
                                    ${shortenWallet(user.walletAddress)}
                                 </span>
                              `
                              : ""
                        }

                        <a
                           class="btn"
                           href="dashboard.html"
                        >
                           Личный кабинет
                        </a>

                        <button
                           id="logout-button"
                           class="btn btn-danger"
                           type="button"
                        >
                           Выйти
                        </button>
                     `
                     : `
                        <button
                           class="btn btn-primary"
                           type="button"
                           onclick="location.href='auth.html'"
                        >
                           MetaMask
                        </button>

                        <a
                           class="btn"
                           href="auth.html"
                        >
                           Войти
                        </a>
                     `
               }
            </div>
         </div>
      </nav>
   `;
}

async function logoutUser() {
   const refreshToken = localStorage.getItem("refreshToken");

   try {
      if (getAccessToken()) {
         await api.logout(refreshToken);
      }
   } catch (error) {
      console.error("Не удалось завершить сессию:", error);
   } finally {
      clearTokens();
      location.href = "index.html";
   }
}

async function mountNav() {
   const header = document.getElementById("site-header");

   if (!header) {
      return;
   }

   let currentUser = null;

   if (getAccessToken()) {
      try {
         currentUser = await api.getCurrentUser();
      } catch (error) {
         if (error.status === 401 || error.status === 403) {
            clearTokens();
         }
      }
   }

   header.innerHTML = createNavigation(currentUser);

   const logoutButton = document.getElementById(
      "logout-button"
   );

   if (logoutButton) {
      logoutButton.addEventListener(
         "click",
         logoutUser
      );
   }
}

document.addEventListener("DOMContentLoaded", mountNav);