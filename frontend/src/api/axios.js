import axios from 'axios';

// Axios instance yaradırıq
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Cookie-ləri avtomatik göndərir
  headers: {
    'Content-Type': 'application/json',
  },
});


export default api;

