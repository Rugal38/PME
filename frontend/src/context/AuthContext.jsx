import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../services/api';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user'); // Retrieve stored user object
        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error("Failed to parse stored user from localStorage", error);
                logout(); // Clear invalid data
            }
        } else if (token) { // If only token exists, try to decode role from it
            try {
                const decoded = jwtDecode(token);
                const role = decoded.role || 'assistant'; // Default to assistant if role not in token
                const username = decoded.sub;
                const userFromToken = { username, role };
                setUser(userFromToken);
                localStorage.setItem('user', JSON.stringify(userFromToken));
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error("Failed to decode token on rehydration", error);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await api.post('/api/login', { username, password });
        const { access_token, role } = response.data; // Role from API response
        localStorage.setItem('token', access_token);
        
        const decoded = jwtDecode(access_token);
        // Ensure the role from decoded token matches the one from API response for consistency
        const userObject = { username: decoded.sub, role: role }; 
        setUser(userObject);
        localStorage.setItem('user', JSON.stringify(userObject)); // Store full user object
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // Clear stored user object
        delete api.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };
