import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './AdminPage.css'; // Assuming you have styles for the modal here as well

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null for create, user object for edit
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/users');
            setUsers(response.data);
        } catch (err) {
            setError('Failed to fetch users.');
        }
    };

    const openModal = (user = null) => {
        setError('');
        setSuccess('');
        setEditingUser(user);
        if (user) {
            setUsername(user.username);
            setPassword(''); // Don't pre-fill password
        } else {
            setUsername('');
            setPassword('');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setUsername('');
        setPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            if (editingUser) {
                // Update user
                const updateData = {};
                if (username) updateData.username = username;
                if (password) updateData.password = password; // Only include password if changed
                
                await api.put(`/api/users/${editingUser._id.$oid}`, updateData);
                setSuccess('Assistant updated successfully.');
            } else {
                // Create user
                if (!username || !password) {
                    setError("Username and password are required for new assistants.");
                    return;
                }
                await api.post('/api/users', { username, password, role: 'assistant' });
                setSuccess('Assistant created successfully.');
            }
            fetchUsers();
            closeModal();
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'An error occurred.';
            setError(`Failed to save assistant: ${errorMessage}`);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this assistant?')) {
            try {
                await api.delete(`/api/users/${userId}`);
                setSuccess('Assistant deleted successfully.');
                fetchUsers();
            } catch (err) {
                setError('Failed to delete assistant.');
            }
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>Admin - Manage Assistants</h1>
                <button onClick={() => openModal()} className="btn-create">Create New Assistant</button>
            </div>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <div className="user-list">
                <h2>Existing Assistants</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id.$oid}>
                                <td>{user.username}</td>
                                <td className="actions">
                                    <button onClick={() => openModal(user)} className="edit-btn">Edit</button>
                                    <button onClick={() => handleDeleteUser(user._id.$oid)} className="delete-btn">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit Assistant' : 'Create Assistant'}</h2>
                            <button onClick={closeModal} className="modal-close">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={editingUser ? "Leave blank to keep current password" : ""}
                                        required={!editingUser}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">{editingUser ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
