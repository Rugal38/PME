import { 
  FaTachometerAlt, 
  FaShoppingCart, 
  FaLandmark, 
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaUserShield,
  FaUserCog,
  FaUserTie,
  FaCalendarAlt
} from 'react-icons/fa';
import './Sidebar.css';
import { AuthContext } from '../context/AuthContext';
import { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);
  
  const navItems = [
    { path: '/', icon: <FaTachometerAlt />, label: 'Dashboard' },
    { path: '/depenses', icon: <FaShoppingCart />, label: 'Dépenses' },
    { path: '/centres', icon: <FaLandmark />, label: 'Centres de Coût' },
    { path: '/budgets', icon: <FaCalendarAlt />, label: 'Budgets' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
      
      <div className="sidebar-header">
        <div className="logo-icon">
          <FaChartLine />
        </div>
        {!isCollapsed && (
          <div className="logo-text">
            <h1>PME App</h1>
            <p>Suivi & Analyse</p>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-link ${isActive ? 'active' : ''}`
            }
            data-tooltip={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Admin">
              <span className="nav-icon"><FaUserShield /></span>
              {!isCollapsed && <span className="nav-label">Assistants</span>}
            </NavLink>
            <NavLink to="/responsables" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Responsables">
              <span className="nav-icon"><FaUserTie /></span>
              {!isCollapsed && <span className="nav-label">Responsables</span>}
            </NavLink>
          </>
        )}
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-tooltip="Profile">
          <span className="nav-icon"><FaUserCog /></span>
          {!isCollapsed && <span className="nav-label">Profile</span>}
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
          <button onClick={logout} className="nav-link logout-btn" data-tooltip="Logout">
              <span className="nav-icon"><FaSignOutAlt /></span>
              {!isCollapsed && <span className="nav-label">Logout</span>}
          </button>
        {!isCollapsed && user && (
            <div className="user-info">
                <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                <p className="user-name">{user.username}</p>
                <p className="user-role">{user.role}</p>
                </div>
            </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;