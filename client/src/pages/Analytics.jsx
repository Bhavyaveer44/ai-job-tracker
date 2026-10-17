import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,PieChart, Pie, Cell, Legend} from 'recharts';
import { getAnalytics, getJobs } from '../api/jobs';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

const STATUS_LABELS = {
  applied: 'Applied',
  interview: 'Interview scheduled',
  offer: 'Offer received',
  rejected: 'Rejected',
};

const STATUS_COLORS = {
  applied: '#6366f1',
  interview: '#8b5cf6',
  offer: '#a78bfa',
  rejected: '#c4b5fd',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 15, 26, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 13,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600, color: '#a5b4fc' }}>
        {payload[0].value} applications
      </p>
    </div>
  );
};

const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: '24px 28px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    flex: 1,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }}>
    <p style={{
      margin: '0 0 8px',
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.5)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      fontWeight: 600
    }}>
      {label}
    </p>
    <p style={{
      margin: '0 0 4px',
      fontSize: 36,
      fontWeight: 700,
      color: color || '#fff',
      letterSpacing: '-1px'
    }}>
      {value}
    </p>
    {sub && <p style={{ margin: 0, fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' }}>{sub}</p>}
  </div>
);

const SectionCard = ({ title, children }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: '24px 28px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  }}>
    <h3 style={{
      margin: '0 0 24px',
      fontSize: 18,
      fontWeight: 600,
      color: '#fff',
      letterSpacing: '-0.3px'
    }}>
      {title}
    </h3>
    {children}
  </div>
);

export default function Analytics() {
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([getAnalytics(), getJobs()])
      .then(([analytics, allJobs]) => {
        setData(analytics);
        // sort jobs by date descending for timeline
        const sorted = [...allJobs].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setJobs(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 15 }}>Loading analytics...</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Navbar */}
      <div style={{
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.5px'
          }}>
            Job Tracker
          </h2>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'Board', path: '/' },
              { label: 'Analytics', path: '/analytics' },
              { label: 'Resume Agent', path: '/resume-agent' },
              { label: 'Resume Vault', path: '/resume-vault' },
            ].map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: location.pathname === path
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)'
                    : 'transparent',
                  color: location.pathname === path ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: location.pathname === path ? 600 : 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== path) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== path) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.6)',
            fontWeight: 500
          }}>
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{
          margin: '0 0 32px',
          fontSize: 32,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.5px'
        }}>
          Analytics
        </h2>

        {!data || data.total === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '120px 0',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 15
          }}>
            No data yet — add some jobs to your board first.
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{
              display: 'flex',
              gap: 20,
              marginBottom: 32,
              flexWrap: 'wrap'
            }}>
              <StatCard label="Total applications" value={data.total} color="#6366f1" />
              <StatCard
                label="Response rate"
                value={`${data.responseRate}%`}
                sub="interviews + offers"
                color={data.responseRate >= 20 ? '#a78bfa' : '#8b5cf6'}
              />
              <StatCard
                label="Avg match score"
                value={data.avgMatchScore ? `${data.avgMatchScore}%` : '—'}
                sub={data.avgMatchScore ? 'across scored jobs' : 'no scores yet'}
                color="#c4b5fd"
              />
              <StatCard
                label="Offers received"
                value={data.statusBreakdown?.find(s => s.name === 'Offer')?.value || 0}
                color="#a78bfa"
              />
            </div>

            {/* Line chart + Pie chart */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 24,
              marginBottom: 24
            }}>
              <SectionCard title="Applications over last 30 days">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.appsByDate}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.4)' }}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.4)' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Status breakdown">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.statusBreakdown.filter(s => s.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.statusBreakdown.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        fontSize: 13,
                        borderRadius: 12,
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        background: 'rgba(15, 15, 26, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                      }}
                      itemStyle={{ color: '#a5b4fc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Application timeline */}
            <SectionCard title="Application timeline">
              {jobs.length === 0 ? (
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>No applications yet</p>
              ) : (
                <div>
                  {jobs.map((job, index) => (
                    <div key={job.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      paddingBottom: 20,
                      borderBottom: index < jobs.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                      marginBottom: index < jobs.length - 1 ? 20 : 0,
                      transition: 'all 0.2s ease'
                    }}>
                      <span style={{
                        fontSize: 13,
                        color: 'rgba(255, 255, 255, 0.4)',
                        minWidth: 44,
                        paddingTop: 2,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 500
                      }}>
                        {formatDate(job.created_at)}
                      </span>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: STATUS_COLORS[job.status] || 'rgba(255, 255, 255, 0.3)',
                        marginTop: 4,
                        flexShrink: 0,
                        boxShadow: `0 0 12px ${STATUS_COLORS[job.status] || 'rgba(255, 255, 255, 0.2)'}`
                      }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>
                          {job.role}
                        </p>
                        <p style={{ margin: 0, fontSize: 13 }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{job.company}</span>
                          {job.status !== 'applied' && (
                            <>
                              <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}> · </span>
                              <span style={{ color: STATUS_COLORS[job.status] }}>
                                {STATUS_LABELS[job.status]}
                              </span>
                            </>
                          )}
                          {job.status === 'applied' && (
                            <span style={{ color: '#6366f1' }}> · Applied</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

          </>
        )}
      </div>
    </div>
  );
}