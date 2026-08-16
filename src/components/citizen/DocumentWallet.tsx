import React, { useState, useEffect } from 'react';
import type { UserDocument } from '../../types';
import { 
  getUserDocuments, 
  saveUserDocument, 
  deleteUserDocument 
} from '../../services/firebase/firestoreService';
import { uploadImageToCloudinary } from '../../services/cloudinary/cloudinaryService';
import { auth } from '../../services/firebase/firebase';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Loader
} from 'lucide-react';

interface DocumentWalletProps {
  onBack: () => void;
}

export const DocumentWallet: React.FC<DocumentWalletProps> = ({ onBack }) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [docType, setDocType] = useState<UserDocument['documentType']>('AYUSHMAN_CARD');
  const [displayName, setDisplayName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activePreviewDoc, setActivePreviewDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);
    const docs = await getUserDocuments(user.uid);
    setDocuments(docs);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) return;

    // Enforce 5MB limit locally
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit. Please select a smaller file.');
      return;
    }

    // Enforce common formats
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Invalid format. Please select JPEG, PNG, or WebP.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !displayName.trim()) return;

    setUploadProgress(0);
    setUploadError('');

    try {
      // Direct direct client upload to Cloudinary health-scoped folder
      const cloudinaryRes = await uploadImageToCloudinary(
        selectedFile, 
        (progress) => setUploadProgress(progress),
        'sehat-setu/documents'
      );

      const docId = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;
      const newDoc: Omit<UserDocument, 'userId'> = {
        documentId: docId,
        documentType: docType,
        displayName: displayName.trim(),
        fileUrl: cloudinaryRes.secure_url,
        cloudinaryPublicId: cloudinaryRes.public_id,
        createdAt: new Date().toISOString()
      };

      await saveUserDocument(user.uid, newDoc);

      setSuccessMsg('Document successfully uploaded to private wallet!');
      setTimeout(() => setSuccessMsg(''), 4000);

      // Reset
      setDisplayName('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(null);
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed.');
      setUploadProgress(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this document from your secure wallet?')) {
      await deleteUserDocument(user.uid, docId);
      loadDocuments();
      if (activePreviewDoc?.documentId === docId) {
        setActivePreviewDoc(null);
      }
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 14px', minHeight: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="badge badge-teal">Secure Document Wallet</span>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Upload Form */}
      <div className="card-glass" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', margin: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> Add Secure Reference Document
        </h3>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Document Label</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. My Ayushman Card"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Document Category</label>
              <select 
                value={docType} 
                onChange={(e) => setDocType(e.target.value as UserDocument['documentType'])}
                className="form-select"
              >
                <option value="AYUSHMAN_CARD">Ayushman Bharat Card</option>
                <option value="GOVERNMENT_ID">Government Photo ID</option>
                <option value="SCHEME_DOCUMENT">Eligibility Scheme Document</option>
                <option value="OTHER">Other Proof Document</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Upload Image (Max 5MB)</label>
            <input 
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="form-input"
              style={{ padding: '8px' }}
              required={!previewUrl}
            />
          </div>

          {previewUrl && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', background: 'var(--bg-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>UPLOAD PREVIEW</span>
              <img src={previewUrl} alt="Preview Upload" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius-xs)', objectFit: 'contain' }} />
            </div>
          )}

          {uploadError && (
            <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} /> {uploadError}
            </div>
          )}

          {uploadProgress !== null && (
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', height: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--primary)', width: `${uploadProgress}%`, height: '100%', transition: 'width 0.15s ease-out' }}></div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={uploadProgress !== null || !selectedFile}
            style={{ minHeight: '44px' }}
          >
            {uploadProgress !== null ? 'Uploading assets...' : 'Confirm Upload Document'}
          </button>
        </form>
      </div>

      {/* Documents Wallet list */}
      <div className="card-glass" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} /> Your Wallet Documents
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}><Loader className="animate-spin" size={24} /> Loading wallet...</div>
        ) : documents.length === 0 ? (
          <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center', padding: '16px' }}>
            No documents stored in your secure wallet references yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map((d) => (
              <div 
                key={d.documentId} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-subtle)' 
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>{d.displayName}</strong>
                  <span className="badge badge-teal" style={{ marginLeft: '8px', fontSize: '0.725rem' }}>
                    {d.documentType.replace(/_/g, ' ')}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Added: {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setActivePreviewDoc(d)} 
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', minHeight: '32px' }}
                    title="Preview document"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(d.documentId)} 
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', minHeight: '32px', color: 'var(--emergency)' }}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Document Preview Dialog */}
      {activePreviewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card-glass animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '20px', background: 'var(--bg-elevated)', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, marginBottom: '12px' }}>
              Preview: {activePreviewDoc.displayName}
            </h4>
            
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={activePreviewDoc.fileUrl} 
                alt={activePreviewDoc.displayName} 
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} 
              />
            </div>

            <button 
              onClick={() => setActivePreviewDoc(null)} 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px', minHeight: '44px' }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
