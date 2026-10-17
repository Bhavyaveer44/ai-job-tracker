import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = await registerUser(email, password);
    setLoading(false);
    if (data.error) return setError(data.error);
    login(data.user, data.token);
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Split Screen Container */}
      <div style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row'
      }}>
        {/* Left Side - Branding & Visuals */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative gradient orbs */}
          <div style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            top: -100,
            left: -100,
            filter: 'blur(60px)',
            animation: 'float 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
            bottom: -50,
            right: -50,
            filter: 'blur(60px)',
            animation: 'float 10s ease-in-out infinite reverse'
          }} />

          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            maxWidth: 500
          }}>
            <h1 style={{
              margin: '0 0 16px',
              fontSize: 48,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px'
            }}>
              Job Tracker
            </h1>
            <p style={{
              margin: '0 0 32px',
              fontSize: 18,
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.6,
              fontWeight: 400
            }}>
              Start tracking your job applications with AI-powered insights
            </p>
            <div style={{
              display: 'flex',
              gap: 24,
              justifyContent: 'center',
              marginTop: 32
            }}>
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#818cf8',
                  marginBottom: 4
                }}>
                  Free
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Forever
                </div>
              </div>
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#a78bfa',
                  marginBottom: 4
                }}>
                  AI
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Powered
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 400
          }}>
            <div style={{ marginBottom: 40 }}>
              <h2 style={{
                margin: '0 0 8px',
                fontSize: 32,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '-0.5px'
              }}>
                Create account
              </h2>
              <p style={{
                margin: 0,
                fontSize: 15,
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                Start your job search journey today
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 8,
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500
                }}>
                  Email
                </label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 8,
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500
                }}>
                  Password
                </label>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  marginBottom: 20,
                  animation: 'shake 0.5s ease-in-out'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#fca5a5'
                  }}>
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  background: loading
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 20px rgba(99, 102, 241, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
                }}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p style={{
              margin: '24px 0 0',
              textAlign: 'center',
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#818cf8',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#a5b4fc';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#818cf8';
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @media (max-width: 1024px) {
          div[style*="flex-direction: row"] {
            flex-direction: column !important;
          }
          div[style*="flex: 1"] {
            padding: 40px 24px !important;
          }
          h1 {
            font-size: 36px !important;
          }
        }
      `}</style>
    </div>
  );
}