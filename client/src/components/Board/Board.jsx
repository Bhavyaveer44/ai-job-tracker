import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getJobs, updateJob } from '../../api/jobs';
import JobCard from '../JobCard/JobCard';
import AddJobModal from '../AddJobModal/AddJobModal';

const COLUMNS = [
  { id: 'applied',   label: 'Applied',   color: '#2563eb' },
  { id: 'interview', label: 'Interview', color: '#d97706' },
  { id: 'offer',     label: 'Offer',     color: '#16a34a' },
  { id: 'rejected',  label: 'Rejected',  color: '#dc2626' },
];

export default function Board() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const onDragEnd = async (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStatus = destination.droppableId;

    // optimistic update — update UI immediately, then sync to backend
    setJobs(prev =>
      prev.map(j => j.id === draggableId ? { ...j, status: newStatus } : j)
    );

    await updateJob(draggableId, { status: newStatus });
  };

  const handleJobAdded = (newJob) => setJobs(prev => [newJob, ...prev]);

  const handleJobUpdated = (updatedJob) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleJobDeleted = (id) => setJobs(prev => prev.filter(j => j.id !== id));

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {COLUMNS.map(col => (
            <div key={col.id} style={{ fontSize: 13, color: '#6b7280' }}>
              <span style={{ fontWeight: 600, color: col.color }}>
                {jobs.filter(j => j.status === col.id).length}
              </span>
              {' '}{col.label}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '8px 16px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500
          }}>
          + Add job
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => (
            <div key={col.id} style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{col.label}</h3>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
                  {jobs.filter(j => j.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200,
                      background: snapshot.isDraggingOver ? '#eff6ff' : 'transparent',
                      borderRadius: 8, transition: 'background 0.2s', padding: 4
                    }}>
                    {jobs
                      .filter(j => j.status === col.id)
                      .map((job, index) => (
                        <Draggable key={job.id} draggableId={job.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}>
                              <JobCard
                                job={job}
                                onDelete={handleJobDeleted}
                                onUpdate={handleJobUpdated}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <AddJobModal
          onClose={() => setShowModal(false)}
          onJobAdded={handleJobAdded}
        />
      )}
    </div>
  );
}