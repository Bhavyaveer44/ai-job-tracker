import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVersions, deleteVersion, getJobsForVersion } from '../api/resumeVault';
import { getJobs } from '../api/jobs';
import { attachResumeToJob } from '../api/resumeVault';
import toast from 'react-hot-toast';

const SCORE_COLOR = (s) =>
  !s ? 'rgba(255, 255, 255, 0.3)' : s >= 70 ? '#a78bfa' : s >= 50 ? '#8b5cf6' : '#c4b5fd';

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
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: 24,
        marginBottom: 16,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#fff'
              }}>
                {version.name}
              </h3>
              {version.ats_score && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(167, 139, 250, 0.15)',
                  color: SCORE_COLOR(version.ats_score),
                  border: `1px solid ${SCORE_COLOR(version.ats_score)}33`
                }}>
                  ATS {version.ats_score}
                </span>
              )}
            </div>
            <p style={{
              margin: '0 0 8px',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              Created {formatDate(version.created_at)}
              {parent && (
                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}> · From: {parent.name}</span>
              )}
            </p>
            {versionJobs.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8
              }}>
                {versionJobs.map(j => (
                  <span key={j.id} style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
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
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              {expanded ? 'Hide' : 'View'}
            </button>
            <button
              onClick={() => setShowAttachModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(99, 102, 241, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(99, 102, 241, 0.15)';
              }}
            >
              Use for job
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this version?')) onDelete(version.id);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#c4b5fd',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(196, 181, 253, 0.1)';
                e.target.style.borderColor = 'rgba(196, 181, 253, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Expanded: full resume + agent log */}
        {expanded && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 12,
              padding: 16,
              maxHeight: 320,
              overflowY: 'auto',
              marginBottom: 16,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <pre style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.7)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                fontFamily: 'inherit'
              }}>
                {version.content}
              </pre>
            </div>

            {version.iteration_log?.length > 0 && (
              <div>
                <p style={{
                  margin: '0 0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  Agent iterations ({version.iteration_log.length})
                </p>
                {version.iteration_log.map((iter, i) => (
                  <div key={i} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{
                      fontSize: 12,
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 500
                    }}>#{iter.iteration}</span>
                    <span style={{
                      fontSize: 13,
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      Rewrote <strong style={{ color: '#fff' }}>{iter.weakest_section}</strong>
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      <span style={{ color: SCORE_COLOR(iter.score_before) }}>{iter.score_before}</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }}>→</span>
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
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            background: 'rgba(15, 15, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 440,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 600,
              color: '#fff'
            }}>
              Attach "{version.name}" to a job
            </h3>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 8,
              fontWeight: 500
            }}>
              Select job application
            </label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: selectedJobId ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                fontSize: 14,
                marginBottom: 20,
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <option value="">Choose a job...</option>
              {allJobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.role} @ {j.company} — {j.status}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleAttach}
                disabled={attaching}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: attaching
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: attaching ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: attaching
                    ? 'none'
                    : '0 4px 20px rgba(99, 102, 241, 0.3)'
                }}
              >
                {attaching ? 'Attaching...' : 'Attach resume'}
              </button>
              <button
                onClick={() => setShowAttachModal(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
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
  const location = useLocation();
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
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

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32
        }}>
          <div>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 32,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.5px'
            }}>
              Resume Vault
            </h2>
            <p style={{
              margin: 0,
              fontSize: 15,
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={() => navigate('/resume-agent')}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)';
            }}
          >
            + Create with Agent
          </button>
        </div>

        {loading ? (
          <p style={{
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            padding: '80px 0',
            fontSize: 15
          }}>
            Loading vault...
          </p>
        ) : versions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '120px 0',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 15
          }}>
            <p style={{ margin: '0 0 20px' }}>No resume versions yet</p>
            <button
              onClick={() => navigate('/resume-agent')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)';
              }}
            >
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