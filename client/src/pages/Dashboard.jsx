import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Board from '../components/Board/Board';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a' }}>
      <div style={{
        background: '#1a1a1a', borderBottom: '1px solid #2d2d2d',
        padding: '14px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>Job Tracker</h2>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'Board', path: '/' },
              { label: 'Analytics', path: '/analytics' },
            ].map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none',
                  background: location.pathname === path ? '#2563eb' : 'transparent',
                  color: location.pathname === path ? 'white' : '#9ca3af',
                  cursor: 'pointer', fontSize: 14,
                  fontWeight: location.pathname === path ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>{user?.email}</span>
          <button onClick={handleLogout}
            style={{
              padding: '7px 18px', borderRadius: 8,
              border: '1px solid #3d3d3d', cursor: 'pointer',
              fontSize: 14, background: 'transparent', color: 'white'
            }}>
            Log out
          </button>
        </div>
      </div>
      <Board />
    </div>
  );
}