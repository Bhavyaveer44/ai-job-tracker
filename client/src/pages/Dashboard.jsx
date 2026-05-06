import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Board from '../components/Board/Board';

export default function Dashboard() {
  const { user, logout, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a' }}>

      {/* Navbar */}
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

      {/* Demo banner */}
      {isDemo && (
        <div style={{
          background: 'rgba(37,99,235,0.15)',
          borderBottom: '1px solid rgba(37,99,235,0.3)',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#60a5fa'
            }} />
            <span style={{ fontSize: 13, color: '#93c5fd' }}>
              You're viewing a demo account with pre-loaded data — changes won't be saved
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '5px 14px', borderRadius: 6,
              background: '#2563eb', color: 'white',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500
            }}>
            Create free account
          </button>
        </div>
      )}

      <Board />
    </div>
  );
}