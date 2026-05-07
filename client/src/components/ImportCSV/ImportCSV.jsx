import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { createJob } from '../../api/jobs';

const REQUIRED_COLUMNS = ['company', 'role'];
const KNOWN_COLUMNS = ['company', 'role', 'status', 'salary_range', 'notes'];
const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected'];

const STEPS = {
  UPLOAD: 'upload',
  MAP: 'map',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  DONE: 'done',
};

export default function ImportCSV({ onClose, onImportDone }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const [imported, setImported] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const parseFile = (file) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields || [];
        setHeaders(cols);
        setRawData(result.data);

        // auto-map columns by fuzzy matching headers to known fields
        const autoMap = {};
        cols.forEach(col => {
          const lower = col.toLowerCase().trim();
          if (lower.includes('company')) autoMap[col] = 'company';
          else if (lower.includes('role') || lower.includes('title') || lower.includes('position')) autoMap[col] = 'role';
          else if (lower.includes('status')) autoMap[col] = 'status';
          else if (lower.includes('salary') || lower.includes('pay') || lower.includes('compensation') || lower.includes('ctc')) autoMap[col] = 'salary_range';
          else if (lower.includes('note')) autoMap[col] = 'notes';
          else autoMap[col] = 'notes_extra'; // unmapped → notes
        });
        setMapping(autoMap);
        setStep(STEPS.MAP);
      },
      error: () => setErrors(['Failed to parse file — make sure it is a valid CSV or Excel file']),
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setErrors(['Only CSV, XLSX, and XLS files are supported']);
      return;
    }
    setErrors([]);
    parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const buildPreview = () => {
    // validate mapping has required columns covered
    const mappedValues = Object.values(mapping);
    const missingRequired = REQUIRED_COLUMNS.filter(r => !mappedValues.includes(r));
    if (missingRequired.length > 0) {
      setErrors([`Please map at least: ${missingRequired.join(', ')}`]);
      return;
    }
    setErrors([]);

    const rows = rawData.slice(0, 5).map(row => buildJob(row));
    setPreview(rows);
    setStep(STEPS.PREVIEW);
  };

  const buildJob = (row) => {
    const job = {
      company: '',
      role: '',
      status: 'applied',
      salary_range: '',
      notes: '',
    };

    const extraParts = [];

    Object.entries(mapping).forEach(([csvCol, field]) => {
      const val = (row[csvCol] || '').toString().trim();
      if (!val) return;

      if (field === 'company') job.company = val;
      else if (field === 'role') job.role = val;
      else if (field === 'status') {
        const normalized = val.toLowerCase();
        job.status = VALID_STATUSES.find(s => normalized.includes(s)) || 'applied';
      }
      else if (field === 'salary_range') job.salary_range = val;
      else if (field === 'notes') job.notes = val;
      else if (field === 'notes_extra') {
        // unmapped columns go into notes as "Column: value"
        extraParts.push(`${csvCol}: ${val}`);
      }
      else if (field === 'skip') {
        // intentionally skipped
      }
    });

    if (extraParts.length > 0) {
      job.notes = [job.notes, extraParts.join(' | ')].filter(Boolean).join('\n');
    }

    return job;
  };

  const handleImport = async () => {
    setStep(STEPS.IMPORTING);
    setProgress(0);

    const allJobs = rawData.map(row => buildJob(row))
      .filter(j => j.company && j.role);

    let successCount = 0;
    const importErrors = [];

    for (let i = 0; i < allJobs.length; i++) {
      try {
        await createJob(allJobs[i]);
        successCount++;
      } catch {
        importErrors.push(`Row ${i + 2}: failed to import ${allJobs[i].company} — ${allJobs[i].role}`);
      }
      setProgress(Math.round(((i + 1) / allJobs.length) * 100));
    }

    setImported(successCount);
    setErrors(importErrors);
    setStep(STEPS.DONE);
    if (successCount > 0) onImportDone();
  };

  const fieldOptions = [
    { value: 'company', label: 'Company' },
    { value: 'role', label: 'Role / Job title' },
    { value: 'status', label: 'Status' },
    { value: 'salary_range', label: 'Salary range' },
    { value: 'notes', label: 'Notes' },
    { value: 'notes_extra', label: 'Add to notes (extra data)' },
    { value: 'skip', label: 'Skip this column' },
  ];

  const inputStyle = {
    padding: '7px 10px', borderRadius: 7,
    border: '1px solid #3d3d3d', background: '#1a1a1a',
    color: 'white', fontSize: 13, outline: 'none', width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
    }}>
      <div style={{
        background: '#2a2a2a', borderRadius: 14, padding: 28,
        width: '100%', maxWidth: 580, boxSizing: 'border-box',
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid #3d3d3d'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'white' }}>
              Import from CSV / Excel
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>
              {step === STEPS.UPLOAD && 'Upload your spreadsheet to get started'}
              {step === STEPS.MAP && `Mapping columns from "${fileName}"`}
              {step === STEPS.PREVIEW && 'Preview first 5 rows before importing'}
              {step === STEPS.IMPORTING && 'Importing your jobs...'}
              {step === STEPS.DONE && 'Import complete'}
            </p>
          </div>
          {step !== STEPS.IMPORTING && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#6b7280',
              fontSize: 22, cursor: 'pointer', lineHeight: 1
            }}>×</button>
          )}
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {['Upload', 'Map columns', 'Preview', 'Done'].map((label, i) => {
            const stepIndex = [STEPS.UPLOAD, STEPS.MAP, STEPS.PREVIEW, STEPS.DONE].indexOf(step);
            const isActive = i === stepIndex || (step === STEPS.IMPORTING && i === 2);
            const isDone = i < stepIndex || (step === STEPS.DONE && i < 3);
            return (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 3, borderRadius: 3, marginBottom: 5,
                  background: isDone ? '#2563eb' : isActive ? '#60a5fa' : '#3d3d3d',
                  transition: 'background 0.3s'
                }} />
                <span style={{ fontSize: 11, color: isActive || isDone ? '#9ca3af' : '#4b5563' }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── STEP: UPLOAD ── */}
        {step === STEPS.UPLOAD && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#2563eb' : '#3d3d3d'}`,
                borderRadius: 10, padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color 0.2s',
                background: dragOver ? 'rgba(37,99,235,0.07)' : 'transparent',
                marginBottom: 16
              }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <p style={{ margin: '0 0 6px', color: 'white', fontWeight: 500, fontSize: 15 }}>
                Drop your file here or click to browse
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Supports CSV, XLSX, XLS
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Template download hint */}
            <div style={{
              background: '#1e1e1e', borderRadius: 8, padding: 14,
              border: '1px solid #3d3d3d'
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: '#9ca3af' }}>
                Recommended column names for auto-mapping:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['company', 'role', 'status', 'salary_range', 'notes'].map(col => (
                  <span key={col} style={{
                    fontSize: 12, padding: '3px 10px', borderRadius: 20,
                    background: '#2a2a2a', color: '#60a5fa',
                    border: '1px solid #2563eb44', fontFamily: 'monospace'
                  }}>
                    {col}
                  </span>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4b5563' }}>
                Any extra columns will be mapped to notes automatically. Status values: applied, interview, offer, rejected.
              </p>
            </div>

            {errors.length > 0 && errors.map((e, i) => (
              <p key={i} style={{ color: '#f87171', fontSize: 13, marginTop: 10 }}>{e}</p>
            ))}
          </div>
        )}

        {/* ── STEP: MAP ── */}
        {step === STEPS.MAP && (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9ca3af' }}>
              We detected <strong style={{ color: 'white' }}>{headers.length} columns</strong> and <strong style={{ color: 'white' }}>{rawData.length} rows</strong>. Map each column to a field — we've auto-filled our best guess.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {headers.map(col => (
                <div key={col} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center', gap: 10
                }}>
                  {/* CSV column name */}
                  <div style={{
                    background: '#1e1e1e', border: '1px solid #3d3d3d',
                    borderRadius: 7, padding: '8px 12px',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>CSV column</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 500 }}>{col}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                      e.g. "{(rawData[0]?.[col] || '—').toString().slice(0, 22)}"
                    </p>
                  </div>

                  {/* Arrow */}
                  <span style={{ color: '#4b5563', fontSize: 16 }}>→</span>

                  {/* Mapping select */}
                  <div>
                    <select
                      value={mapping[col] || 'notes_extra'}
                      onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                      style={{
                        ...inputStyle,
                        color: mapping[col] === 'skip' ? '#6b7280' : 'white'
                      }}>
                      {fieldOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {errors.length > 0 && errors.map((e, i) => (
              <p key={i} style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{e}</p>
            ))}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(STEPS.UPLOAD)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  background: 'transparent', border: '1px solid #3d3d3d',
                  color: '#9ca3af', cursor: 'pointer', fontSize: 14
                }}>
                Back
              </button>
              <button
                onClick={buildPreview}
                style={{
                  flex: 2, padding: 10, borderRadius: 8,
                  background: '#2563eb', border: 'none',
                  color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}>
                Preview import →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PREVIEW ── */}
        {step === STEPS.PREVIEW && (
          <div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#9ca3af' }}>
              Showing first 5 rows of <strong style={{ color: 'white' }}>{rawData.length} total</strong>. Verify the data looks right before importing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {preview.map((job, i) => (
                <div key={i} style={{
                  background: '#1e1e1e', borderRadius: 8, padding: 12,
                  border: '1px solid #3d3d3d'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'white' }}>{job.role || '—'}</p>
                      <p style={{ margin: '2px 0 6px', fontSize: 13, color: '#9ca3af' }}>{job.company || '—'}</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 10px',
                      borderRadius: 20,
                      background: {
                        applied: 'rgba(37,99,235,0.2)', interview: 'rgba(217,119,6,0.2)',
                        offer: 'rgba(22,163,74,0.2)', rejected: 'rgba(220,38,38,0.2)'
                      }[job.status],
                      color: {
                        applied: '#60a5fa', interview: '#fbbf24',
                        offer: '#4ade80', rejected: '#f87171'
                      }[job.status]
                    }}>
                      {job.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {job.salary_range && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>💰 {job.salary_range}</span>
                    )}
                    {job.notes && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        📝 {job.notes.slice(0, 60)}{job.notes.length > 60 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 8, padding: 12, marginBottom: 16
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#93c5fd' }}>
                Ready to import <strong>{rawData.filter(r => r[Object.keys(mapping).find(k => mapping[k] === 'company')] && r[Object.keys(mapping).find(k => mapping[k] === 'role')]).length} valid jobs</strong> into your board.
                Rows missing company or role will be skipped.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(STEPS.MAP)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  background: 'transparent', border: '1px solid #3d3d3d',
                  color: '#9ca3af', cursor: 'pointer', fontSize: 14
                }}>
                Back
              </button>
              <button
                onClick={handleImport}
                style={{
                  flex: 2, padding: 10, borderRadius: 8,
                  background: '#16a34a', border: 'none',
                  color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}>
                Import {rawData.length} jobs →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: IMPORTING ── */}
        {step === STEPS.IMPORTING && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: 'white' }}>
              Importing your jobs...
            </p>
            <div style={{
              background: '#1e1e1e', borderRadius: 100,
              height: 10, overflow: 'hidden', marginBottom: 12
            }}>
              <div style={{
                height: '100%', borderRadius: 100,
                background: '#2563eb',
                width: `${progress}%`,
                transition: 'width 0.2s'
              }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{progress}% complete</p>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step === STEPS.DONE && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>
              {imported > 0 ? '✅' : '⚠️'}
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: 'white' }}>
              {imported > 0 ? `${imported} jobs imported!` : 'Nothing was imported'}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              {imported > 0
                ? 'Your board has been updated. You can edit any job from the board.'
                : 'Check that your file has company and role columns.'}
            </p>

            {errors.length > 0 && (
              <div style={{
                background: '#1e1e1e', borderRadius: 8, padding: 12,
                marginBottom: 16, textAlign: 'left',
                border: '1px solid #3d3d3d', maxHeight: 120, overflowY: 'auto'
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#f87171', fontWeight: 500 }}>
                  {errors.length} row(s) failed:
                </p>
                {errors.map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: 12, color: '#6b7280' }}>{e}</p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: 11, borderRadius: 8,
                background: '#2563eb', border: 'none',
                color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600
              }}>
              Go to board
            </button>
          </div>
        )}

      </div>
    </div>
  );
}