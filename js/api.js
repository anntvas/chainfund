const API_BASE_URL = "http://localhost:8080/api/v1";

function getAccessToken() {
   return localStorage.getItem("accessToken");
}

function saveTokens(tokens) {
   localStorage.setItem("accessToken", tokens.accessToken);
   localStorage.setItem("refreshToken", tokens.refreshToken);
}

function clearTokens() {
   localStorage.removeItem("accessToken");
   localStorage.removeItem("refreshToken");
}

async function apiRequest(endpoint, options = {}) {
   const token = getAccessToken();

   const headers = {
      Accept: "application/json",
      ...options.headers
   };

   if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
   }

   if (token) {
      headers.Authorization = `Bearer ${token}`;
   }

   const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
   });

   if (response.status === 204) {
      return null;
   }

   const contentType =
      response.headers.get("content-type") || "";

   let data = null;

   if (contentType.includes("application/json")) {
      data = await response.json();
   } else {
      const text = await response.text();
      data = text ? { message: text } : null;
   }

   console.log("API response:", {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      data
   });

   if (!response.ok) {
      const error = new Error(
         data?.detail ||
         data?.message ||
         data?.title ||
         `Ошибка обращения к серверу: ${response.status}`
      );

      error.status = response.status;
      error.code = data?.code;
      error.details = data;

      throw error;
   }

   return data;
}

const api = {
   getHome(popularLimit = 6, activeLimit = 12) {
      const params = new URLSearchParams({
         popularLimit,
         activeLimit
      });

      return apiRequest(`/platform/home?${params}`);
   },

   getCampaigns({
      query = "",
      status = [],
      sort = "CREATED_AT_DESC",
      page = 1,
      pageSize = 20
   } = {}) {
      const params = new URLSearchParams();

      if (query.trim()) {
         params.set("q", query.trim());
      }

      status.forEach(value => {
         params.append("status", value);
      });

      params.set("sort", sort);
      params.set("page", page);
      params.set("pageSize", pageSize);

      return apiRequest(`/campaigns?${params}`);
   },

   getCampaign(campaignId) {
      return apiRequest(
         `/campaigns/${encodeURIComponent(campaignId)}`
      );
   },

   createCampaign(body) {
   return apiRequest("/campaigns", {
      method: "POST",
      headers: {
         "Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(body)
   });
},

confirmCampaignDeployment(
   campaignId,
   transactionHash
) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      "/deployment-confirmations",
      {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify({
            transactionHash
         })
      }
   );
},

   getCampaignContributions(
   campaignId,
   page = 1,
   pageSize = 20
) {
   const params = new URLSearchParams({
      page,
      pageSize
   });

   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      `/contributions?${params}`
   );
},

prepareContribution(campaignId, body) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      `/contributions/prepare`,
      {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify(body)
      }
   );
},

confirmContribution(campaignId, body) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      `/contributions/confirm`,
      {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify(body)
      }
   );
},

   getCampaignPayouts(
   campaignId,
   page = 1,
   pageSize = 20
) {
   const params = new URLSearchParams({
      page,
      pageSize
   });

   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}/payouts?${params}`
   );
},

getPayout(campaignId, payoutId) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      `/payouts/${encodeURIComponent(payoutId)}`
   );
},

getPayoutDistributions(
   campaignId,
   payoutId,
   page = 1,
   pageSize = 20
) {
   const params = new URLSearchParams({
      page,
      pageSize
   });

   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      `/payouts/${encodeURIComponent(payoutId)}` +
      `/distributions?${params}`
   );
},

   register(userData) {
      return apiRequest("/auth/register", {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify(userData)
      });
   },

   login(walletAddress) {
      return apiRequest("/auth/login", {
         method: "POST",
         body: JSON.stringify({ walletAddress })
      });
   },

   getCurrentUser() {
      return apiRequest("/me");
   },

   getDashboard(itemsLimit = 5) {
      return apiRequest(`/me/dashboard?itemsLimit=${itemsLimit}`);
   },

   preparePayout(campaignId, body) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      "/payouts/prepare",
      {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify(body)
      }
   );
},

confirmPayout(campaignId, body) {
   return apiRequest(
      `/campaigns/${encodeURIComponent(campaignId)}` +
      "/payouts/confirm",
      {
         method: "POST",
         headers: {
            "Idempotency-Key": crypto.randomUUID()
         },
         body: JSON.stringify(body)
      }
   );
},

   logout(refreshToken = localStorage.getItem("refreshToken")) {
      return apiRequest("/auth/logout", {
         method: "POST",
         body: JSON.stringify({
            refreshToken,
            allSessions: false
         })
      });
   }

};

window.api = api;
window.saveTokens = saveTokens;
window.clearTokens = clearTokens;