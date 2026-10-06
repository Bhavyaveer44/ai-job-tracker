import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveVersion } from '../api/resumeVault';
import { wordDiff } from '../utils/diff';
import toast from 'react-hot-toast';

const SCORE_COLOR = (s) =>
  s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

function DiffView({ before, after }) {
  const parts = wordDiff(before, after);
  return (
    <p style={{ fontSize: 12, lineHeight: 1.8, color: '#d1d5db', margin: 0 }}>
      {parts.map((p, i) => {
        if (p.type === 'same') return <span key={i}>{p.text}</span>;
        if (p.type === 'added') return (
          <span key={i} style={{
            background: 'rgba(22,163,74,0.2)', color: '#16a34a',
            borderRadius: 2, padding: '0 2px'
          }}>{p.text}</span>
        );
        return (
          <span key={i} style={{
            background: 'rgba(220,38,38,0.2)', color: '#dc2626',
            textDecoration: 'line-through', borderRadius: 2, padding: '0 2px'
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
      background: '#1e1e1e', borderRadius: 10,
      border: '1px solid #2d2d2d', padding: 16, marginBottom: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          background: '#2a2a2a', borderRadius: 8, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Iteration {iter.iteration}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: SCORE_COLOR(iter.score_before) }}>
            {iter.score_before}
          </span>
          <span style={{ fontSize: 14, color: '#4b5563' }}>→</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: SCORE_COLOR(iter.score_after) }}>
            {iter.score_after}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: improved > 0 ? '#16a34a' : '#dc2626'
          }}>
            {improved > 0 ? `+${improved}` : improved}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'white' }}>
            Rewrote: {iter.weakest_section}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{iter.reason}</p>
        </div>
      </div>

      <button
        onClick={() => setShowDiff(v => !v)}
        style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 6,
          background: 'transparent', border: '1px solid #3d3d3d',
          color: '#9ca3af', cursor: 'pointer', marginBottom: showDiff ? 10 : 0
        }}>
        {showDiff ? 'Hide diff' : 'Show word diff'}
      </button>

      {showDiff && (
        <div style={{
          background: '#111', borderRadius: 8, padding: 12,
          maxHeight: 240, overflowY: 'auto', marginTop: 8
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
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'white' }}>
            Resume Agent
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            AI iteratively rewrites your resume until it scores 80+ against the job description
          </p>
        </div>

        {/* Input area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* PDF upload */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
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
                border: `2px dashed ${dragOver ? '#2563eb' : '#3d3d3d'}`,
                borderRadius: 10, padding: '28px 16px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'rgba(37,99,235,0.06)' : '#1e1e1e',
                transition: 'all 0.15s', height: 140,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setResumeFile(e.target.files[0]); }} />
              {resumeFile ? (
                <>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#16a34a' }}>
                    {resumeFile.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Click to change</p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Drop resume PDF here</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#4b5563' }}>or click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* JD input */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              style={{
                width: '100%', height: 140, padding: 12, boxSizing: 'border-box',
                borderRadius: 10, border: '1px solid #3d3d3d',
                background: '#1e1e1e', color: 'white', fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.5
              }}
            />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          style={{
            width: '100%', padding: 12, borderRadius: 8,
            background: running ? '#1e3a5f' : '#2563eb',
            color: running ? '#60a5fa' : 'white',
            border: 'none', cursor: running ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 600, marginBottom: 28, transition: 'all 0.15s'
          }}>
          {running ? 'Agent is running...' : 'Run Resume Agent'}
        </button>

        {/* Live iteration log */}
        {(iterations.length > 0 || running) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'white' }}>
                Agent log
              </h3>
              {running && (
                <span style={{
                  fontSize: 12, padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(37,99,235,0.15)', color: '#60a5fa',
                  border: '1px solid rgba(37,99,235,0.2)'
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
            background: '#1e1e1e', borderRadius: 12,
            border: '1px solid #2d2d2d', padding: 20
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 500, color: 'white' }}>
              Final result
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Start score</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: SCORE_COLOR(finalResult.start_score) }}>
                  {finalResult.start_score}
                </p>
              </div>
              <div style={{ fontSize: 20, color: '#4b5563' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Final score</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: SCORE_COLOR(finalResult.final_score) }}>
                  {finalResult.final_score}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Improvement</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#16a34a' }}>
                  +{finalResult.final_score - finalResult.start_score}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Iterations</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#2563eb' }}>
                  {finalResult.total_iterations}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSaveModal(true)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  background: '#2563eb', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500
                }}>
                Save as Resume Version
              </button>
              <button
                onClick={() => navigate('/resume-vault')}
                style={{
                  padding: '10px 18px', borderRadius: 8,
                  background: 'transparent', border: '1px solid #3d3d3d',
                  color: '#9ca3af', cursor: 'pointer', fontSize: 14
                }}>
                View Vault
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            background: '#1e1e1e', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 400, border: '1px solid #2d2d2d'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'white' }}>
              Save to Resume Vault
            </h3>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
              Version name
            </label>
            <input
              value={versionName}
              onChange={e => setVersionName(e.target.value)}
              placeholder="e.g. SWE Startups v2, PM Roles v1"
              style={{
                width: '100%', padding: 10, boxSizing: 'border-box',
                borderRadius: 8, border: '1px solid #3d3d3d',
                background: '#111', color: 'white', fontSize: 14,
                marginBottom: 16, outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, padding: 10, borderRadius: 8,
                background: '#2563eb', color: 'white',
                border: 'none', cursor: 'pointer', fontSize: 14
              }}>
                {saving ? 'Saving...' : 'Save version'}
              </button>
              <button onClick={() => setShowSaveModal(false)} style={{
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
    </div>
  );
}