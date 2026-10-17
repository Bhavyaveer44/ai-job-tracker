import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveVersion } from '../api/resumeVault';
import { wordDiff } from '../utils/diff';
import toast from 'react-hot-toast';

const SCORE_COLOR = (s) =>
  s >= 70 ? '#a78bfa' : s >= 50 ? '#8b5cf6' : '#c4b5fd';

function DiffView({ before, after }) {
  const parts = wordDiff(before, after);
  return (
    <p style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
      {parts.map((p, i) => {
        if (p.type === 'same') return <span key={i}>{p.text}</span>;
        if (p.type === 'added') return (
          <span key={i} style={{
            background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa',
            borderRadius: 3, padding: '0 3px'
          }}>{p.text}</span>
        );
        return (
          <span key={i} style={{
            background: 'rgba(196, 181, 253, 0.2)', color: '#c4b5fd',
            textDecoration: 'line-through', borderRadius: 3, padding: '0 3px'
          }}>{p.text}</span>
        );
      })}
    </p>
  );
}

function IterationCard({ iter }) {
  const [showDiff, setShowDiff] = useState(false);
  const improved = iter.score_after - iter.score_before;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: 20,
      marginBottom: 16,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 10,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(10px)'
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
            Iteration {iter.iteration}
          </span>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: SCORE_COLOR(iter.score_before),
            letterSpacing: '-0.5px'
          }}>
            {iter.score_before}
          </span>
          <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.3)' }}>→</span>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: SCORE_COLOR(iter.score_after),
            letterSpacing: '-0.5px'
          }}>
            {iter.score_after}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: improved > 0 ? '#a78bfa' : '#c4b5fd'
          }}>
            {improved > 0 ? `+${improved}` : improved}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>
            Rewrote: {iter.weakest_section}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>{iter.reason}</p>
        </div>
      </div>

      <button
        onClick={() => setShowDiff(v => !v)}
        style={{
          fontSize: 12,
          padding: '6px 14px',
          borderRadius: 8,
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          marginBottom: showDiff ? 12 : 0,
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
        {showDiff ? 'Hide diff' : 'Show word diff'}
      </button>

      {showDiff && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 10,
          padding: 16,
          maxHeight: 280,
          overflowY: 'auto',
          marginTop: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <DiffView before={iter.resume_before} after={iter.resume_after} />
        </div>
      )}
    </div>
  );
}

export default function ResumeAgent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState([]);
  const [finalResult, setFinalResult] = useState(null);

  // save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [saving, setSaving] = useState(false);

  const fileRef = useRef();

  const handleRun = async () => {
    if (!resumeFile) return toast.error('Upload your resume PDF first');
    if (!jobDescription.trim()) return toast.error('Paste a job description first');

    setRunning(true);
    setIterations([]);
    setFinalResult(null);

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/resume-agent/run`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Agent failed');
      }

      // read NDJSON stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'iteration') {
              setIterations(prev => [...prev, msg.data]);
            } else if (msg.type === 'done') {
              setFinalResult(msg.data);
            } else if (msg.type === 'error') {
              toast.error(msg.data.message);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      toast.error(err.message);
    }

    setRunning(false);
  };

  const handleSave = async () => {
    if (!versionName.trim()) return toast.error('Give this version a name');
    if (!finalResult || !finalResult.final_resume) {
      toast.error('No resume result to save');
      return;
    }
    setSaving(true);
    try {
      await saveVersion({
        name: versionName.trim(),
        content: finalResult.final_resume,
        ats_score: finalResult.final_score,
        iteration_log: iterations,
      });
      toast.success('Saved to Resume Vault');
      setShowSaveModal(false);
      setVersionName('');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Save failed: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

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

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            margin: '0 0 8px',
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.5px'
          }}>
            Resume Agent
          </h2>
          <p style={{
            margin: 0,
            fontSize: 15,
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            AI iteratively rewrites your resume until it scores 80+ against the job description
          </p>
        </div>

        {/* Input area */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 24
        }}>
          {/* PDF upload */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 8,
              fontWeight: 500
            }}>
              Your resume (PDF)
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f?.type === 'application/pdf') setResumeFile(f);
                else toast.error('PDF only');
              }}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 12,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setResumeFile(e.target.files[0]); }} />
              {resumeFile ? (
                <>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#a78bfa'
                  }}>
                    {resumeFile.name}
                  </p>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>Click to change</p>
                </>
              ) : (
                <>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>Drop resume PDF here</p>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.3)'
                  }}>or click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* JD input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 8,
              fontWeight: 500
            }}>
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              style={{
                width: '100%',
                height: 160,
                padding: 14,
                boxSizing: 'border-box',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                lineHeight: 1.6,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            background: running
              ? 'rgba(99, 102, 241, 0.5)'
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: running ? 'rgba(255, 255, 255, 0.7)' : '#fff',
            border: 'none',
            cursor: running ? 'not-allowed' : 'pointer',
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 32,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: running
              ? 'none'
              : '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!running) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
          }}
        >
          {running ? 'Agent is running...' : 'Run Resume Agent'}
        </button>

        {/* Live iteration log */}
        {(iterations.length > 0 || running) && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h3 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: '#fff'
              }}>
                Agent log
              </h3>
              {running && (
                <span style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontWeight: 500
                }}>Running...</span>
              )}
            </div>
            {iterations.map(iter => (
              <IterationCard key={iter.iteration} iter={iter} />
            ))}
          </div>
        )}

        {/* Final summary */}
        {finalResult && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: 28
          }}>
            <h3 style={{
              margin: '0 0 24px',
              fontSize: 18,
              fontWeight: 600,
              color: '#fff'
            }}>
              Final result
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 24
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Start score</p>
                <p style={{
                  margin: 0,
                  fontSize: 36,
                  fontWeight: 700,
                  color: SCORE_COLOR(finalResult.start_score),
                  letterSpacing: '-1px'
                }}>
                  {finalResult.start_score}
                </p>
              </div>
              <div style={{
                fontSize: 24,
                color: 'rgba(255, 255, 255, 0.2)'
              }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Final score</p>
                <p style={{
                  margin: 0,
                  fontSize: 36,
                  fontWeight: 700,
                  color: SCORE_COLOR(finalResult.final_score),
                  letterSpacing: '-1px'
                }}>
                  {finalResult.final_score}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Improvement</p>
                <p style={{
                  margin: 0,
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#a78bfa',
                  letterSpacing: '-1px'
                }}>
                  +{finalResult.final_score - finalResult.start_score}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Iterations</p>
                <p style={{
                  margin: 0,
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#6366f1',
                  letterSpacing: '-1px'
                }}>
                  {finalResult.total_iterations}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSaveModal(true)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  border: 'none',
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
                Save as Resume Version
              </button>
              <button
                onClick={() => navigate('/resume-vault')}
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
                View Vault
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSaveModal && (
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
            maxWidth: 420,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 600,
              color: '#fff'
            }}>
              Save to Resume Vault
            </h3>
            <label style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 8,
              fontWeight: 500
            }}>
              Version name
            </label>
            <input
              value={versionName}
              onChange={e => setVersionName(e.target.value)}
              placeholder="e.g. SWE Startups v2, PM Roles v1"
              style={{
                width: '100%',
                padding: 12,
                boxSizing: 'border-box',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                marginBottom: 20,
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
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: saving
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: saving
                    ? 'none'
                    : '0 4px 20px rgba(99, 102, 241, 0.3)'
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
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
    </div>
  );
}