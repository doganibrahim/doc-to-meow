import React, { useState } from 'react';
import DragDropUpload from '../ui/DragDropUpload';
import { COLORS } from '../../constants/theme';

export default function PetDetail({
  cat,
  activeLocale,
  onAddReport,
  onDeleteReport,
  onBack
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);

  // Track which report is being previewed
  const [previewingReportId, setPreviewingReportId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to Express backend
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await response.json();

      const report = {
        id: Date.now().toString(),
        title: title.trim() || uploadData.fileName || file.name,
        date: date || new Date().toISOString().split('T')[0],
        notes: notes.trim(),
        fileName: uploadData.fileName || file.name,
        fileType: uploadData.fileType || file.type,
        fileSize: uploadData.fileSize || file.size,
        fileData: uploadData.fileUrl, // Store the public URL from Supabase Storage
        uploadedAt: new Date().toISOString()
      };

      onAddReport(cat.id, report);

      // Reset form
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload/save report: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const reports = cat.reports || [];

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleOpenPdf = (fileUrl, fileName) => {
    if (fileUrl.startsWith('data:')) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(
          `<iframe src="${fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        newWindow.document.title = fileName;
      } else {
        alert("Popup blocked! Please allow popups to view files.");
      }
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div style={{ textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            border: 'none',
            color: '#4B5563',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
          title={activeLocale.backToDashboard}
        >
          <svg
            viewBox="0 0 512 512"
            style={{
              width: '14px',
              height: '14px',
              display: 'block'
            }}
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="2.613"
              strokeWidth="48"
              d="M366.277,26.814L154.719,238.271c-10.729,10.221-10.729,26.192,0,36.413l211.559,211.455"
            />
          </svg>
        </button>
        <div>
          <h2 style={{
            fontFamily: '"Lilita One", sans-serif',
            fontSize: '28px',
            color: COLORS.primary,
            margin: 0,
            lineHeight: '1.2'
          }}>
            {cat.name}
          </h2>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>
            <span>{activeLocale.catAgeLabel.replace('{age}', cat.age || '0')}</span>
            <span>•</span>
            <span>{activeLocale.catWeightLabel.replace('{weight}', cat.weight || '0')}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

        {/* VET REPORTS LIST SECTION */}
        <div>
          <h3 style={{
            fontFamily: '"Lilita One", sans-serif',
            fontSize: '20px',
            color: COLORS.secondary,
            margin: '0 0 12px 0',
            borderBottom: `2px solid ${COLORS.bgLight}`,
            paddingBottom: '6px'
          }}>
            {activeLocale.vetReports} ({reports.length})
          </h3>

          {reports.length === 0 ? (
            <div style={{
              padding: '30px 20px',
              textAlign: 'center',
              backgroundColor: '#FBFBFB',
              borderRadius: '16px',
              border: '2px dashed #E5E7EB',
              color: '#9CA3AF',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              {activeLocale.noReports}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #F3F4F6',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.01)',
                    transition: 'border 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = COLORS.bgLight}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#F3F4F6'}
                >
                  {/* Top Bar inside Report Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: COLORS.foreground }}>
                        {report.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#9CA3AF', fontWeight: '600' }}>
                        <span>{activeLocale.visitDateLabel.replace('{date}', formatDate(report.date))}</span>
                        <span>•</span>
                        <span>{activeLocale.uploadedAtLabel.replace('{date}', formatDate(report.uploadedAt))}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteReport(cat.id, report.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {activeLocale.deleteCat}
                    </button>
                  </div>

                  {/* Notes Block */}
                  {report.notes && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#FAFAFA',
                      borderRadius: '0 8px 8px 0',
                      borderLeft: `3.5px solid ${COLORS.primary}`,
                      fontSize: '12px',
                      color: '#4B5563',
                      lineHeight: '1.4'
                    }}>
                      <strong>{activeLocale.parentNotes}:</strong> {report.notes}
                    </div>
                  )}

                  {/* Attachment Link & Preview Button */}
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid #F9FAFB'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                      <span>📎</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {report.fileName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                        ({formatBytes(report.fileSize)})
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Toggle inline preview or open pdf */}
                      {report.fileType === 'application/pdf' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(report.fileData, report.fileName)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#F3F4F6',
                            color: '#4B5563',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        >
                          👁️ View PDF
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPreviewingReportId(previewingReportId === report.id ? null : report.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#FFF7ED',
                            color: COLORS.secondary,
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FFEDD5'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFF7ED'}
                        >
                          {previewingReportId === report.id ? 'Hide Preview' : '👁️ View Image'}
                        </button>
                      )}

                      {/* Download Link */}
                      <a
                        href={report.fileData}
                        download={report.fileName}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#FFFBF7',
                          color: COLORS.primaryDark,
                          border: `1px solid ${COLORS.primary}`,
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = COLORS.primary;
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFBF7';
                          e.currentTarget.style.color = COLORS.primaryDark;
                        }}
                      >
                        📥 Download
                      </a>
                    </div>
                  </div>

                  {/* Inline Image Preview */}
                  {previewingReportId === report.id && report.fileType.startsWith('image/') && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={report.fileData}
                        alt={report.fileName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '300px',
                          borderRadius: '8px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD NEW VET REPORT FORM */}
        <div style={{
          backgroundColor: '#FFFDF9',
          border: `2px solid ${COLORS.bgLight}`,
          borderRadius: '20px',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{
            fontFamily: '"Lilita One", sans-serif',
            fontSize: '20px',
            color: COLORS.primary,
            margin: '0 0 16px 0'
          }}>
            {activeLocale.addNewReport}
          </h3>

          <form onSubmit={handleSaveReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Dropzone field */}
            <div>
              <DragDropUpload
                file={file}
                onFileChange={setFile}
                activeLocale={activeLocale}
              />
            </div>

            {/* Title field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                {activeLocale.reportTitle}
              </label>
              <input
                type="text"
                placeholder={file ? file.name.substring(0, file.name.lastIndexOf('.')) || file.name : "e.g. Annual Checkup"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E7EB',
                  fontSize: '13px',
                  fontFamily: '"Quicksand", sans-serif',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
              />
            </div>

            {/* Date field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                {activeLocale.visitDate}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E7EB',
                  fontSize: '13px',
                  fontFamily: '"Quicksand", sans-serif',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
              />
            </div>

            {/* Notes field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                {activeLocale.parentNotes}
              </label>
              <textarea
                placeholder="Write any symptoms, diets, or meds mentioned..."
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5E7EB',
                  fontSize: '13px',
                  fontFamily: '"Quicksand", sans-serif',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
              />
            </div>

            {/* Submit / Cancel Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={!file || isUploading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: (file && !isUploading) ? COLORS.primary : '#E5E7EB',
                  color: (file && !isUploading) ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: (file && !isUploading) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                  boxShadow: (file && !isUploading) ? `0 3px 10px rgba(252, 163, 77, 0.2)` : 'none'
                }}
                onMouseOver={(e) => {
                  if (file && !isUploading) e.currentTarget.style.backgroundColor = COLORS.primaryDark;
                }}
                onMouseOut={(e) => {
                  if (file && !isUploading) e.currentTarget.style.backgroundColor = COLORS.primary;
                }}
              >
                {isUploading ? activeLocale.uploading : activeLocale.saveReportBtn}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDate(new Date().toISOString().split('T')[0]);
                  setNotes('');
                  setFile(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: '1.5px solid #E5E7EB',
                  color: '#6B7280',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                {activeLocale.cancelBtn}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
