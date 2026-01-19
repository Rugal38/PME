import React, { useState, useEffect, useContext } from 'react';
import { getBudgets, addBudget, updateBudget, deleteBudget } from '../services/budgetService';
import { getCentres } from '../services/centreService';
import { getDepenses } from '../services/depenseService';
import { AuthContext } from '../context/AuthContext';
import './Budgets.css';

const Budgets = () => {
    const [budgets, setBudgets] = useState([]);
    const [centres, setCentres] = useState([]);
    const [depenses, setDepenses] = useState([]);
    const [centreId, setCentreId] = useState('');
    const [trimester, setTrimester] = useState('');
    const [annee, setAnnee] = useState('');
    const [montant, setMontant] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchBudgets();
        fetchCentres();
        fetchDepenses();
    }, []);

    const fetchBudgets = async () => {
        try {
            const response = await getBudgets();
            setBudgets(response.data);
        } catch (err) {
            setError('Échec de la récupération des budgets.');
        }
    };

    const fetchCentres = async () => {
        try {
            const response = await getCentres();
            setCentres(response.data);
        } catch (err) {
            setError('Échec de la récupération des centres.');
        }
    };

    const fetchDepenses = async () => {
        try {
            const response = await getDepenses();
            setDepenses(response.data);
        } catch (err) {
            setError('Échec de la récupération des dépenses.');
        }
    };

    const clearForm = () => {
        setCentreId('');
        setTrimester('');
        setAnnee('');
        setMontant('');
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!isAdmin) {
            setError('Vous n\'êtes pas autorisé à modifier les budgets.');
            return;
        }

        const budgetData = { centre_id: centreId, trimester, annee, montant };
        try {
            if (editingId) {
                await updateBudget(editingId, budgetData);
                setSuccess('Budget mis à jour avec succès.');
            } else {
                await addBudget(budgetData);
                setSuccess('Budget ajouté avec succès.');
            }
            clearForm();
            fetchBudgets();
        } catch (err) {
            setError('Échec de l\'enregistrement du budget.');
        }
    };

    const handleEdit = (budget) => {
        if (!isAdmin) {
            setError('Vous n\'êtes pas autorisé à modifier les budgets.');
            return;
        }
        setCentreId(budget.centre_id.$oid);
        setTrimester(budget.trimester);
        setAnnee(budget.annee);
        setMontant(budget.montant);
        setEditingId(budget._id.$oid);
    };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            setError('Vous n\'êtes pas autorisé à supprimer les budgets.');
            return;
        }
        try {
            await deleteBudget(id);
            setSuccess('Budget supprimé avec succès.');
            fetchBudgets();
        } catch (err) {
            setError('Échec de la suppression du budget.');
        }
    };
    const getCentreName = (id) => {
        const centre = centres.find(c => c._id.$oid === id);
        return centre ? centre.nom : '';
    };

    const calculateReel = (budget) => {
        const { centre_id, trimester, annee } = budget;
        const total = depenses
            .filter(d => {
                const depenseDate = new Date(d.date);
                const depenseTrimester = Math.floor((depenseDate.getMonth()) / 3) + 1; // Corrected trimester calculation
                return (
                    d.centre_id.$oid === centre_id.$oid &&
                    depenseTrimester === trimester &&
                    depenseDate.getFullYear() === annee
                );
            })
            .reduce((acc, d) => acc + parseFloat(d.montant), 0);
        return total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

    return (
        <div className="budgets-container">
            <h1>Gérer les Budgets</h1>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            {isAdmin && (
                <form onSubmit={handleSubmit} className="budget-form">
                    <h2>{editingId ? 'Modifier le Budget' : 'Ajouter un Budget'}</h2>
                    <select value={centreId} onChange={(e) => setCentreId(e.target.value)} required disabled={!isAdmin}>
                        <option value="">Sélectionner un Centre</option>
                        {centres.map(c => (
                            <option key={c._id.$oid} value={c._id.$oid}>{c.nom}</option>
                        ))}
                    </select>
                    <select value={trimester} onChange={(e) => setTrimester(e.target.value)} required disabled={!isAdmin}>
                        <option value="">Sélectionner un Trimestre</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                    </select>
                    <select value={annee} onChange={(e) => setAnnee(e.target.value)} required disabled={!isAdmin}>
                        <option value="">Sélectionner une Année</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Montant"
                        value={montant}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (!isNaN(value) || value === '') {
                                setMontant(value);
                            }
                        }}
                        required
                        disabled={!isAdmin}
                    />
                    <div className="form-buttons">
                        <button type="submit" disabled={!isAdmin}>{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
                        {editingId && <button type="button" onClick={clearForm} disabled={!isAdmin}>Annuler</button>}
                    </div>
                </form>
            )}

            <div className="budget-list">
                <h2>Budgets Existants</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Centre</th>
                            <th>Trimestre</th>
                            <th>Année</th>
                            <th>Montant</th>
                            <th>Réel</th>
                            <th>Écart</th>
                            <th>Taux d'écart</th>
                            <th>Interprétation</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.map((b) => {
                            const reelValue = parseFloat(calculateReel(b).replace(' MAD', '').replace(/\s/g, '').replace(',', '.')); // Remove spaces and replace comma with dot
                            const montantValue = parseFloat(b.montant);
                            const ecart = reelValue - montantValue;
                            const tauxEcart = (montantValue !== 0) ? (ecart / montantValue) * 100 : 0; // Avoid division by zero

                            let interpretation = '';
                            let interpretationClass = '';
                            if (tauxEcart > 0) {
                                interpretation = 'surcoût';
                                interpretationClass = 'text-red-600';
                            } else if (tauxEcart < 0) {
                                interpretation = 'économie';
                                interpretationClass = 'text-green-600';
                            } else {
                                interpretation = 'neutre';
                                interpretationClass = 'text-gray-600';
                            }

                            return (
                                <tr key={b._id.$oid}>
                                    <td>{getCentreName(b.centre_id.$oid)}</td>
                                    <td>{b.trimester}</td>
                                    <td>{b.annee}</td>
                                    <td>{montantValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</td>
                                    <td>{reelValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</td>
                                    <td className={ecart >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {ecart.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                                    </td>
                                    <td className={ecart >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {tauxEcart.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                                    </td>
                                    <td className={interpretationClass}>
                                        {interpretation}
                                    </td>
                                    {isAdmin && (
                                        <td className="actions">
                                            <button onClick={() => handleEdit(b)}>Modifier</button>
                                            <button onClick={() => handleDelete(b._id.$oid)} className="delete-btn">Supprimer</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Budgets;
