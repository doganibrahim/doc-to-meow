import React, { useState } from 'react';
import DragDropUpload from '../ui/DragDropUpload';
import CatAvatar3D from '../ui/CatAvatar3D';
import { COLORS } from '../../constants/theme';

const renderMarkdown = (text) => {
  if (!text) return null;

  // Split by double newlines to find paragraphs, headers, or lists
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, blockIdx) => {
    block = block.trim();
    if (!block) return null;

    const parseInlineStyles = (str) => {
      // Split by ** to find bold text
      const parts = str.split(/\*\*([^\*]+)\*\*/g);
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} style={{ fontWeight: '700', color: '#1E1F22' }}>{part}</strong>;
        }
        return part;
      });
    };

    // Check if the block is a heading (starts with one or more # followed by space)
    if (block.startsWith('#')) {
      const match = block.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const HeadingTag = `h${level}`;
        const headingStyles = {
          fontFamily: '"Lilita One", sans-serif',
          color: level === 1 || level === 2 ? COLORS.primary : COLORS.secondary,
          margin: '18px 0 10px 0',
          fontSize: level === 1 ? '22px' : level === 2 ? '18px' : '16px',
          lineHeight: '1.3'
        };
        return (
          <HeadingTag key={blockIdx} style={headingStyles}>
            {parseInlineStyles(headingText)}
          </HeadingTag>
        );
      }
    }

    // Check if the block is a list (every line starts with * or - or a number like 1.)
    const lines = block.split('\n');
    const isList = lines.every(line => /^\s*[\*\-]\s+/.test(line) || /^\s*\d+\.\s+/.test(line));

    if (isList) {
      const listItems = lines.map((line, lineIdx) => {
        // Strip the list marker (*, -, or 1.)
        const content = line.replace(/^\s*[\*\-]\s+/, '').replace(/^\s*\d+\.\s+/, '');
        return (
          <li key={lineIdx} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
            {parseInlineStyles(content)}
          </li>
        );
      });

      const isNumberedList = /^\s*\d+\.\s+/.test(lines[0]);
      if (isNumberedList) {
        return (
          <ol key={blockIdx} style={{ margin: '0 0 14px 20px', padding: 0 }}>
            {listItems}
          </ol>
        );
      } else {
        return (
          <ul key={blockIdx} style={{ margin: '0 0 14px 20px', padding: 0, listStyleType: 'disc' }}>
            {listItems}
          </ul>
        );
      }
    }

    // Otherwise, render as a paragraph
    // Handle inline newlines within a paragraph as line breaks
    const linesOfParagraph = block.split('\n');
    return (
      <p key={blockIdx} style={{ margin: '0 0 14px 0', lineHeight: '1.6' }}>
        {linesOfParagraph.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {parseInlineStyles(line)}
            {lineIdx < linesOfParagraph.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
};

export default function PetDetail({
  cat,
  activeLocale,
  onAddReport,
  onDeleteReport,
  onUpdateReport,
  onBack,
  isDesktop,
  onCommitCarePlan
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);

  // Track which report is being previewed
  const [previewingReportId, setPreviewingReportId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractingReportId, setExtractingReportId] = useState(null);
  const [viewingExtractedText, setViewingExtractedText] = useState(null);
  const [translatingReportId, setTranslatingReportId] = useState(null);
  const [viewingTranslation, setViewingTranslation] = useState(null);

  const [selectedHabits, setSelectedHabits] = useState({});
  const [selectedTodos, setSelectedTodos] = useState({});

  React.useEffect(() => {
    if (viewingTranslation && viewingTranslation.carePlan) {
      const habitsObj = {};
      const todosObj = {};
      const habitsList = viewingTranslation.carePlan.habits || [];
      const todosList = viewingTranslation.carePlan.todos || [];

      habitsList.forEach((h, idx) => {
        habitsObj[h.title || idx] = true;
      });
      todosList.forEach((t, idx) => {
        todosObj[t.title || idx] = true;
      });

      setSelectedHabits(habitsObj);
      setSelectedTodos(todosObj);
    }
  }, [viewingTranslation]);

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!files.length) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      // Backend uses upload.array('files', 5)
      for (const f of files) {
        formData.append('files', f);
      }

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await response.json();
      // Backend returns { files: [{ fileUrl, fileName, fileSize, fileType }] }
      const uploadedFiles = uploadData.files || [];
      const firstFile = uploadedFiles[0] || {};

      const report = {
        id: Date.now().toString(),
        title: title.trim() || firstFile.fileName || files[0]?.name || 'Report',
        date: date || new Date().toISOString().split('T')[0],
        notes: notes.trim(),
        // Top-level fields for backward compat with old single-file reports
        fileName: firstFile.fileName || files[0]?.name,
        fileType: firstFile.fileType || files[0]?.type,
        fileSize: firstFile.fileSize || files[0]?.size,
        fileData: firstFile.fileUrl,
        // Full files array for multi-file extraction
        files: uploadedFiles,
        uploadedAt: new Date().toISOString()
      };

      onAddReport(cat.id, report);

      // Reset form
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload/save report: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };


  const handleTranslateReport = async (report) => {
    // If the translation and care plan are already generated, just show them
    if (report.translatedText && report.carePlan) {
      setViewingTranslation({
        title: report.title,
        text: report.translatedText,
        carePlan: report.carePlan
      });
      return;
    }

    setTranslatingReportId(report.id);
    setViewingTranslation({ title: report.title, text: 'loading' });

    try {
      let currentExtractedText = report.extractedText;

      // 1. If we don't have extracted text, extract it first
      if (!currentExtractedText) {
        // Pass the files array if available, else fall back to the single fileData field
        const filesToExtract = report.files && report.files.length > 0
          ? report.files
          : [{ fileUrl: report.fileData, fileType: report.fileType }];

        const extractResponse = await fetch('http://localhost:3000/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesToExtract })
        });

        if (!extractResponse.ok) {
          const errData = await extractResponse.json();
          throw new Error(errData.error || 'Failed to extract text from document.');
        }

        const extractData = await extractResponse.json();
        currentExtractedText = extractData.extractedText;

        // Save the extracted text
        onUpdateReport(cat.id, report.id, { extractedText: currentExtractedText });
      }

      // 2. Call the translate API (if not already translated)
      let currentTranslatedText = report.translatedText;
      if (!currentTranslatedText) {
        const translateResponse = await fetch('http://localhost:3000/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            extractedText: currentExtractedText
          })
        });

        if (!translateResponse.ok) {
          const errData = await translateResponse.json();
          throw new Error(errData.error || 'Failed to translate report.');
        }

        const translateData = await translateResponse.json();
        currentTranslatedText = translateData.translatedText;

        // Save the translation
        onUpdateReport(cat.id, report.id, { translatedText: currentTranslatedText });
      }

      // 3. Call the architect API (if care plan is not generated)
      let currentCarePlan = report.carePlan;
      if (!currentCarePlan) {
        const architectResponse = await fetch('http://localhost:3000/api/architect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            translatedText: currentTranslatedText
          })
        });

        if (!architectResponse.ok) {
          const errData = await architectResponse.json();
          throw new Error(errData.error || 'Failed to generate care plan.');
        }

        currentCarePlan = await architectResponse.json();

        // Save the care plan to the report
        onUpdateReport(cat.id, report.id, {
          translatedText: currentTranslatedText,
          carePlan: currentCarePlan
        });
      }

      setViewingTranslation({
        title: report.title,
        text: currentTranslatedText,
        carePlan: currentCarePlan
      });

    } catch (err) {
      console.error(err);
      setViewingTranslation({ title: report.title, text: `⚠️ Error translating report: ${err.message}` });
    } finally {
      setTranslatingReportId(null);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
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

        {/* Small Profile Card with interactive 3D avatar */}
        <div style={{
          width: '70px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFF8F0',
          borderRadius: '16px',
          border: `1.5px solid ${COLORS.bgLight}`,
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <CatAvatar3D color={cat.color || 'orange'} width={70} height={70} />
        </div>

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

      <div style={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        gap: '30px',
        alignItems: 'stretch'
      }}>

        {/* VET REPORTS LIST SECTION */}
        <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            <div
              className="custom-scrollbar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: isDesktop ? '460px' : 'none',
                overflowY: isDesktop ? 'auto' : 'visible',
                paddingRight: '6px'
              }}
            >
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

                  {/* Attachments — multi-file */}
                  {(() => {
                    // Normalize: prefer files array, fall back to old single-file fields
                    const attachments = (report.files && report.files.length > 0)
                      ? report.files
                      : (report.fileData ? [{ fileUrl: report.fileData, fileName: report.fileName, fileType: report.fileType, fileSize: report.fileSize }] : []);

                    if (attachments.length === 0) return null;

                    return (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #F9FAFB', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {attachments.map((att, attIdx) => {
                          const isPdf = att.fileType === 'application/pdf';
                          const isImg = att.fileType && att.fileType.startsWith('image/');
                          // Use a composite key for preview state
                          const previewKey = `${report.id}-${attIdx}`;
                          return (
                            <div key={attIdx}>
                              {/* File row */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280', fontWeight: '600', minWidth: 0 }}>
                                  <span>{isPdf ? '📄' : '🖼️'}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                    {att.fileName}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500', flexShrink: 0 }}>
                                    ({formatBytes(att.fileSize || 0)})
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                  {isPdf ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPdf(att.fileUrl, att.fileName)}
                                      style={{ padding: '3px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                    >
                                      👁️ View PDF
                                    </button>
                                  ) : isImg ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingReportId(previewingReportId === previewKey ? null : previewKey)}
                                      style={{ padding: '3px 8px', backgroundColor: '#FFF7ED', color: COLORS.secondary, border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FFEDD5'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFF7ED'}
                                    >
                                      {previewingReportId === previewKey ? 'Hide' : '👁️ View'}
                                    </button>
                                  ) : null}

                                  <a
                                    href={att.fileUrl}
                                    download={att.fileName}
                                    style={{ padding: '3px 8px', backgroundColor: '#FFFBF7', color: COLORS.primaryDark, border: `1px solid ${COLORS.primary}`, borderRadius: '6px', fontSize: '11px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = COLORS.primary; e.currentTarget.style.color = '#FFF'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFBF7'; e.currentTarget.style.color = COLORS.primaryDark; }}
                                  >
                                    📥
                                  </a>
                                </div>
                              </div>

                              {/* Inline image preview */}
                              {previewingReportId === previewKey && isImg && (
                                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                                  <img
                                    src={att.fileUrl}
                                    alt={att.fileName}
                                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Action buttons row — shared for the whole report */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleTranslateReport(report)}
                            style={{ padding: '5px 12px', backgroundColor: COLORS.primary, color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryDark}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
                          >
                            {translatingReportId === report.id ? `⌛ ${activeLocale.translating}` : activeLocale.translateBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD NEW VET REPORT FORM */}
        <div style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: '#FFFDF9',
          border: `2px solid ${COLORS.bgLight}`,
          borderRadius: '20px',
          padding: '20px',
          boxSizing: 'border-box',
          alignSelf: 'flex-start',
          width: '100%'
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
                files={files}
                onFilesChange={setFiles}
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
                placeholder={files.length > 0 ? (files[0].name.substring(0, files[0].name.lastIndexOf('.')) || files[0].name) : 'e.g. Annual Checkup'}
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
                  resize: 'none',
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
                disabled={!files.length || isUploading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: (files.length && !isUploading) ? COLORS.primary : '#E5E7EB',
                  color: (files.length && !isUploading) ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: (files.length && !isUploading) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                  boxShadow: (files.length && !isUploading) ? `0 3px 10px rgba(252, 163, 77, 0.2)` : 'none'
                }}
                onMouseOver={(e) => {
                  if (files.length && !isUploading) e.currentTarget.style.backgroundColor = COLORS.primaryDark;
                }}
                onMouseOut={(e) => {
                  if (files.length && !isUploading) e.currentTarget.style.backgroundColor = COLORS.primary;
                }}
              >
                {isUploading
                  ? (activeLocale.uploading + (files.length > 1 ? ` (${files.length} files)` : ''))
                  : activeLocale.saveReportBtn}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDate(new Date().toISOString().split('T')[0]);
                  setNotes('');
                  setFiles([]);
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

      {/* Inject style for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Extracted Text Viewer Modal */}
      {viewingExtractedText && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(30, 31, 34, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: `2px solid ${COLORS.bgLight}`,
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontFamily: '"Lilita One", sans-serif',
                color: COLORS.primary
              }}>
                📄 {viewingExtractedText.title}
              </h3>
              <button
                onClick={() => setViewingExtractedText(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#EF4444'}
                onMouseOut={(e) => e.target.style.color = '#9CA3AF'}
              >
                ✖
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#FAFAFA'
            }}>
              {viewingExtractedText.text === 'loading' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 0',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: `4px solid ${COLORS.bgLight}`,
                    borderTop: `4px solid ${COLORS.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textAlign: 'center'
                  }}>
                    Agent Pepper is scanning and extracting data... 🐾
                  </p>
                </div>
              ) : (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#374151',
                  lineHeight: '1.6',
                  backgroundColor: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid #E5E7EB'
                }}>
                  {viewingExtractedText.text}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setViewingExtractedText(null)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: COLORS.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = COLORS.primaryDark}
                onMouseOut={(e) => e.target.style.backgroundColor = COLORS.primary}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translation Viewer Modal */}
      {viewingTranslation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(30, 31, 34, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: `2px solid ${COLORS.bgLight}`,
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontFamily: '"Lilita One", sans-serif',
                color: COLORS.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🐱 {activeLocale.translationTitle}
              </h3>
              <button
                onClick={() => setViewingTranslation(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#EF4444'}
                onMouseOut={(e) => e.target.style.color = '#9CA3AF'}
              >
                ✖
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#FFFDF9'
            }}>
              {viewingTranslation.text === 'loading' ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 0',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: `4px solid ${COLORS.bgLight}`,
                    borderTop: `4px solid ${COLORS.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textAlign: 'center'
                  }}>
                    Agent Cleo is translating raw data into cozy insights... 🐾
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    fontSize: '14px',
                    color: '#374151',
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '16px',
                    border: `1.5px solid ${COLORS.bgLight}`,
                    boxShadow: '0 4px 12px rgba(253, 232, 209, 0.2)'
                  }}>
                    {renderMarkdown(viewingTranslation.text)}
                  </div>

                  {/* Care Plan Section */}
                  {viewingTranslation.carePlan && (
                    <div style={{ marginTop: '24px' }}>
                      {/* Divider with Paw Print */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        margin: '24px 0'
                      }}>
                        <div style={{ flex: 1, height: '1.5px', backgroundColor: COLORS.bgLight }} />
                        <span style={{ fontSize: '18px', color: COLORS.primary, fontFamily: '"Lilita One", sans-serif' }}>🐾 Care Plan 🐾</span>
                        <div style={{ flex: 1, height: '1.5px', backgroundColor: COLORS.bgLight }} />
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: isDesktop ? 'row' : 'column',
                        gap: '24px',
                        alignItems: 'stretch'
                      }}>
                        {/* Habits Column */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            fontFamily: '"Lilita One", sans-serif',
                            fontSize: '18px',
                            color: COLORS.primary,
                            margin: '0 0 12px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            Recommended Habits 🐾
                          </h4>
                          {(!viewingTranslation.carePlan.habits || viewingTranslation.carePlan.habits.length === 0) ? (
                            <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>{activeLocale.noHabits}</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {viewingTranslation.carePlan.habits.map((habit, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '12px 14px',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1.5px solid #F3F4F6',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!selectedHabits[habit.title]}
                                    onChange={(e) => setSelectedHabits({
                                      ...selectedHabits,
                                      [habit.title]: e.target.checked
                                    })}
                                    style={{
                                      cursor: 'pointer',
                                      width: '18px',
                                      height: '18px',
                                      accentColor: COLORS.primary,
                                      marginTop: '2px'
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#1E1F22' }}>{habit.title}</span>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        backgroundColor: COLORS.bgLight,
                                        color: COLORS.secondary,
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {habit.frequency}
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '11.5px', color: '#6B7280', lineHeight: '1.4' }}>{habit.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* To-Dos Column */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            fontFamily: '"Lilita One", sans-serif',
                            fontSize: '18px',
                            color: COLORS.secondary,
                            margin: '0 0 12px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            One-off To-Dos 🐾
                          </h4>
                          {(!viewingTranslation.carePlan.todos || viewingTranslation.carePlan.todos.length === 0) ? (
                            <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>{activeLocale.noTodos}</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {viewingTranslation.carePlan.todos.map((todo, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '12px 14px',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1.5px solid #F3F4F6',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!selectedTodos[todo.title]}
                                    onChange={(e) => setSelectedTodos({
                                      ...selectedTodos,
                                      [todo.title]: e.target.checked
                                    })}
                                    style={{
                                      cursor: 'pointer',
                                      width: '18px',
                                      height: '18px',
                                      accentColor: COLORS.secondary,
                                      marginTop: '2px'
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#1E1F22', display: 'block', marginBottom: '4px' }}>{todo.title}</span>
                                    <p style={{ margin: 0, fontSize: '11.5px', color: '#6B7280', lineHeight: '1.4' }}>{todo.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              {viewingTranslation.carePlan && (
                <button
                  onClick={() => {
                    const habitsToCommit = (viewingTranslation.carePlan.habits || []).filter(h => !!selectedHabits[h.title]);
                    const todosToCommit = (viewingTranslation.carePlan.todos || []).filter(t => !!selectedTodos[t.title]);

                    if (onCommitCarePlan) {
                      onCommitCarePlan(habitsToCommit, todosToCommit);
                    }
                    setViewingTranslation(null);
                  }}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: COLORS.secondary,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = COLORS.primaryDark}
                  onMouseOut={(e) => e.target.style.backgroundColor = COLORS.secondary}
                >
                  {activeLocale.startTrackingBtn}
                </button>
              )}
              <button
                onClick={() => setViewingTranslation(null)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              >
                {activeLocale.cancelBtn || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
