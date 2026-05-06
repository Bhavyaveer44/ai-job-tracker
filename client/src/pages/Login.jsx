import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, demoLogin } from '../api/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = await loginUser(email, password);
    setLoading(false);
    if (data.error) return setError(data.error);
    login(data.user, data.token, false);
    navigate('/');
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError('');
    const data = await demoLogin();
    setDemoLoading(false);
    if (data.error) return setError(data.error);
    login(data.user, data.token, true);
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: 'white' }}>
            Job Tracker
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            AI-powered job application manager
          </p>
        </div>

        {/* Demo button — most prominent */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          style={{
            width: '100%', padding: '12px 0', marginBottom: 20,
            borderRadius: 10, border: '1px solid #2563eb',
            background: 'rgba(37,99,235,0.12)', color: '#60a5fa',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s'
          }}>
          {demoLoading ? 'Loading demo...' : 'Try demo — no sign up needed'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: '0.5px', background: '#2d2d2d' }} />
          <span style={{ fontSize: 13, color: '#4b5563' }}>or sign in</span>
          <div style={{ flex: 1, height: '0.5px', background: '#2d2d2d' }} />
        </div>

        {/* Login form */}
        <div style={{
          background: '#2a2a2a', borderRadius: 12,
          padding: 24, border: '1px solid #3d3d3d'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#9ca3af' }}>
                Email
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  borderRadius: 8, border: '1px solid #3d3d3d',
                  background: '#1a1a1a', color: 'white',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#9ca3af' }}>
                Password
              </label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  borderRadius: 8, border: '1px solid #3d3d3d',
                  background: '#1a1a1a', color: 'white',
                  fontSize: 14, outline: 'none'
                }}
              />
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8,
                background: '#2563eb', color: 'white',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600
              }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#4b5563' }}>
          Demo is pre-loaded with 10 realistic job applications
        </p>
      </div>
    </div>
  );
}