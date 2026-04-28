import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, CartesianGrid,
} from 'recharts';
import { getAnalytics } from '../api/jobs';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#2563eb', '#d97706', '#16a34a', '#dc2626'];

const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: 'white', borderRadius: 10, padding: '18px 20px',
    border: '1px solid #e5e7eb', flex: 1
  }}>
    <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280' }}>{label}</p>
    <p style={{ margin: '0 0 2px', fontSize: 30, fontWeight: 700, color: color || '#111' }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
  </div>
);

const SectionCard = ({ title, children }) => (
  <div style={{
    background: 'white', borderRadius: 10, padding: '20px 24px',
    border: '1px solid #e5e7eb'
  }}>
    <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</h3>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb',
      borderRadius: 8, padding: '8px 12px', fontSize: 13
    }}>
      <p style={{ margin: 0, color: '#6b7280' }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600, color: '#2563eb' }}>
        {payload[0].value} {payload[0].name || 'applications'}
      </p>
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p style={{ color: '#6b7280' }}>Loading analytics...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: '#dc2626' }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* Navbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
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
                  cursor: 'pointer', fontSize: 14, fontWeight: window.location.pathname === path ? 500 : 400
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

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Analytics</h2>

        {data?.total === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: '#9ca3af', fontSize: 15
          }}>
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
                color={data.responseRate >= 20 ? '#16a34a' : data.responseRate >= 10 ? '#d97706' : '#dc2626'}
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
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
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
                {data.total === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>No data yet</p>
                ) : (
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
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{value}</span>
                        )}
                      />
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          fontSize: 13, borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>

            {/* Bar chart */}
            {data.topCompanies?.length > 0 && (
              <SectionCard title="Top companies applied to">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topCompanies} barSize={36}>
                    <CartesianGrid vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="company"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}