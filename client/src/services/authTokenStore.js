let inMemoryToken = "";
const DEV_BEARER_TOKEN = import.meta.env.VITE_DEV_BEARER_TOKEN || "";

export function setAuthToken(token) {
  inMemoryToken = token || "";

  if (token) {
    sessionStorage.setItem("authToken", token);
  } else {
    sessionStorage.removeItem("authToken");
  }
}

export function getAuthToken() {
  return inMemoryToken || sessionStorage.getItem("authToken") || DEV_BEARER_TOKEN || "";
}
