import React, { useState, useEffect } from 'react';
import { getAnalyticsSummary } from '../../services/firebase/firestoreService';
import type { AnalyticsSummary } from '../../types';
import { DEMO_FACILITIES } from '../../data/facilities';
import { DEMO_SCHEMES } from '../../data/schemes';
import { Shield, Building2, FileText, BarChart2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary>(() => getAnalyticsSummary());
  const [activeTab, setActiveTab] = useState<'METRICS' | 'FACILITIES' | 'SCHEMES'>('METRICS');

  useEffect(() => {
    setSummary(getAnalyticsSummary());
  }, []);

  return (
    <div style={{ marginTop: '16px' }}>
      
      {/* Top Banner */}
      <div className="card-glass" style={{ marginBottom: '16px', background: 'var(--primary-light)', borderColor: 'var(--primary-teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={24} /> Sehat Setu Public Health Analytics & Administration
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Anonymized aggregate health navigation metrics and facility database management.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setActiveTab('METRICS')}
              className={`btn ${activeTab === 'METRICS' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '34px' }}
            >
              <BarChart2 size={14} /> Analytics Metrics
            </button>
            <button 
              onClick={() => setActiveTab('FACILITIES')}
              className={`btn ${activeTab === 'FACILITIES' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '34px' }}
            >
              <Building2 size={14} /> Facilities DB ({DEMO_FACILITIES.length})
            </button>
            <button 
              onClick={() => setActiveTab('SCHEMES')}
              className={`btn ${activeTab === 'SCHEMES' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '34px' }}
            >
              <FileText size={14} /> Health Schemes ({DEMO_SCHEMES.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'METRICS' && (
        <div>
          {/* Key KPI Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            
            <div className="card-glass" style={{ borderLeft: '4px solid #0d5c75' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL CITIZENS SERVED</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-teal)', margin: '4px 0 0 0' }}>
                {summary.totalUsers.toLocaleString()}
              </h3>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid #d32f2f' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emergency-red)' }}>EMERGENCY CASES ROUTED</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emergency-red)', margin: '4px 0 0 0' }}>
                {summary.emergencyRequests}
              </h3>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid #2e7d32' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success-green)' }}>FACILITY REFERRALS</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-green)', margin: '4px 0 0 0' }}>
                {summary.successfulReferrals}
              </h3>
            </div>

            <div className="card-glass" style={{ borderLeft: '4px solid #e67e22' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e67e22' }}>SCHEME QUERIES</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e67e22', margin: '4px 0 0 0' }}>
                {summary.schemeQueries}
              </h3>
            </div>

          </div>

          {/* Breakdown Charts & Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Intent Breakdown */}
            <div className="card-glass">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '12px' }}>
                📊 Queries by Intent Category
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(summary.intentBreakdown).map(([intent, count]) => (
                  <div key={intent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{intent}</span>
                    <span className="badge badge-teal">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Distribution */}
            <div className="card-glass">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '12px' }}>
                🌐 Usage by Language
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(summary.languageDistribution).map(([lang, count]) => (
                  <div key={lang} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Language ({lang})</span>
                    <span className="badge badge-success">{count} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Districts */}
            <div className="card-glass">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '12px' }}>
                📍 Top Searched Districts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.topSearchedDistricts.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.district}</span>
                    <span className="badge badge-teal">{item.count} searches</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'FACILITIES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEMO_FACILITIES.map(f => (
            <div key={f.id} className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ fontSize: '1rem' }}>{f.name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {f.address} | Source: {f.dataSource}</p>
              </div>
              <span className="badge badge-success">Verified {f.lastVerifiedDate}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'SCHEMES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEMO_SCHEMES.map(s => (
            <div key={s.id} className="card-glass">
              <strong style={{ fontSize: '1rem', color: 'var(--primary-teal)' }}>{s.name}</strong>
              <p style={{ fontSize: '0.85rem', color: '#444', marginTop: '4px' }}>{s.description}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Official Ref: {s.officialSource}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
