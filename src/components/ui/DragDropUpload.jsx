import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../constants/theme';

export default function DragDropUpload({
  file,
  onFileChange,
  activeLocale,
  style = {}
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl('');
    }
  }, [file]);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    // Supported types: images and PDF
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!supportedTypes.includes(selectedFile.type)) {
      setError(activeLocale.invalidFormat);
      return false;
    }

    // Size limit: 10MB (10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(activeLocale.fileTooLarge);
      return false;
    }

    setError('');
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        onFileChange(droppedFile);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        onFileChange(selectedFile);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div style={{ width: '100%', ...style }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf, image/png, image/jpeg, image/jpg"
        onChange={handleFileSelect}
      />

      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          style={{
            width: '100%',
            minHeight: '160px',
            border: isDragActive
              ? `2.5px dashed ${COLORS.secondary}`
              : '2px dashed #D1D5DB',
            borderRadius: '16px',
            backgroundColor: isDragActive ? '#FFF7ED' : '#FAFAFA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
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
              e.currentTarget.style.backgroundColor = '#FAFAFA';
            }
          }}
        >
          {/* Cute Cat-Upload Icon */}
          <div style={{ fontSize: '38px', marginBottom: '12px', userSelect: 'none' }}>
            {isDragActive ? '📥' : '📂'}
          </div>
          
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: isDragActive ? COLORS.secondary : '#4B5563',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            {activeLocale.dropzonePrompt}
          </p>
          
          <p style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: '500',
            color: '#9CA3AF',
            textAlign: 'center'
          }}>
            {activeLocale.dropzoneFormats}
          </p>
        </div>
      ) : (
        /* File Selected State Details */
        <div style={{
          width: '100%',
          padding: '16px',
          borderRadius: '16px',
          border: '1.5px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxSizing: 'border-box',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          {/* File Thumbnail or Icon */}
          {file.type.startsWith('image/') && previewUrl ? (
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#F3F4F6',
              flexShrink: 0,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <img
                src={previewUrl}
                alt="Upload preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          ) : (
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#EF4444',
              flexShrink: 0,
              border: '1.5px solid #FEE2E2',
              fontWeight: 'bold',
              userSelect: 'none'
            }}>
              📄
            </div>
          )}

          {/* File Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: '700',
              color: '#1E1F22',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {file.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                padding: '2px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                {file.type.split('/')[1] || 'FILE'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#9CA3AF' }}>
                {formatBytes(file.size)}
              </span>
            </div>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onFileChange(null)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1.5px solid #F3F4F6',
              color: '#EF4444',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#F3F4F6';
            }}
          >
            {activeLocale.deleteCat}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '8px',
          color: '#EF4444',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
