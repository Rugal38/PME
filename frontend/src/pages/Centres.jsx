import { useState, useEffect, useContext } from 'react';
import { getCentres, addCentre, updateCentre, deleteCentre } from '../services/centreService';
import { getResponsables } from '../services/responsableService';
import { FaPlus, FaPencilAlt, FaTrash, FaBuilding, FaUsers, FaUserTag } from 'react-icons/fa';
import './Centres.css';
import { AuthContext } from '../context/AuthContext';

export default function Centres() {
  const [centres, setCentres] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [nom, setNom] = useState('');
  const [responsable, setResponsable] = useState('');
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const centresRes = await getCentres();
      setCentres(centresRes.data);
      const responsablesRes = await getResponsables();
      setResponsables(responsablesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { nom, responsable };
    try {
      if (editing) {
        await updateCentre(currentId, data);
      } else {
        await addCentre(data);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving centre:', error);
    }
  };

  const handleEdit = (centre) => {
    setEditing(true);
    setCurrentId(centre._id.$oid);
    setNom(centre.nom);
    setResponsable(centre.responsable);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce centre de coût ?')) {
      try {
        await deleteCentre(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting centre:', error);
      }
    }
  };

  const openModal = () => {
    setEditing(false);
    setNom('');
    setResponsable(responsables.length > 0 ? `${responsables[0].prenom} ${responsables[0].nom}`: '');
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  if (loading) {
    return (
      <div className="centres-page">
        <div className="centres-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Chargement des centres...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="centres-page">
      <div className="centres-container">
        
        <header className="centres-header">
          <div className="header-wrapper">
            <div className="header-info">
              <h1 className="centres-title">Centres de <span>Coût</span></h1>
              <p className="centres-subtitle">
                Gérez vos centres de coût et assignez les responsables pour un suivi optimal
              </p>
            </div>
            {user.role === 'admin' && (
              <div className="header-action">
                <button onClick={openModal} className="btn btn-primary">
                  <FaPlus />
                  Nouveau Centre
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="stats-overview">
          <div className="stats-card">
            <div className="stats-content">
              <div>
                <div className="stats-label">Total Centres</div>
                <div className="stats-value">{centres.length}</div>
              </div>
              <div className="stats-icon">
                <FaBuilding />
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-content">
              <div>
                <div className="stats-label">Responsables</div>
                <div className="stats-value">
                  {[...new Set(centres.map(c => c.responsable))].length}
                </div>
              </div>
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
                <FaUsers />
              </div>
            </div>
          </div>
        </div>

        <section className="centres-section">
          <div className="section-header">
            <h2 className="section-title">Liste des Centres</h2>
            <span className="centres-count">{centres.length} centres</span>
          </div>
          
          <div className="centres-grid">
            {centres.map((centre) => (
              <div key={centre._id.$oid} className="centre-card">
                <div className="card-header">
                  <h3 className="card-title">{centre.nom}</h3>
                  <FaBuilding className="card-icon" />
                </div>
                
                <div className="card-content">
                  <div>
                    <span className="card-label">Responsable</span>
                    <p className="card-value">
                      {centre.responsable || <span className="text-gray-400 italic">Non assigné</span>}
                    </p>
                  </div>
                </div>
                
                {user.role === 'admin' && (
                  <div className="card-footer">
                    <button onClick={() => handleEdit(centre)} className="btn btn-secondary btn-icon">
                      <FaPencilAlt />
                    </button>
                    <button onClick={() => handleDelete(centre._id.$oid)} className="btn btn-danger btn-icon">
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2 className="modal-title">{editing ? 'Modifier le Centre' : 'Nouveau Centre'}</h2>
                <button onClick={closeModal} className="modal-close">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nom du Centre</label>
                    <input
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="form-input"
                      placeholder="e.g., Marketing, Développement, RH"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Responsable</label>
                    <select
                      required
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      className="form-input"
                    >
                      <option value="" disabled>Select a responsable</option>
                      {responsables.map(r => (
                        <option key={r._id.$oid} value={`${r.prenom} ${r.nom}`}>
                          {r.prenom} {r.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
                
                <div className="modal-footer">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}