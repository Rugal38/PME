// Dashboard.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { getDepenses } from '../services/depenseService';
import { getCentres } from '../services/centreService';
import { getBudgets } from '../services/budgetService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  FaChartBar, FaChartPie, FaChartLine, FaMoneyBillWave, FaBuilding, 
  FaArrowUp, FaArrowDown, FaCalendarAlt, FaDownload, FaTag, FaChevronDown
} from 'react-icons/fa';
import { format, subYears, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import './Dashboard.css';
import Prediction from '../components/Prediction';
import {api} from '../services/api';
import { AuthContext } from '../context/AuthContext';


const COLORS = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#7E57C2', '#26A69A', '#FFCA28', '#5C6BC0', '#29B6F6', '#FFEE58', '#FF7043'];

export default function Dashboard() {
  const [allDepenses, setAllDepenses] = useState([]); // Store all depenses for filtering
  const [allCentres, setAllCentres] = useState([]); // Store all centres
  const [allBudgets, setAllBudgets] = useState([]); // Store all budgets

  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [selectedTrendCentre, setSelectedTrendCentre] = useState('all'); // 'all' or centre_id

  const [dropdownPosition, setDropdownPosition] = useState(null); // { top, left, statId }
  const dropdownRef = useRef(null);

  const [selectedGlobalTotalYear, setSelectedGlobalTotalYear] = useState('all');
  const [selectedGlobalTotalCentre, setSelectedGlobalTotalCentre] = useState('all');
  const [selectedGlobalTotalTrimester, setSelectedGlobalTotalTrimester] = useState('all');

  const [stats, setStats] = useState({
    totalCentres: 0,
    annualBudgetByCentre: {}, // New: Total budget for current year by centre
    totalBudgetOverall: 0, // New: Sum of all budgets
    totalActualOverall: 0, // New: Sum of all actual expenses
    globalVariance: 0, // New: totalActualOverall - totalBudgetOverall
    numBudgets: 0, // No longer needed for display but kept in processData
    numExpenses: 0,
    avgBudgetPerTrimester: 0, // No longer needed for display but kept in processData
    recentDepenses: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('year');

  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, selectedTrendCentre, selectedGlobalTotalYear, selectedGlobalTotalCentre, selectedGlobalTotalTrimester]); // Re-fetch when filters change

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownPosition(null); // Close dropdown if click outside
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleExport = async () => {
    try {
      const response = await api.get('/api/export/budgets', {
        responseType: 'blob' // Important: Set responseType to 'blob' for binary data
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Analyse_Budgets_Depenses.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Clean up the URL object
    } catch (error) {
      console.error('Error exporting budgets:', error);
      alert('Failed to export budgets. Please try again.');
    }
  };

  const processData = (depenses, centres, budgets) => {
    // Apply global filters
    const filteredBudgets = budgets.filter(b => {
      const matchesYear = selectedGlobalTotalYear === 'all' || b.annee.toString() === selectedGlobalTotalYear;
      const matchesCentre = selectedGlobalTotalCentre === 'all' || b.centre_id.$oid === selectedGlobalTotalCentre;
      const matchesTrimester = selectedGlobalTotalTrimester === 'all' || b.trimester.toString() === selectedGlobalTotalTrimester;
      return matchesYear && matchesCentre && matchesTrimester;
    });

    const filteredDepenses = depenses.filter(d => {
      const depenseYear = new Date(d.date).getFullYear();
      const depenseTrimester = Math.floor((new Date(d.date).getMonth()) / 3) + 1;
      const matchesYear = selectedGlobalTotalYear === 'all' || depenseYear.toString() === selectedGlobalTotalYear;
      const matchesCentre = selectedGlobalTotalCentre === 'all' || d.centre_id.$oid === selectedGlobalTotalCentre;
      const matchesTrimester = selectedGlobalTotalTrimester === 'all' || depenseTrimester.toString() === selectedGlobalTotalTrimester;
      return matchesYear && matchesCentre && matchesTrimester;
    });

    // Total Depenses (Actual)
    const totalActualOverall = filteredDepenses.reduce((acc, d) => acc + parseFloat(d.montant), 0);
    const numExpenses = filteredDepenses.length;

    // Total Budgets
    const totalBudgetOverall = filteredBudgets.reduce((acc, b) => acc + parseFloat(b.montant), 0);
    const numBudgets = filteredBudgets.length;

    // Global Variance
    const globalVariance = totalActualOverall - totalBudgetOverall;

    // Annual Budget by Centre (grouped by year)
    const annualBudgetByCentre = {};
    budgets.forEach(b => { // Use allBudgets for this section, not filtered ones
      const centreName = centres.find(c => c._id.$oid === b.centre_id.$oid)?.nom || 'N/A';
      if (!annualBudgetByCentre[centreName]) {
        annualBudgetByCentre[centreName] = {};
      }
      if (!annualBudgetByCentre[centreName][b.annee]) {
        annualBudgetByCentre[centreName][b.annee] = 0;
      }
      annualBudgetByCentre[centreName][b.annee] += parseFloat(b.montant);
    });

    // Average Budget per Trimester (no longer needed for display)
    const avgBudgetPerTrimester = numBudgets > 0 ? totalBudgetOverall / numBudgets : 0;

    // Bar Chart Data (Expenses by Centre)
    const barChartData = centres.map((centre, index) => {
      const total = depenses
        .filter((depense) => depense.centre_id.$oid === centre._id.$oid)
        .reduce((acc, depense) => acc + parseFloat(depense.montant), 0);
      return {
        name: centre.nom,
        total,
        color: COLORS[index % COLORS.length],
        count: depenses.filter(d => d.centre_id.$oid === centre._id.$oid).length
      };
    }).filter(item => item.total > 0);

    const sortedBarData = [...barChartData].sort((a, b) => b.total - a.total);
    setBarData(sortedBarData);
    
    // Pie Chart Data (Top 6 Centres by Expense)
    setPieData(sortedBarData.slice(0, 6));
    
    // Trend Data
    const filteredDepensesForTrend = selectedTrendCentre === 'all'
      ? depenses
      : depenses.filter(d => d.centre_id.$oid === selectedTrendCentre);

    const trend = generateTrendData(filteredDepensesForTrend, timeRange);
    setTrendData(trend);
    
    // Recent Depenses
    const recentDepenses = depenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(depense => ({
        ...depense,
        centreName: centres.find(c => c._id.$oid === depense.centre_id.$oid)?.nom || 'N/A'
      }));
      
    setStats({
      totalCentres: centres.length,
      annualBudgetByCentre,
      totalBudgetOverall,
      totalActualOverall,
      globalVariance,
      numBudgets, // Still useful internally, just not displayed in quickStats directly
      numExpenses,
      avgBudgetPerTrimester, // Still useful internally, just not displayed in quickStats directly
      recentDepenses
    });
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [depensesRes, centresRes, budgetsRes] = await Promise.all([
        getDepenses(),
        getCentres(),
        getBudgets()
      ]);
      setAllDepenses(depensesRes.data);
      setAllCentres(centresRes.data);
      setAllBudgets(budgetsRes.data);
      processData(depensesRes.data, centresRes.data, budgetsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (depensesToProcess, range) => {
    const now = new Date();
    let startDate;

    switch (range) {
      case 'month':
        startDate = startOfMonth(subYears(now, 0));
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'year':
      default:
        startDate = subYears(now, 1);
        break;
    }

    const dateInterval = eachMonthOfInterval({ start: startDate, end: now });

    const aggregatedData = dateInterval.map(monthStart => {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const totalAmount = depensesToProcess
        .filter(d => {
          const depenseDate = new Date(d.date);
          return depenseDate >= monthStart && depenseDate <= monthEnd;
        })
        .reduce((sum, d) => sum + parseFloat(d.montant), 0);

      return {
        month: format(monthStart, 'MMM yy', { locale: fr }),
        amount: totalAmount,
      };
    });

    return aggregatedData;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const quickStats = [
    {
      id: 'budgetGlobal',
      title: "Budget Total Global",
      value: `${stats.totalBudgetOverall.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} MAD`,
      icon: <FaMoneyBillWave />,
      isFilterable: true
    },
    {
      id: 'reelGlobal',
      title: "Réel Total Global",
      value: `${stats.totalActualOverall.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} MAD`,
      icon: <FaChartLine />,
      isFilterable: true
    },
    {
      id: 'ecartGlobal',
      title: "Écart Global",
      value: `${stats.globalVariance.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} MAD`,
      icon: stats.globalVariance >= 0 ? <FaArrowUp /> : <FaArrowDown />,
      isFilterable: false
    },
    {
      id: 'numDepenses',
      title: "Nombre de Dépenses",
      value: stats.numExpenses,
      icon: <FaTag />,
      isFilterable: false
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-container content-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container content-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="text-gradient">Tableau de Bord</h1>
            <p className="subtitle">Vue d'ensemble complète de vos finances</p>
          </div>
          <div className="header-controls">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-select"
            >
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button onClick={handleExport} className="btn btn-primary">
              <FaDownload />
              Exporter
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {quickStats.map((stat, index) => (
            <div key={stat.id} className="stat-card-wrapper">
              <div className="stat-card animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="stat-card-content">
                  <div className="stat-info">
                    <p className="stat-title">{stat.title}</p>
                    <p className="stat-value">{stat.value}</p>
                  </div>
                  {stat.isFilterable && (
                    <div 
                      className="stat-filter-toggle" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click if any
                        const rect = e.currentTarget.closest('.stat-card').getBoundingClientRect();
                        if (dropdownPosition?.statId === stat.id) {
                          setDropdownPosition(null);
                        } else {
                          setDropdownPosition({ 
                            top: rect.bottom + window.scrollY, 
                            left: rect.left + window.scrollX, 
                            statId: stat.id 
                          });
                        }
                      }}
                    >
                      <FaChevronDown />
                    </div>
                  )}
                  <div className="stat-icon" style={{ background: index === 0 ? 'var(--gradient-primary)' :
                              index === 1 ? 'var(--gradient-secondary)' :
                              index === 2 ? (stat.value.includes('-') ? 'var(--gradient-danger)' : 'var(--gradient-success)') :
                              'var(--gradient-warning)' }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Global Filter Dropdown - Rendered once at a global level and positioned */}
          {dropdownPosition && (
            <div 
              ref={dropdownRef}
              className="global-filter-dropdown" 
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <div className="filter-group">
                <label>Année:</label>
                <select 
                  value={selectedGlobalTotalYear} 
                  onChange={(e) => setSelectedGlobalTotalYear(e.target.value)}
                >
                  <option value="all">Toutes les années</option>
                  {years.map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Trimestre:</label>
                <select 
                  value={selectedGlobalTotalTrimester} 
                  onChange={(e) => setSelectedGlobalTotalTrimester(e.target.value)}
                >
                  <option value="all">Tous les trimestres</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Centre:</label>
                <select 
                  value={selectedGlobalTotalCentre} 
                  onChange={(e) => setSelectedGlobalTotalCentre(e.target.value)}
                >
                  <option value="all">Tous les centres</option>
                  {allCentres.map(centre => (
                    <option key={centre._id.$oid} value={centre._id.$oid}>{centre.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="charts-grid">
          {/* Bar Chart */}
          <div className="chart-card animate-slide-up">
            <div className="chart-header">
              <div className="chart-title">
                <FaChartBar className="chart-icon" />
                <span>Dépenses par Centre</span>
              </div>
              <span className="chart-badge">{barData.length} centres</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: 'var(--gray-500)' }}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value).toLocaleString('fr-FR')} MAD`}
                    tick={{ fill: 'var(--gray-500)' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${parseFloat(value).toLocaleString('fr-FR')} MAD`, 'Montant']}
                    contentStyle={{ 
                      borderRadius: 'var(--radius-lg)',
                      border: 'none',
                      boxShadow: 'var(--shadow-lg)',
                      backgroundColor: 'white'
                    }}
                    labelStyle={{ color: 'var(--gray-700)' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total" 
                    name="Montant Total"
                    radius={[8, 8, 0, 0]}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="chart-card animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="chart-header">
              <div className="chart-title">
                <FaChartPie className="chart-icon" style={{ color: 'var(--secondary)' }} />
                <span>Répartition des Dépenses</span>
              </div>
              <span className="text-sm text-gray-500">Top 6 centres</span>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="total"
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    fill="var(--primary)"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${parseFloat(value).toLocaleString('fr-FR')} MAD`, 'Montant']}
                    contentStyle={{ 
                      borderRadius: 'var(--radius-lg)',
                      border: 'none',
                      boxShadow: 'var(--shadow-lg)',
                      backgroundColor: 'white'
                    }}
                    labelStyle={{ color: 'var(--gray-700)' }}
                  />
                  <Legend 
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ paddingLeft: '40px', color: 'var(--gray-700)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Full Width Trend Chart */}
        <div className="full-chart">
          <div className="chart-card animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="chart-header">
              <div className="chart-title">
                <FaChartLine className="chart-icon" style={{ color: 'var(--success)' }} />
                <span>Évolution des Dépenses</span>
              </div>
              <div className="time-range-selector">
                <select
                  value={selectedTrendCentre}
                  onChange={(e) => setSelectedTrendCentre(e.target.value)}
                  className="form-select"
                >
                  <option value="all">Tous les centres</option>
                  {allCentres.map(centre => (
                    <option key={centre._id.$oid} value={centre._id.$oid}>{centre.nom}</option>
                  ))}
                </select>
                {['month', 'quarter', 'year'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeRange(period)}
                    className={`time-range-btn ${timeRange === period ? 'active' : ''}`}
                  >
                    {period === 'month' ? 'Mensuel' : period === 'quarter' ? 'Trimestriel' : 'Annuel'}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'var(--gray-500)' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value).toLocaleString('fr-FR')} MAD`}
                    tick={{ fill: 'var(--gray-500)' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${parseFloat(value).toLocaleString('fr-FR')} MAD`, 'Montant']}
                    contentStyle={{ 
                      borderRadius: 'var(--radius-lg)',
                      border: 'none',
                      boxShadow: 'var(--shadow-lg)',
                      backgroundColor: 'white'
                    }}
                    labelStyle={{ color: 'var(--gray-700)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--primary)" 
                    fillOpacity={1} 
                    fill="url(#colorAmount)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table & Quick Stats */}
      <div className="table-stats-grid">
        {/* Recent Activity */}
        <div className="activity-card animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="activity-header">
            <h3 className="activity-title">Dépenses Récentes</h3>
          </div>
          <div className="activity-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Centre</th>
                    <th>Montant</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentDepenses.map((depense) => (
                    <tr key={depense._id.$oid}>
                      <td className="font-medium">{depense.description}</td>
                      <td>
                        <span className="badge-primary badge">
                          {depense.centreName}
                        </span>
                      </td>
                      <td className="font-bold text-green-600">
                        {parseFloat(depense.montant).toLocaleString('fr-FR')} MAD
                      </td>
                      <td className="text-gray-500">{format(new Date(depense.date), 'dd MMM yyyy', { locale: fr })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats-card animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="quick-stats-header">
            <h3 className="quick-stats-title">Budgets Annuels par Centre</h3>
          </div>
          <div className="quick-stats-body">
            {Object.entries(stats.annualBudgetByCentre).map(([centreName, annualBudgets]) => (
              <div key={centreName} className="quick-stat-item">
                <div className="quick-stat-info">
                  <p>{centreName}</p>
                  {Object.entries(annualBudgets).map(([year, budgetAmount]) => (
                    <p key={year}>
                      {year}: {budgetAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </p>
                  ))}
                </div>
                <div className="quick-stat-icon" style={{ background: 'var(--gradient-info)' }}>
                  <FaBuilding />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isAdmin && <Prediction />}
    </div>
  );
}