import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api.storytech.id/api', // Hardcoded untuk Production
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Penting untuk cookie Sanctum
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
