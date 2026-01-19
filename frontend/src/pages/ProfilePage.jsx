import React, { useState } from 'react';
import { api } from '../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setSuccess('');
        try {
            await api.put('/api/profile', { password });
            setSuccess('Password updated successfully!');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError('Failed to update password.');
        }
    };

    return (
        <div className="profile-container">
            <h1>Update Profile</h1>
            <form onSubmit={handleSubmit} className="profile-form">
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <div className="input-group">
                    <label htmlFor="password">New Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Update Password</button>
            </form>
        </div>
    );
};

export default ProfilePage;
