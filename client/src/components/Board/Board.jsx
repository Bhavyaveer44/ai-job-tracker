import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { useDebounce } from 'use-debounce';

import { getJobs, updateJob } from '../../api/jobs';
import JobCard from '../JobCard/JobCard';
import AddJobModal from '../AddJobModal/AddJobModal';
import ImportCSV from '../ImportCSV/ImportCSV';

const COLUMNS = [
  {
    id: 'applied',
    label: 'Applied',
    color: '#2563eb',
    border: '#2563eb',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    color: '#dc2626',
    border: '#dc2626',
  },
  {
    id: 'interview',
    label: 'Interview',
    color: '#d97706',
    border: '#d97706',
  },
  {
    id: 'offer',
    label: 'Offer',
    color: '#16a34a',
    border: '#16a34a',
  },
];

const StatCard = ({ label, value, color }) => (
  <div
    style={{
      background: '#2a2a2a',
      borderRadius: 12,
      padding: '18px 22px',
      border: '1px solid #3d3d3d',
      flex: 1,
    }}
  >
    <p
      style={{
        margin: '0 0 8px',
        fontSize: 12,
        color: '#6b7280',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </p>

    <p
      style={{
        margin: 0,
        fontSize: 32,
        fontWeight: 700,
        color: color || 'white',
      }}
    >
      {value}
    </p>
  </div>
);

export default function Board() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const onDragEnd = async (result) => {
    const { draggableId, destination, source } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId) {
      return;
    }

    const newStatus = destination.droppableId;

    // Optimistic UI update
    setJobs((prev) =>
      prev.map((job) =>
        String(job.id) === draggableId
          ? { ...job, status: newStatus }
          : job
      )
    );

    try {
      await updateJob(draggableId, {
        status: newStatus,
      });

      toast.success(`Moved to ${newStatus}`);
    } catch (error) {
      console.error(error);

      toast.error('Failed to update status');

      // Rollback
      setJobs((prev) =>
        prev.map((job) =>
          String(job.id) === draggableId
            ? { ...job, status: source.droppableId }
            : job
        )
      );
    }
  };

  const handleJobAdded = (newJob) => {
    setJobs((prev) => [newJob, ...prev]);
    toast.success('Job added');
  };

  const handleJobDeleted = (id) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
    toast.success('Job deleted');
  };

  const handleJobUpdated = (updatedJob) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === updatedJob.id ? updatedJob : job
      )
    );

    toast.success('Job updated');
  };

  const total = jobs.length;

  const interviews = jobs.filter(
    (job) => job.status === 'interview'
  ).length;

  const offers = jobs.filter(
    (job) => job.status === 'offer'
  ).length;

  const interviewRate =
    total > 0
      ? Math.round(((interviews + offers) / total) * 100)
      : 0;

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.role
        ?.toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      job.company
        ?.toLowerCase()
        .includes(debouncedSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isFiltering =
    debouncedSearch !== '' || statusFilter !== 'all';

  const handleImportDone = async () => {
    try {
      const data = await getJobs();
      setJobs(data);

      toast.success('Jobs imported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to refresh jobs');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 300,
        }}
      >
        <p style={{ color: '#6b7280' }}>
          Loading your jobs...
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          label="Total Applied"
          value={total}
          color="#2563eb"
        />

        <StatCard
          label="Interviews"
          value={interviews}
          color="#d97706"
        />

        <StatCard
          label="Interview Rate"
          value={`${interviewRate}%`}
          color={
            interviewRate >= 20
              ? '#16a34a'
              : '#d97706'
          }
        />

        <StatCard
          label="Offers"
          value={offers}
          color="#16a34a"
        />
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Search by role or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 220,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #3d3d3d',
              background: '#2a2a2a',
              color: 'white',
              fontSize: 14,
              outline: 'none',
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #3d3d3d',
              background: '#2a2a2a',
              color:
                statusFilter === 'all'
                  ? '#9ca3af'
                  : 'white',
              fontSize: 14,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All statuses</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #3d3d3d',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #3d3d3d',
              background: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ↑ Import CSV
          </button>

          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '9px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            + Add Job
          </button>
        </div>

        {/* Active Filters */}
        {isFiltering && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              Showing {filteredJobs.length} of{' '}
              {jobs.length} jobs
            </span>

            {debouncedSearch && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 10px',
                  borderRadius: 20,
                  background: '#1e3a5f',
                  color: '#60a5fa',
                  border: '1px solid #1e40af',
                }}
              >
                "{debouncedSearch}"
              </span>
            )}

            {statusFilter !== 'all' && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 10px',
                  borderRadius: 20,
                  background: '#1a2e1a',
                  color: '#4ade80',
                  border: '1px solid #166534',
                }}
              >
                {statusFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 16,
            alignItems: 'start',
            overflowX: 'auto',
          }}
        >
          {COLUMNS.map((col) => {
            const columnJobs = filteredJobs.filter(
              (job) => job.status === col.id
            );

            return (
              <div
                key={col.id}
                style={{
                  background: '#2a2a2a',
                  borderRadius: 12,
                  border: '1px solid #3d3d3d',
                  borderTop: `3px solid ${col.border}`,
                  padding: 14,
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: col.color,
                    }}
                  />

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'white',
                    }}
                  >
                    {col.label}
                  </h3>

                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      color: '#00ff3c',
                      background: '#211f1f',
                      padding: '1px 8px',
                      borderRadius: 20,
                    }}
                  >
                    {columnJobs.length}
                  </span>
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: 200,
                        maxHeight:
                          'calc(100vh - 320px)',
                        overflowY: 'auto',
                        background:
                          snapshot.isDraggingOver
                            ? '#333'
                            : 'transparent',
                        borderRadius: 8,
                        transition:
                          'background 0.2s ease',
                        padding: 2,
                        scrollbarWidth: 'thin',
                        scrollbarColor:
                          '#3d3d3d transparent',
                      }}
                    >
                      {columnJobs.length === 0 && (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: '#ffffff',
                            fontSize: 13,
                          }}
                        >
                          {isFiltering
                            ? 'No matches'
                            : 'No jobs here'}
                        </div>
                      )}

                      {columnJobs.map((job, index) => (
                        <Draggable
                          key={String(job.id)}
                          draggableId={String(job.id)}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <JobCard
                                job={job}
                                onDelete={
                                  handleJobDeleted
                                }
                                onUpdate={
                                  handleJobUpdated
                                }
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
            );
          })}
        </div>
      </DragDropContext>

      {/* Add Job Modal */}
      {showModal && (
        <AddJobModal
          onClose={() => setShowModal(false)}
          onJobAdded={handleJobAdded}
        />
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportCSV
          onClose={() => setShowImport(false)}
          onImportDone={handleImportDone}
        />
      )}
    </div>
  );
}