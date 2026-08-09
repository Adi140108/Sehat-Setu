import React, { useState, useEffect } from 'react';
import type { Reminder } from '../../types';
import { getReminders, createReminder } from '../../services/firebase/firestoreService';
import { Bell, Plus, CheckCircle2 } from 'lucide-react';

export const RemindersManager: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<Reminder['type']>('FOLLOW_UP_VISIT');

  useEffect(() => {
    setReminders(getReminders('citizen-user'));
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const newR = createReminder({
      userId: 'citizen-user',
      type,
      title,
      dueAt: date,
      facilityName: 'District Hospital Kolar'
    });

    setReminders(prev => [newR, ...prev]);
    setTitle('');
    setDate('');
  };

  return (
    <div className="card-glass" style={{ marginTop: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={22} /> User-Created Healthcare Reminders
        </h3>
        <span className="badge badge-teal">Self-Managed</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Create personal reminders for upcoming facility follow-up visits, document submissions, or medicine refills.
      </p>

      {/* Create Form */}
      <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Reminder Description</label>
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Follow-up visit at PHC Kolar"
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="form-select">
            <option value="FOLLOW_UP_VISIT">Follow-up Hospital Visit</option>
            <option value="DOCUMENT_SUBMISSION">Document Submission</option>
            <option value="MEDICINE_REFILL">Jan Aushadhi Refill</option>
            <option value="CHECKUP">General Checkup</option>
          </select>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Target Date</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', minHeight: '42px' }}>
            <Plus size={16} /> Add Reminder
          </button>
        </div>
      </form>

      {/* Reminders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {reminders.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No reminders scheduled yet.
          </p>
        ) : (
          reminders.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{r.title}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  📅 Target Date: {r.dueAt} • <span className="badge badge-teal">{r.type.replace(/_/g, ' ')}</span>
                </p>
              </div>
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Active
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
