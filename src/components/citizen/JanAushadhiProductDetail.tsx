import React, { useState } from 'react';
import type { JanaushadhiProduct } from '../../types';
import { 
  Building2, 
  Volume2, 
  Share2, 
  AlertTriangle
} from 'lucide-react';

interface JanAushadhiProductDetailProps {
  product: JanaushadhiProduct;
  matchStatus?: string;
  onFindKendras: () => void;
  onBack: () => void;
}

export const JanAushadhiProductDetail: React.FC<JanAushadhiProductDetailProps> = ({
  product,
  matchStatus,
  onFindKendras,
  onBack
}) => {
  const [copied, setCopied] = useState(false);

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const text = `${product.productName}, active ingredient ${product.activeIngredient || 'not listed'}, strength ${product.strength || 'not listed'}, catalog price is ${product.mrp} rupees.`;
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  const handleShare = async () => {
    const shareText = `Jan Aushadhi Product: ${product.productName}\nGeneric Ingredient: ${product.activeIngredient || 'N/A'}\nStrength: ${product.strength || 'N/A'}\nCatalog MRP: ₹${product.mrp}\nSource: PMBI Bureau of Pharma PSUs of India`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.productName,
          text: shareText,
        });
      } catch (err) {
        console.warn('Share rejected or failed:', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="card-glass animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
        <div>
          {matchStatus && (
            <span className="badge badge-teal" style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '0.78rem', marginBottom: '6px', display: 'inline-block' }}>
              {matchStatus.replace(/_/g, ' ')}
            </span>
          )}
          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
            {product.productName}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Category: {product.category || 'Generic Medicine'}
          </p>
        </div>
      </div>

      {/* Catalog Details Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Active Ingredient</span>
          <strong style={{ fontSize: '0.925rem' }}>{product.activeIngredient || 'N/A'}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Strength</span>
          <strong style={{ fontSize: '0.925rem' }}>{product.strength || 'N/A'}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Dosage Form</span>
          <strong style={{ fontSize: '0.925rem' }}>{product.dosageForm || 'Tablets'}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Pack Size</span>
          <strong style={{ fontSize: '0.925rem' }}>{product.packSize || "10's"}</strong>
        </div>
      </div>

      {/* Pricing and Provenance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '14px 0' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jan Aushadhi Catalog MRP</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
            ₹{product.mrp}
          </h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div>Source: {product.source?.sourceName || 'PMBI List'}</div>
          <div>Date: {product.source?.sourceDate || '2026-08-01'}</div>
          <div>Verified: {product.lastVerifiedAt ? new Date(product.lastVerifiedAt).toLocaleDateString() : '2026-08-11'}</div>
        </div>
      </div>

      {/* Prominent Clinical Safety Warnings */}
      <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '12px 16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emergency)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Medical Safety Notice:</strong> Ask a qualified healthcare professional or pharmacist before changing or substituting a medicine. Sehat Setu can show catalog information, but a qualified healthcare professional/pharmacist should confirm whether a substitution is appropriate.
        </div>
      </div>

      {/* Actions Drawer */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
        <button 
          onClick={onFindKendras}
          className="btn btn-primary"
          style={{ flex: 2, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Building2 size={18} /> Find Nearby Kendra
        </button>

        <button 
          onClick={handleSpeak}
          className="btn btn-outline"
          style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          title="Listen to details"
        >
          <Volume2 size={18} /> Listen
        </button>

        <button 
          onClick={handleShare}
          className="btn btn-outline"
          style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Share2 size={18} /> {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      <button onClick={onBack} className="btn btn-secondary" style={{ width: '100%', minHeight: '44px' }}>
        Back to Search
      </button>

    </div>
  );
};
