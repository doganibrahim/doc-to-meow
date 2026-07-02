import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../constants/theme';

const MAX_FILES = 5;

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

function FileThumb({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      backgroundColor: '#FFFFFF',
      border: '1.5px solid #E5E7EB',
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      minWidth: 0
    }}>
      {/* Thumbnail */}
      {previewUrl ? (
        <div style={{
          width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden',
          flexShrink: 0, backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB'
        }}>
          <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{
          width: '44px', height: '44px', borderRadius: '8px', backgroundColor: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0, border: '1.5px solid #FEE2E2'
        }}>
          📄
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px', fontWeight: '700', color: '#1E1F22',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {file.name}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
          <span style={{
            fontSize: '10px', fontWeight: '700', color: '#6B7280',
            backgroundColor: '#F3F4F6', padding: '1px 5px', borderRadius: '5px', textTransform: 'uppercase'
          }}>
            {file.type.split('/')[1] || 'FILE'}
          </span>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{formatBytes(file.size)}</span>
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#D1D5DB', fontSize: '16px', lineHeight: 1,
          padding: '2px 4px', flexShrink: 0, borderRadius: '4px',
          transition: 'color 0.15s'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
        onMouseOut={(e) => e.currentTarget.style.color = '#D1D5DB'}
        title="Remove file"
      >
        ✕
      </button>
    </div>
  );
}

export default function DragDropUpload({
  files = [],
  onFilesChange,
  activeLocale,
  style = {}
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const maxSize = 10 * 1024 * 1024;

  const addFiles = (incoming) => {
    setError('');
    const valid = [];
    for (const f of incoming) {
      if (!supportedTypes.includes(f.type)) {
        setError(activeLocale.invalidFormat);
        continue;
      }
      if (f.size > maxSize) {
        setError(activeLocale.fileTooLarge);
        continue;
      }
      // Skip duplicates (same name + size)
      if (files.some(existing => existing.name === f.name && existing.size === f.size)) continue;
      valid.push(f);
    }

    const combined = [...files, ...valid];
    if (combined.length > MAX_FILES) {
      setError(`Max ${MAX_FILES} files allowed.`);
      onFilesChange(combined.slice(0, MAX_FILES));
    } else {
      onFilesChange(combined);
    }
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    onFilesChange(updated);
    if (error) setError('');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so the same file can be re-added after removal
    e.target.value = '';
  };

  const remaining = MAX_FILES - files.length;
  const canAddMore = remaining > 0;

  return (
    <div style={{ width: '100%', ...style }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        accept=".pdf,image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
      />

      {/* Selected files list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {files.map((f, idx) => (
            <FileThumb key={`${f.name}-${f.size}-${idx}`} file={f} onRemove={() => removeFile(idx)} />
          ))}
        </div>
      )}

      {/* Drop zone — always visible while under the limit */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            width: '100%',
            minHeight: files.length > 0 ? '90px' : '160px',
            border: isDragActive
              ? `2.5px dashed ${COLORS.secondary}`
              : files.length > 0 ? '2px dashed #D1D5DB' : '2px dashed #D1D5DB',
            borderRadius: '16px',
            backgroundColor: isDragActive ? '#FFF7ED' : files.length > 0 ? '#FAFAFA' : '#FAFAFA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 24px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isDragActive ? 'scale(1.01)' : 'scale(1.0)'
          }}
          onMouseOver={(e) => {
            if (!isDragActive) {
              e.currentTarget.style.borderColor = COLORS.primary;
              e.currentTarget.style.backgroundColor = '#FFFBF7';
            }
          }}
          onMouseOut={(e) => {
            if (!isDragActive) {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.backgroundColor = files.length > 0 ? '#FAFAFA' : '#FAFAFA';
            }
          }}
        >
          {files.length === 0 && (
            <div style={{ fontSize: '32px', marginBottom: '10px', userSelect: 'none' }}>
              {isDragActive ? '📥' : '📂'}
            </div>
          )}

          <p style={{
            margin: '0 0 4px 0', fontSize: files.length > 0 ? '13px' : '14px',
            fontWeight: '600', color: isDragActive ? COLORS.secondary : '#4B5563',
            textAlign: 'center', lineHeight: '1.4'
          }}>
            {files.length > 0
              ? `Add more files (${remaining} remaining)`
              : activeLocale.dropzonePrompt}
          </p>

          {files.length === 0 && (
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '500', color: '#9CA3AF', textAlign: 'center' }}>
              {activeLocale.dropzoneFormats} &nbsp;·&nbsp; up to {MAX_FILES} files
            </p>
          )}
        </div>
      )}

      {/* At-limit indicator */}
      {!canAddMore && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px',
          fontSize: '12px', fontWeight: '600', color: COLORS.secondary
        }}>
          <span>Max {MAX_FILES} files selected. Remove one to add another.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '8px', color: '#EF4444', fontSize: '12px', fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
