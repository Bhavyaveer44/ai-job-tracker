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
    <div style={{ minHeight: '100vh', background: '#1f1e41' }}>
      <div style={{
        background: '#322f6c', borderBottom: '1px solid #e5e7eb',
        padding: '14px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Job Tracker</h2>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'Board', path: '/' },
              { label: 'Analytics', path: '/analytics' },
            ].map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: window.location.pathname === path ? '#eff6ff' : 'transparent',
                  color: window.location.pathname === path ? '#2563eb' : '#6b7280',
                  cursor: 'pointer', fontSize: 14,
                  fontWeight: window.location.pathname === path ? 500 : 400
                }}>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{user?.email}</span>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14 }}>
            Log out
          </button>
        </div>
      </div>
      <Board />
    </div>
  );
}