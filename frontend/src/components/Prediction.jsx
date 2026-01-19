import React, { useState, useEffect } from 'react';
import { getCentres } from '../services/centreService';
import { getPrediction } from '../services/predictionService';
import './Prediction.css';

const Prediction = () => {
    const [centres, setCentres] = useState([]);
    const [centreId, setCentreId] = useState('');
    const [trimester, setTrimester] = useState('');
    const [annee, setAnnee] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [precision, setPrecision] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const centresRes = await getCentres();
            setCentres(centresRes.data);
        } catch (err) {
            setError('Échec de la récupération des données initiales.');
        }
    };

    const handleGetPrediction = async () => {
        if (!centreId || !trimester || !annee) {
            setError('Veuillez sélectionner un centre, un trimestre et une année.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await getPrediction(centreId, trimester, annee);
            setPrediction(response.data.prediction);
            setPrecision(response.data.r2_score);
        } catch (err) {
            setError('Échec de l\'obtention de la prédiction.');
            setPrediction(null);
            setPrecision(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="prediction-container">
            <h2>Prédiction des Dépenses</h2>
            {error && <p className="error">{error}</p>}
            <div className="prediction-form">
                <select value={centreId} onChange={(e) => setCentreId(e.target.value)} required>
                    <option value="">Sélectionner un Centre</option>
                    {centres.map(c => (
                        <option key={c._id.$oid} value={c._id.$oid}>{c.nom}</option>
                    ))}
                </select>
                <select value={trimester} onChange={(e) => setTrimester(e.target.value)} required>
                    <option value="">Sélectionner un Trimestre</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                </select>
                <select value={annee} onChange={(e) => setAnnee(e.target.value)} required>
                    <option value="">Sélectionner une Année</option>
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button onClick={handleGetPrediction} disabled={loading}>
                    {loading ? 'Chargement...' : 'Obtenir la Prédiction'}
                </button>
            </div>
            {prediction !== null && (
                <div className="prediction-result">
                    <h3>Dépenses Prévues :</h3>
                    <p>{prediction.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</p>
                    {precision !== null && (
                        <p>Précision (R2 score) : {(precision * 100).toFixed(2)} %</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Prediction;

