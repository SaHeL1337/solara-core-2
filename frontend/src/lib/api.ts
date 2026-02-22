import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// We create a helper function that the component can use
export const setupInterceptors = (getToken: () => Promise<string | null>) => {
  api.interceptors.request.use(async (config) => {
    const token = await getToken(); // Gets fresh JWT from Clerk's local cache
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Extract backend error message if available
      const errorMessage = error.response?.data?.error;

      // We only want to show toasts for explicit backend business logic errors
      // or for non-GET requests that failed generically (like network errors on forms).
      // This prevents spamming the user if a background GET poll fails momentarily.
      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error.config?.method?.toLowerCase() !== "get") {
        toast.error(error.message || "An error occurred");
      }

      return Promise.reject(error);
    },
  );
};

export default api;
