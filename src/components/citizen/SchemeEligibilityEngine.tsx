import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { HealthScheme } from '../../types';
import { evaluateAllSchemes } from '../../services/schemes/schemeEngine';
import type { EligibilityResult } from '../../services/schemes/schemeEngine';
import { DocumentChecklist } from './DocumentChecklist';
import { ShieldCheck, CheckCircle2, AlertCircle, HelpCircle, FileText, ExternalLink } from 'lucide-react';

export const SchemeEligibilityEngine: React.FC = () => {
  const { t } = useLanguage();
  const [age, setAge] = useState<number | ''>(45);
  const [state, setState] = useState('Karnataka');
  const [incomeCategory, setIncomeCategory] = useState<'BPL' | 'APL' | 'EWS' | 'NONE'>('BPL');
  const [selectedSchemeForDocs, setSelectedSchemeForDocs] = useState<HealthScheme | null>(null);

  const evaluationResults: EligibilityResult[] = evaluateAllSchemes({
    age: typeof age === 'number' ? age : undefined,
    state,
    incomeCategory
  });

  return (
    <div style={{ marginTop: '16px' }}>
      
      {/* Input Parameters Box */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={22} /> {t.checkSchemes}
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Enter minimal household details to evaluate eligibility for government health schemes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          
          <div className="form-group">
            <label className="form-label">Age of Beneficiary</label>
            <input 
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
              className="form-input"
              placeholder="e.g. 70"
            />
          </div>

          <div className="form-group">
            <label className="form-label">State of Residence</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className="form-select">
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Other State">Other State</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ration Card / Income Status</label>
            <select value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value as any)} className="form-select">
              <option value="BPL">BPL Card / Antyodaya</option>
              <option value="EWS">Economically Weaker Section (EWS)</option>
              <option value="APL">APL Card</option>
              <option value="NONE">General / None</option>
            </select>
          </div>

        </div>
      </div>

      {/* Selected Document Checklist View */}
      {selectedSchemeForDocs ? (
        <div>
          <button 
            onClick={() => setSelectedSchemeForDocs(null)} 
            className="btn btn-outline"
            style={{ marginBottom: '12px', fontSize: '0.85rem' }}
          >
            ← Back to Schemes List
          </button>
          <DocumentChecklist scheme={selectedSchemeForDocs} />
        </div>
      ) : (
        /* Evaluation Results List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {evaluationResults.map((result) => {
            const { scheme, status, matchedCriteria, missingCriteria, disclaimers } = result;

            return (
              <div key={scheme.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Scheme Header & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-teal)' }}>
                      {scheme.shortName}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {scheme.description}
                    </p>
                  </div>

                  <div>
                    {status === 'LIKELY_ELIGIBLE' && (
                      <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        <CheckCircle2 size={14} /> {t.likelyEligible}
                      </span>
                    )}

                    {status === 'MORE_INFO_REQUIRED' && (
                      <span className="badge badge-teal" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        <HelpCircle size={14} /> {t.moreInfoRequired}
                      </span>
                    )}

                    {status === 'NOT_MATCHING_RULES' && (
                      <span className="badge badge-emergency" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        <AlertCircle size={14} /> {t.notMatchingRules}
                      </span>
                    )}
                  </div>
                </div>

                {/* Coverage & Target Group Details */}
                <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <p><strong>Coverage Benefit:</strong> {scheme.coverageDetails}</p>
                  <p style={{ marginTop: '4px' }}><strong>Target Group:</strong> {scheme.targetGroup}</p>
                </div>

                {/* Criteria Match Details */}
                <div style={{ fontSize: '0.82rem' }}>
                  {matchedCriteria.length > 0 && (
                    <div style={{ color: 'var(--success-green)', fontWeight: 600 }}>
                      ✓ Matches: {matchedCriteria.join(' | ')}
                    </div>
                  )}
                  {missingCriteria.length > 0 && (
                    <div style={{ color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                      ⚠️ Info needed: {missingCriteria.join(' | ')}
                    </div>
                  )}
                </div>

                {/* Status Disclaimer Label */}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  * {disclaimers}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setSelectedSchemeForDocs(scheme)}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '34px' }}
                  >
                    <FileText size={14} /> View Required Documents
                  </button>

                  <a 
                    href={scheme.officialSource}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '34px' }}
                  >
                    Official Details <ExternalLink size={14} />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
