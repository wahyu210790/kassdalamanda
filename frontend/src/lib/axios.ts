import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Disesuaikan dengan URL Laravel
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
