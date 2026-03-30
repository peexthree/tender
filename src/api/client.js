import axios from 'axios';

// Базовая настройка axios для возможных будущих запросов (например, в TWA)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов (задел под TWA SDK для передачи initData)
apiClient.interceptors.request.use(
  (config) => {
    // Пример интеграции с Telegram Web Apps
    if (window.Telegram?.WebApp?.initData) {
      config.headers.Authorization = `twa ${window.Telegram.WebApp.initData}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик ответов
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
