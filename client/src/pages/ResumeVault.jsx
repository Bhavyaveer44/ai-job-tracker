import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVersions, deleteVersion, getJobsForVersion } from '../api/resumeVault';
import { getJobs } from '../api/jobs';
import { attachResumeToJob } from '../api/resumeVault';
import toast from 'react-hot-toast';

const SCORE_COLOR = (s) =>
  !s ? '#6b7280' : s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function VersionCard({ version, allVersions, allJobs, onDelete, onAttach }) {
  const [expanded, setExpanded] = useState(false);
  const [versionJobs, setVersionJobs] = useState([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [attaching, setAttaching] = useState(false);

  const parent = allVersions.find(v => v.id === version.parent_id);

  useEffect(() => {
    getJobsForVersion(version.id).then(setVersionJobs).catch(() => {});
  }, [version.id]);

  const handleAttach = async () => {
    if (!selectedJobId) return toast.error('Select a job first');
    setAttaching(true);
    try {
      await onAttach(selectedJobId, version.id);
      toast.success('Resume attached to job');
      setShowAttachModal(false);
      getJobsForVersion(version.id).then(setVersionJobs);
    } catch {
      toast.error('Failed to attach');
    }
    setAttaching(false);
  };

  return (
    <>
      <div style={{
        background: '#1e1e1e', borderRadius: 12,
        border: '1px solid #2d2d2d', padding: 18, marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'white' }}>
                {version.name}
              </h3>
              {version.ats_score && (
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(22,163,74,0.1)', color: SCORE_COLOR(version.ats_score),
                  border: `1px solid ${SCORE_COLOR(version.ats_score)}33`
                }}>
                  ATS {version.ats_score}
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>
              Created {formatDate(version.created_at)}
              {parent && (
                <span style={{ color: '#4b5563' }}> · From: {parent.name}</span>
              )}
            </p>
            {versionJobs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {versionJobs.map(j => (
                  <span key={j.id} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: '#2a2a2a', color: '#9ca3af',
                    border: '1px solid #3d3d3d'
                  }}>
                    {j.role} @ {j.company}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                background: 'transparent', border: '1px solid #3d3d3d',
                color: '#9ca3af', cursor: 'pointer'
              }}>
              {expanded ? 'Hide' : 'View'}
            </button>
            <button
              onClick={() => setShowAttachModal(true)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                color: '#60a5fa', cursor: 'pointer'
              }}>
              Use for job
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this version?')) onDelete(version.id);
              }}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                background: 'transparent', border: '1px solid #3d3d3d',
                color: '#dc2626', cursor: 'pointer'
              }}>
              Delete
            </button>
          </div>
        </div>

        {/* Expanded: full resume + agent log */}
        {expanded && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              background: '#111', borderRadius: 8, padding: 14,
              maxHeight: 300, overflowY: 'auto', marginBottom: 12
            }}>
              <pre style={{
                margin: 0, fontSize: 12, color: '#d1d5db',
                whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'inherit'
              }}>
                {version.content}
              </pre>
            </div>

            {version.iteration_log?.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: '#9ca3af' }}>
                  Agent iterations ({version.iteration_log.length})
                </p>
                {version.iteration_log.map((iter, i) => (
                  <div key={i} style={{
                    background: '#1a1a1a', borderRadius: 6, padding: '8px 12px',
                    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>#{iter.iteration}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      Rewrote <strong style={{ color: 'white' }}>{iter.weakest_section}</strong>
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: SCORE_COLOR(iter.score_before) }}>{iter.score_before}</span>
                      <span style={{ color: '#4b5563', margin: '0 4px' }}>→</span>
                      <span style={{ color: SCORE_COLOR(iter.score_after) }}>{iter.score_after}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attach to job modal */}
      {showAttachModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            background: '#1e1e1e', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 420, border: '1px solid #2d2d2d'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'white' }}>
              Attach "{version.name}" to a job
            </h3>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
              Select job application
            </label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              style={{
                width: '100%', padding: 10, borderRadius: 8,
                border: '1px solid #3d3d3d', background: '#111',
                color: selectedJobId ? 'white' : '#6b7280',
                fontSize: 14, marginBottom: 16, outline: 'none'
              }}>
              <option value="">Choose a job...</option>
              {allJobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.role} @ {j.company} — {j.status}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAttach} disabled={attaching} style={{
                flex: 1, padding: 10, borderRadius: 8,
                background: '#2563eb', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 14
              }}>
                {attaching ? 'Attaching...' : 'Attach resume'}
              </button>
              <button onClick={() => setShowAttachModal(false)} style={{
                padding: '10px 16px', borderRadius: 8,
                background: 'transparent', border: '1px solid #3d3d3d',
                color: '#9ca3af', cursor: 'pointer', fontSize: 14
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ResumeVault() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getVersions(), getJobs()])
      .then(([v, j]) => { setVersions(v); setAllJobs(j); })
      .catch(() => toast.error('Failed to load vault'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteVersion(id);
      setVersions(prev => prev.filter(v => v.id !== id));
      toast.success('Version deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleAttach = async (jobId, versionId) => {
    await attachResumeToJob(jobId, versionId);
  };

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
              { label: 'Resume Agent', path: '/resume-agent' },
              { label: 'Resume Vault', path: '/resume-vault' },
            ].map(({ label, path }) => (
              <button key={path} onClick={() => navigate(path)} style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: location.pathname === path ? '#2563eb' : 'transparent',
                color: location.pathname === path ? 'white' : '#9ca3af',
                cursor: 'pointer', fontSize: 13,
                fontWeight: location.pathname === path ? 600 : 400,
              }}>{label}</button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{
            padding: '7px 16px', borderRadius: 8, border: '1px solid #3d3d3d',
            cursor: 'pointer', fontSize: 14, background: 'transparent', color: 'white'
          }}>Log out</button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'white' }}>
              Resume Vault
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={() => navigate('/resume-agent')}
            style={{
              padding: '9px 18px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, fontWeight: 500
            }}>
            + Create with Agent
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '60px 0' }}>
            Loading vault...
          </p>
        ) : versions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: '#4b5563', fontSize: 15
          }}>
            <p style={{ margin: '0 0 16px' }}>No resume versions yet</p>
            <button
              onClick={() => navigate('/resume-agent')}
              style={{
                padding: '10px 20px', background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
              }}>
              Run the Resume Agent
            </button>
          </div>
        ) : (
          versions.map(v => (
            <VersionCard
              key={v.id}
              version={v}
              allVersions={versions}
              allJobs={allJobs}
              onDelete={handleDelete}
              onAttach={handleAttach}
            />
          ))
        )}
      </div>
    </div>
  );
}