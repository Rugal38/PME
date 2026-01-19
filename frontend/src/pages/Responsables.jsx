import React, { useState, useEffect } from 'react';
import { getResponsables, addResponsable, updateResponsable, deleteResponsable } from '../services/responsableService';
import './Responsables.css';

const Responsables = () => {
    const [responsables, setResponsables] = useState([]);
    const [nom, setNom] = useState('');
    const [prenom, setPrenom] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchResponsables();
    }, []);

    const fetchResponsables = async () => {
        try {
            const response = await getResponsables();
            setResponsables(response.data);
        } catch (err) {
            setError('Failed to fetch responsables.');
        }
    };

    const clearForm = () => {
        setNom('');
        setPrenom('');
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            if (editingId) {
                await updateResponsable(editingId, { nom, prenom });
                setSuccess('Responsable updated successfully.');
            } else {
                await addResponsable({ nom, prenom });
                setSuccess('Responsable added successfully.');
            }
            clearForm();
            fetchResponsables();
        } catch (err) {
            setError('Failed to save responsable.');
        }
    };

    const handleEdit = (responsable) => {
        setNom(responsable.nom);
        setPrenom(responsable.prenom);
        setEditingId(responsable._id.$oid);
    };

    const handleDelete = async (id) => {
        try {
            await deleteResponsable(id);
            setSuccess('Responsable deleted successfully.');
            fetchResponsables();
        } catch (err) {
            setError('Failed to delete responsable.');
        }
    };

    return (
        <div className="responsables-container">
            <h1>Manage Responsables</h1>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <form onSubmit={handleSubmit} className="responsable-form">
                <h2>{editingId ? 'Edit Responsable' : 'Add Responsable'}</h2>
                <input
                    type="text"
                    placeholder="First Name"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Last Name"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                />
                <div className="form-buttons">
                    <button type="submit">{editingId ? 'Update' : 'Add'}</button>
                    {editingId && <button type="button" onClick={clearForm}>Cancel</button>}
                </div>
            </form>

            <div className="responsable-list">
                <h2>Existing Responsables</h2>
                <table>
                    <thead>
                        <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {responsables.map((r) => (
                            <tr key={r._id.$oid}>
                                <td>{r.prenom}</td>
                                <td>{r.nom}</td>
                                <td className="actions">
                                    <button onClick={() => handleEdit(r)}>Edit</button>
                                    <button onClick={() => handleDelete(r._id.$oid)} className="delete-btn">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Responsables;
