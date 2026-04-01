import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Board from '../components/Board/Board';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Job Tracker</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{user?.email}</span>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </div>
      <Board />
    </div>
  );
}