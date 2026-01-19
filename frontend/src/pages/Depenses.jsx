import { useState, useEffect, useContext } from 'react';
import { getDepenses, addDepense, updateDepense, deleteDepense } from '../services/depenseService';
import { getCentres } from '../services/centreService';
import { 
  FaPlus, FaPencilAlt, FaTrash, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp,
  FaCalendarAlt, FaTag, FaBuilding, FaMoneyBillWave,
  FaChartLine
} from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import './Depenses.css';
import { AuthContext } from '../context/AuthContext';

export default function Depenses() {
  const [depenses, setDepenses] = useState([]);
  const [centres, setCentres] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentre, setSelectedCentre] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Form states
  const [date, setDate] = useState('');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [centreId, setCentreId] = useState('');
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
      const [depensesRes, centresRes] = await Promise.all([
        getDepenses(),
        getCentres()
      ]);
      setDepenses(depensesRes.data);
      setCentres(centresRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort depenses
  const filteredDepenses = depenses.filter(depense => {
    const searchString = (depense.description || '').toLowerCase();
    const centreName = (centres.find(c => c._id.$oid === depense.centre_id.$oid)?.nom || '').toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase()) || centreName.includes(searchTerm.toLowerCase());
    const matchesCentre = selectedCentre === 'all' || depense.centre_id.$oid === selectedCentre;
    const matchesDate = (!dateRange.start || new Date(depense.date) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(depense.date) <= new Date(dateRange.end));
    
    return matchesSearch && matchesCentre && matchesDate;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return parseFloat(a.montant) - parseFloat(b.montant);
    } else {
      return parseFloat(b.montant) - parseFloat(a.montant);
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredDepenses.length / itemsPerPage);
  const paginatedDepenses = filteredDepenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { date, montant, description, centre_id: centreId };
    
    try {
      if (editing) {
        await updateDepense(currentId, data);
      } else {
        await addDepense(data);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving depense:', error);
    }
  };

  const handleEdit = (depense) => {
    setEditing(true);
    setCurrentId(depense._id.$oid);
    setDate(depense.date);
    setMontant(depense.montant);
    setDescription(depense.description);
    setCentreId(depense.centre_id.$oid);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        await deleteDepense(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting depense:', error);
      }
    }
  };

  const openModal = () => {
    setEditing(false);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setMontant('');
    setDescription('');
    setCentreId(centres.length > 0 ? centres[0]._id.$oid : '');
    setCurrentId(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCentre('all');
    setDateRange({ start: '', end: '' });
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  if (loading || !user) { // Also check for user object
    return (
      <div className="container">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="spinner"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Depenses.jsx - Updated with new structure
return (
  <div className="depenses-page">
    <div className="page-container">
      
      {/* Header with Gradient Background */}
      <header className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="page-title">Gestion des <span>Dépenses</span></h1>
            <p className="page-subtitle">
              Suivez et gérez toutes vos dépenses en temps réel avec une vue d'ensemble complète
            </p>
          </div>
          <div className="header-actions">
            <button onClick={openModal} className="btn btn-primary">
              <FaPlus />
              Nouvelle Dépense
            </button>
          </div>
        </div>
      </header>

      {/* Control Panel - Floating Design */}
      <div className="control-panel">
        <div className="panel-grid">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher une dépense..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select
            value={selectedCentre}
            onChange={(e) => setSelectedCentre(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les centres</option>
            {centres.map((centre) => (
              <option key={centre._id.$oid} value={centre._id.$oid}>
                {centre.nom}
              </option>
            ))}
          </select>
          
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="date-input"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="date-input"
            />
          </div>
          
          <div className="panel-actions">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
            >
              {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
              {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
            </button>
            <button onClick={resetFilters} className="btn btn-secondary btn-icon">
              <FaFilter />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="card-content">
            <div className="card-info">
              <h3>Total des Dépenses</h3>
              <div className="card-value">
                {filteredDepenses.reduce((acc, d) => acc + parseFloat(d.montant), 0).toLocaleString('fr-FR')} MAD
              </div>
            </div>
            <div className="card-icon">
              <FaMoneyBillWave />
            </div>
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="card-content">
            <div className="card-info">
              <h3>Nombre de Dépenses</h3>
              <div className="card-value">{filteredDepenses.length}</div>
            </div>
            <div className="card-icon">
              <FaTag />
            </div>
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="card-content">
            <div className="card-info">
              <h3>Dépense Moyenne</h3>
              <div className="card-value">
                {filteredDepenses.length > 0 
                  ? (filteredDepenses.reduce((acc, d) => acc + parseFloat(d.montant), 0) / filteredDepenses.length).toLocaleString('fr-FR') + ' MAD'
                  : '0 MAD'
                }
              </div>
            </div>
            <div className="card-icon">
              <FaChartLine />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <section className="expenses-section">
        <div className="section-header">
          <h2 className="section-title">Dépenses Récentes</h2>
          <span className="expenses-count">{filteredDepenses.length} dépenses</span>
        </div>
        
        <div className="expenses-table">
          <div className="table-header">
            <div>Créé par</div>
            <div>Description</div>
            <div>Montant</div>
            <div>Centre</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          
          {paginatedDepenses.map((depense) => (
            <div key={depense._id.$oid} className="table-row">
              <div>
                {depense.created_by || 'N/A'}
              </div>
              <div className="row-description">
                {depense.description}
              </div>
              <div className="row-amount">
                {parseFloat(depense.montant).toLocaleString('fr-FR')} MAD
              </div>
              <div>
                <span className="row-badge">
                  {centres.find(c => c._id.$oid === depense.centre_id.$oid)?.nom || 'N/A'}
                </span>
              </div>
              <div className="row-date">
                {formatDate(depense.date)}
              </div>
              <div className="row-actions">
                {(user.role === 'admin' || user.username === depense.created_by) && (
                  <>
                    <button onClick={() => handleEdit(depense)} className="btn btn-secondary btn-icon">
                      <FaPencilAlt />
                    </button>
                    <button onClick={() => handleDelete(depense._id.$oid)} className="btn btn-danger btn-icon">
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            Précédent
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`btn ${currentPage === index + 1 ? 'btn-primary' : 'btn-secondary'}`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Modifier la Dépense' : 'Nouvelle Dépense'}</h2>
              <button onClick={closeModal} className="modal-close">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                    placeholder="Description de la dépense"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Montant (MAD)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="form-input"
                    placeholder="0,00"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Centre de Coût</label>
                  <select
                    required
                    value={centreId}
                    onChange={(e) => setCentreId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Sélectionner un centre</option>
                    {centres.map((centre) => (
                      <option key={centre._id.$oid} value={centre._id.$oid}>
                        {centre.nom}
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