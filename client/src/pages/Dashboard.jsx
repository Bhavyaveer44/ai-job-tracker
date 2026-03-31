import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Job Tracker</h2>
        <div>
          <span style={{ marginRight: 16, fontSize: 14 }}>{user?.email}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <p>Your Kanban board will go here in Phase 3.</p>
    </div>
  );
}