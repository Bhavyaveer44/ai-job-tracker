import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,PieChart, Pie, Cell, Legend} from 'recharts';
import { getAnalytics, getJobs } from '../api/jobs';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#2563eb', '#d97706', '#16a34a', '#dc2626'];

const STATUS_LABELS = {
  applied: 'Applied',
  interview: 'Interview scheduled',
  offer: 'Offer received',
  rejected: 'Rejected',
};

const STATUS_COLORS = {
  applied: '#2563eb',
  interview: '#d97706',
  offer: '#16a34a',
  rejected: '#dc2626',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#2a2a2a', border: '1px solid #3d3d3d',
      borderRadius: 8, padding: '8px 12px', fontSize: 13
    }}>
      <p style={{ margin: 0, color: '#9ca3af' }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600, color: '#2563eb' }}>
        {payload[0].value} applications
      </p>
    </div>
  );
};

const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: '#2a2a2a', borderRadius: 10, padding: '18px 20px',
    border: '1px solid #3d3d3d', flex: 1
  }}>
    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
    <p style={{ margin: '0 0 2px', fontSize: 30, fontWeight: 700, color: color || 'white' }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{sub}</p>}
  </div>
);

const SectionCard = ({ title, children }) => (
  <div style={{
    background: '#2a2a2a', borderRadius: 10, padding: '20px 24px',
    border: '1px solid #3d3d3d'
  }}>
    <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: 'white' }}>{title}</h3>
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a1a' }}>
      <p style={{ color: '#6b7280' }}>Loading analytics...</p>
    </div>
  );

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
                  fontWeight: location.pathname === path ? 600 : 400
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

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: 'white' }}>Analytics</h2>

        {!data || data.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5563', fontSize: 15 }}>
            No data yet — add some jobs to your board first.
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
              <StatCard label="Total applications" value={data.total} color="#2563eb" />
              <StatCard
                label="Response rate"
                value={`${data.responseRate}%`}
                sub="interviews + offers"
                color={data.responseRate >= 20 ? '#16a34a' : '#d97706'}
              />
              <StatCard
                label="Avg match score"
                value={data.avgMatchScore ? `${data.avgMatchScore}%` : '—'}
                sub={data.avgMatchScore ? 'across scored jobs' : 'no scores yet'}
                color="#7c3aed"
              />
              <StatCard
                label="Offers received"
                value={data.statusBreakdown?.find(s => s.name === 'Offer')?.value || 0}
                color="#16a34a"
              />
            </div>

            {/* Line chart + Pie chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <SectionCard title="Applications over last 30 days">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.appsByDate}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Status breakdown">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.statusBreakdown.filter(s => s.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
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
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        fontSize: 13, borderRadius: 8,
                        border: '1px solid #3d3d3d',
                        background: '#2a2a2a',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Application timeline */}
            <SectionCard title="Application timeline">
              {jobs.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 13 }}>No applications yet</p>
              ) : (
                <div>
                  {jobs.map((job, index) => (
                    <div key={job.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      paddingBottom: 16,
                      borderBottom: index < jobs.length - 1 ? '1px solid #2d2d2d' : 'none',
                      marginBottom: index < jobs.length - 1 ? 16 : 0
                    }}>
                      <span style={{
                        fontSize: 13, color: '#6b7280', minWidth: 44,
                        paddingTop: 2, fontVariantNumeric: 'tabular-nums'
                      }}>
                        {formatDate(job.created_at)}
                      </span>
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: STATUS_COLORS[job.status] || '#6b7280',
                        marginTop: 4, flexShrink: 0
                      }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>
                          {job.role}
                        </p>
                        <p style={{ margin: 0, fontSize: 13 }}>
                          <span style={{ color: '#9ca3af' }}>{job.company}</span>
                          {job.status !== 'applied' && (
                            <>
                              <span style={{ color: '#4b5563' }}> · </span>
                              <span style={{ color: STATUS_COLORS[job.status] }}>
                                {STATUS_LABELS[job.status]}
                              </span>
                            </>
                          )}
                          {job.status === 'applied' && (
                            <span style={{ color: '#2b6bc5' }}> · Applied</span>
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