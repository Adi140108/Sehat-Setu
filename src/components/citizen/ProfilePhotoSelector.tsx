import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertTriangle, RefreshCw, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';
import { uploadImageToCloudinary } from '../../services/cloudinary/cloudinaryService';

interface ProfilePhotoSelectorProps {
  currentPhotoUrl?: string;  // kept for future diff/display logic
  onPhotoSaved: (secureUrl: string, publicId: string) => void;
  onClose: () => void;
}

type Mode = 'CHOOSE' | 'CAMERA' | 'CROP' | 'PREVIEW';
type FaceState = 'NO_FACE' | 'ONE_FACE' | 'MULTIPLE_FACES' | 'FACE_TOO_SMALL' | 'FACE_OUTSIDE_CROP' | 'FACE_ACCEPTABLE';

export const ProfilePhotoSelector: React.FC<ProfilePhotoSelectorProps> = ({
  currentPhotoUrl: _currentPhotoUrl,
  onPhotoSaved,
  onClose
}) => {
  const [mode, setMode] = useState<Mode>('CHOOSE');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Camera references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Crop / Drag & Zoom State
  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 300, height: 300 });

  // Face Detection States
  const [faceState, setFaceState] = useState<FaceState>('NO_FACE');
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const faceModelRef = useRef<any>(null);

  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Stop camera tracks immediately on clean up
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Initialize camera and start video stream
  const startCamera = async () => {
    setCameraError(null);
    setMode('CAMERA');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Request front-facing camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access denied:', err);
      setCameraError('Camera permission blocked or webcam unavailable. Please use file upload instead.');
      setMode('CHOOSE');
    }
  };

  // Capture frame from live video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);
      stopCamera();
      
      // Navigate to cropping
      setMode('CROP');
      setScale(1.0);
      setOffsetX(0);
      setOffsetY(0);
      runFaceDetection(dataUrl);
    }
  };

  // Open file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // MIME and Extension validates
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file format. Please upload JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setMode('CROP');
        setScale(1.0);
        setOffsetX(0);
        setOffsetY(0);
        runFaceDetection(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run BlazeFace local face detection inside browser (Rule 11)
  const runFaceDetection = async (imgDataUrl: string) => {
    setIsDetecting(true);
    setFaceState('NO_FACE');
    setFaceBox(null);

    try {
      const blazeface = (window as any).blazeface;
      if (!blazeface) {
        console.warn('BlazeFace model not loaded yet.');
        setIsDetecting(false);
        setFaceState('FACE_ACCEPTABLE'); // Fallback in case of network CDN failures
        return;
      }

      if (!faceModelRef.current) {
        faceModelRef.current = await blazeface.load();
      }

      const img = new Image();
      img.src = imgDataUrl;
      img.onload = async () => {
        setImageSize({ width: img.width, height: img.height });
        const predictions = await faceModelRef.current.estimateFaces(img, false);
        setIsDetecting(false);

        if (predictions.length === 0) {
          setFaceState('NO_FACE');
        } else if (predictions.length > 1) {
          setFaceState('MULTIPLE_FACES');
        } else {
          // Exactly 1 face detected
          const face = predictions[0];
          const x = face.topLeft[0];
          const y = face.topLeft[1];
          const w = face.bottomRight[0] - face.topLeft[0];
          const h = face.bottomRight[1] - face.topLeft[1];
          setFaceBox({ x, y, w, h });

          // Calculate dimensions check (too small check)
          const facePct = w / img.width;
          if (facePct < 0.20) {
            setFaceState('FACE_TOO_SMALL');
          } else {
            setFaceState('FACE_ACCEPTABLE');
          }
        }
      };
    } catch (err) {
      console.error('Face detection execution failed:', err);
      setIsDetecting(false);
      setFaceState('FACE_ACCEPTABLE'); // Fail gracefully, allow upload
    }
  };

  // Dynamic geofencing face-position checker as the user drags and zooms
  useEffect(() => {
    if (mode === 'CROP' && faceBox && imageSize.width > 0) {
      // Calculate face center in original image coordinate space
      const origFaceCX = faceBox.x + faceBox.w / 2;
      const origFaceCY = faceBox.y + faceBox.h / 2;

      // Translate coordinates to current cropped container space (300px square frame)
      const viewportCX = 150 + offsetX + (origFaceCX - imageSize.width / 2) * (300 / imageSize.width) * scale;
      const viewportCY = 150 + offsetY + (origFaceCY - imageSize.height / 2) * (300 * (imageSize.height / imageSize.width) / imageSize.height) * scale;

      // Distance from center of circular mask (150, 150)
      const dist = Math.sqrt((viewportCX - 150) ** 2 + (viewportCY - 150) ** 2);
      
      if (dist > 85) {
        setFaceState('FACE_OUTSIDE_CROP');
      } else {
        // Recalculate face percent size based on scale
        const scaledFaceWidth = (faceBox.w / imageSize.width) * 300 * scale;
        if (scaledFaceWidth < 60) {
          setFaceState('FACE_TOO_SMALL');
        } else {
          setFaceState('FACE_ACCEPTABLE');
        }
      }
    }
  }, [offsetX, offsetY, scale, faceBox, imageSize, mode]);

  // Drag listeners for Crop Panel (Desktop mouse / Mobile touch)
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX - offsetX, y: clientY - offsetY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const nextX = clientX - dragStart.current.x;
    const nextY = clientY - dragStart.current.y;
    
    // Boundary limitations (don't drag offscreen)
    setOffsetX(nextX);
    setOffsetY(nextY);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Draw final cropped canvas and upload to Cloudinary (Rule 12)
  const handleConfirmCrop = () => {
    if (!imageSrc) return;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = async () => {
        ctx.clearRect(0, 0, 300, 300);
        ctx.save();
        
        // Translate and draw based on offsets and zoom scale
        ctx.translate(150 + offsetX, 150 + offsetY);
        ctx.scale(scale, scale);
        
        const renderWidth = 300;
        const renderHeight = 300 * (img.height / img.width);
        
        ctx.drawImage(img, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
        ctx.restore();
        
        // Convert to dataUrl or Blob
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          setUploadProgress(0);
          setUploadError(null);
          
          try {
            // Upload only final user-approved cropped image (Rule 12)
            const fileToUpload = new File([blob], 'avatar_cropped.jpg', { type: 'image/jpeg' });
            const cloudinaryRes = await uploadImageToCloudinary(
              fileToUpload,
              (progress) => setUploadProgress(progress),
              'sehat-setu/profiles'
            );
            
            // Invoke callback to save reference inside Firestore
            onPhotoSaved(cloudinaryRes.secure_url, cloudinaryRes.public_id);
          } catch (err: any) {
            console.error('Cropped upload failed:', err);
            setUploadError('Failed to upload image to Cloudinary storage. Please try again.');
            setUploadProgress(null);
          }
        }, 'image/jpeg', 0.9);
      };
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="card-glass animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            {mode === 'CHOOSE' && 'Select Profile Photo'}
            {mode === 'CAMERA' && 'Take Profile Photo'}
            {mode === 'CROP' && 'Adjust Your Photo'}
          </h3>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            aria-label="Close photo selector"
          >
            <X size={20} />
          </button>
        </div>

        {/* MODE: CHOOSE */}
        {mode === 'CHOOSE' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Add a face photo for your official encrypted Sehat Pass ID.
            </p>

            {cameraError && (
              <div style={{ color: 'var(--emergency)', background: 'var(--emergency-bg)', border: '1.5px solid var(--emergency)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> <span>{cameraError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button 
                onClick={startCamera}
                className="btn btn-primary"
                style={{ flexDirection: 'column', gap: '8px', padding: '24px 12px', minHeight: '110px' }}
              >
                <Camera size={26} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>CAPTURE NOW</span>
              </button>

              <label 
                className="btn btn-outline"
                style={{ flexDirection: 'column', gap: '8px', padding: '24px 12px', minHeight: '110px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Upload size={26} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>UPLOAD PHOTO</span>
                <input 
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}

        {/* MODE: CAMERA */}
        {mode === 'CAMERA' && (
          <div style={{ padding: '20px', textAlign: 'center', position: 'relative' }}>
            <div 
              style={{ 
                position: 'relative', 
                width: '300px', 
                height: '300px', 
                margin: '0 auto 20px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--primary)',
                background: '#000'
              }}
            >
              {/* Live Video Element */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)' // Mirror stream
                }}
              />

              {/* Face Guide Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  top: '15%',
                  left: '15%',
                  right: '15%',
                  bottom: '15%',
                  borderRadius: '50%',
                  border: '2px dashed #fff',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => { stopCamera(); setMode('CHOOSE'); }}
                className="btn btn-outline"
                style={{ padding: '0 20px' }}
              >
                Cancel
              </button>
              <button 
                onClick={capturePhoto}
                className="btn btn-primary"
                style={{ padding: '0 24px', fontWeight: 800 }}
              >
                Capture Photo
              </button>
            </div>
          </div>
        )}

        {/* MODE: CROP */}
        {mode === 'CROP' && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            {/* Cropping Drag viewport */}
            <div 
              onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
              onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
              style={{
                position: 'relative',
                width: '300px',
                height: '300px',
                margin: '0 auto 16px',
                overflow: 'hidden',
                borderRadius: '50%',
                border: `3px solid ${faceState === 'FACE_ACCEPTABLE' ? 'var(--success)' : (faceState === 'FACE_OUTSIDE_CROP' ? 'var(--accent)' : 'var(--emergency)')}`,
                background: '#eceff1',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none'
              }}
            >
              {imageSrc && (
                <img 
                  src={imageSrc}
                  alt="Source avatar to crop"
                  draggable={false}
                  style={{
                    width: '100%',
                    height: 'auto',
                    pointerEvents: 'none',
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                />
              )}

              {/* Face detect bounding box overlay (only for visualization/debugging during crop adjustment) */}
              {faceBox && imageSize.width > 0 && (
                <div 
                  style={{
                    position: 'absolute',
                    border: '1.5px solid rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none',
                    // Project box relative to offsets and scaling
                    width: `${(faceBox.w / imageSize.width) * 300 * scale}px`,
                    height: `${(faceBox.h / imageSize.height) * 300 * (imageSize.height / imageSize.width) * scale}px`,
                    left: `${150 + offsetX + (faceBox.x - imageSize.width / 2) * (300 / imageSize.width) * scale}px`,
                    top: `${150 + offsetY + (faceBox.y - imageSize.height / 2) * (300 * (imageSize.height / imageSize.width) / imageSize.height) * scale}px`
                  }}
                />
              )}
            </div>

            {/* Drag & Zoom instructions */}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Drag to reposition • Use slider/buttons below to zoom
            </p>

            {/* Slider zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
              <ZoomOut size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{ width: '160px', accentColor: 'var(--primary)' }}
              />
              <ZoomIn size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', width: '35px', textAlign: 'left', color: 'var(--text-secondary)' }}>
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Local Face Detection Feedback Banner */}
            <div 
              style={{
                background: faceState === 'FACE_ACCEPTABLE' ? 'var(--success-bg)' : 'var(--bg-subtle)',
                border: `1.5px solid ${faceState === 'FACE_ACCEPTABLE' ? 'var(--success)' : 'var(--border)'}`,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {isDetecting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>Analyzing photo details...</span>
                </>
              ) : (
                <>
                  {faceState === 'FACE_ACCEPTABLE' && (
                    <>
                      <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--success-green)', fontWeight: 700 }}>
                        Acceptable! Click confirm to save profile photo.
                      </span>
                    </>
                  )}
                  {faceState === 'NO_FACE' && (
                    <>
                      <AlertTriangle size={18} style={{ color: 'var(--emergency)' }} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--emergency)', fontWeight: 700 }}>
                        No face detected. Please position your face inside the frame.
                      </span>
                    </>
                  )}
                  {faceState === 'MULTIPLE_FACES' && (
                    <>
                      <AlertTriangle size={18} style={{ color: 'var(--emergency)' }} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--emergency)', fontWeight: 700 }}>
                        Multiple faces detected. Please use a photo containing only one face.
                      </span>
                    </>
                  )}
                  {faceState === 'FACE_TOO_SMALL' && (
                    <>
                      <AlertTriangle size={18} style={{ color: 'var(--emergency)' }} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--emergency)', fontWeight: 700 }}>
                        Face too small. Move closer or zoom in.
                      </span>
                    </>
                  )}
                  {faceState === 'FACE_OUTSIDE_CROP' && (
                    <>
                      <AlertTriangle size={18} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--accent)', fontWeight: 700 }}>
                        Move your face into the highlighted area.
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Cloudinary uploads error checks */}
            {uploadError && (
              <div style={{ color: 'var(--emergency)', background: 'var(--emergency-bg)', border: '1.5px solid var(--emergency)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '16px' }}>
                {uploadError}
              </div>
            )}

            {/* Confirm Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => { setMode('CHOOSE'); setImageSrc(null); setFaceBox(null); }}
                className="btn btn-outline"
                style={{ padding: '0 20px' }}
                disabled={uploadProgress !== null}
              >
                Choose Another
              </button>
              <button 
                onClick={handleConfirmCrop}
                className="btn btn-primary"
                style={{ padding: '0 24px', fontWeight: 800 }}
                disabled={uploadProgress !== null}
              >
                {uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Confirm Crop'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ProfilePhotoSelector;
