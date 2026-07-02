import React, { useState, useEffect } from 'react';
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser
} from '@clerk/react';
import { COLORS } from './constants/theme';
import { en } from './constants/locales/en';
import { cat } from './constants/locales/cat';
import CatAvatar3D, { CAT_COLORS } from './components/ui/CatAvatar3D';
import PetDetail from './components/sections/PetDetail';


function App() {
  const { isSignedIn } = useUser();
  const [lang, setLang] = useState('en');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 768;

  // Persistent Cats State
  const [cats, setCats] = useState(() => {
    try {
      const saved = localStorage.getItem('doc_to_meow_cats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Navigation / Selected States
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'add' | 'detail'
  const [selectedCatId, setSelectedCatId] = useState(() => {
    try {
      const saved = localStorage.getItem('doc_to_meow_cats');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch {
      return null;
    }
  });

  // Form Input States
  const [catName, setCatName] = useState('');
  const [catAge, setCatAge] = useState('');
  const [catWeight, setCatWeight] = useState('');
  const [avatarColor, setAvatarColor] = useState('orange');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('doc_to_meow_cats', JSON.stringify(cats));
  }, [cats]);

  const texts = { en, cat };
  const active = texts[lang];

  const selectedCat = cats.find(c => c.id === selectedCatId);
  const activeViewerColor = viewMode === 'add' ? avatarColor : (selectedCat ? selectedCat.color : 'orange');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const newCat = {
      id: Date.now().toString(),
      name: catName,
      age: catAge,
      weight: catWeight,
      color: avatarColor,
      reports: [],
      activeHabits: [],
      activeTodos: []
    };

    setCats(prev => [...prev, newCat]);
    setSelectedCatId(newCat.id);
    setViewMode('dashboard');

    // Clear form fields
    setCatName('');
    setCatAge('');
    setCatWeight('');
    setAvatarColor('orange');
  };

  const handleDeleteCat = (id, e) => {
    e.stopPropagation();
    setCats(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (selectedCatId === id) {
        setSelectedCatId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleAddReport = (catId, report) => {
    setCats(prevCats => prevCats.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          reports: [...(cat.reports || []), report]
        };
      }
      return cat;
    }));
  };

  const handleDeleteReport = async (catId, reportId) => {
    // Find the cat and report to get the file url
    const cat = cats.find(c => c.id === catId);
    if (cat) {
      const report = (cat.reports || []).find(r => r.id === reportId);
      if (report && report.fileData && report.fileData.startsWith('http')) {
        try {
          await fetch('http://localhost:3000/api/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileUrl: report.fileData })
          });
        } catch (err) {
          console.error('Failed to delete file from cloud storage:', err);
        }
      }
    }

    setCats(prevCats => prevCats.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          reports: (c.reports || []).filter(r => r.id !== reportId)
        };
      }
      return c;
    }));
  };

  const handleUpdateReport = (catId, reportId, updatedFields) => {
    setCats(prevCats => prevCats.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          reports: (cat.reports || []).map(r => {
            if (r.id === reportId) {
              return { ...r, ...updatedFields };
            }
            return r;
          })
        };
      }
      return cat;
    }));
  };

  const handleCommitCarePlan = (habits, todos) => {
    if (!selectedCatId) return;

    setCats(prevCats => prevCats.map(c => {
      if (c.id === selectedCatId) {
        // Build active habits
        const newHabits = habits.map(h => ({
          id: `${h.title}-${Date.now()}-${Math.random()}`,
          title: h.title,
          frequency: h.frequency || 'Daily',
          description: h.description,
          completions: {},
          streak: 0
        }));

        // Build active todos
        const newTodos = todos.map(t => ({
          id: `${t.title}-${Date.now()}-${Math.random()}`,
          title: t.title,
          description: t.description,
          completed: false,
          completedAt: null
        }));

        const existingHabits = c.activeHabits || [];
        const existingTodos = c.activeTodos || [];

        // Check for duplicates to avoid adding the same habit/todo twice
        const filteredNewHabits = newHabits.filter(nh => !existingHabits.some(eh => eh.title === nh.title));
        const filteredNewTodos = newTodos.filter(nt => !existingTodos.some(et => et.title === nt.title));

        return {
          ...c,
          activeHabits: [...existingHabits, ...filteredNewHabits],
          activeTodos: [...existingTodos, ...filteredNewTodos]
        };
      }
      return c;
    }));
  };

  const handleToggleHabit = (habitId, dateStr) => {
    if (!selectedCatId) return;

    setCats(prevCats => prevCats.map(c => {
      if (c.id === selectedCatId) {
        const updatedHabits = (c.activeHabits || []).map(h => {
          if (h.id === habitId) {
            const completions = { ...(h.completions || {}) };
            const isCompleted = !!completions[dateStr];

            if (isCompleted) {
              delete completions[dateStr];
            } else {
              completions[dateStr] = true;
            }

            // Calculate streak based on completions
            let currentStreak = 0;
            let checkDate = new Date();

            while (true) {
              const formattedCheckDate = checkDate.toISOString().split('T')[0];
              if (completions[formattedCheckDate]) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                const todayStr = new Date().toISOString().split('T')[0];
                if (formattedCheckDate === todayStr) {
                  checkDate.setDate(checkDate.getDate() - 1);
                  const formattedYesterday = checkDate.toISOString().split('T')[0];
                  if (completions[formattedYesterday]) {
                    continue;
                  }
                }
                break;
              }
            }

            return {
              ...h,
              completions,
              streak: currentStreak
            };
          }
          return h;
        });

        return {
          ...c,
          activeHabits: updatedHabits
        };
      }
      return c;
    }));
  };

  const handleToggleTodo = (todoId) => {
    if (!selectedCatId) return;

    setCats(prevCats => prevCats.map(c => {
      if (c.id === selectedCatId) {
        const updatedTodos = (c.activeTodos || []).map(t => {
          if (t.id === todoId) {
            return {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null
            };
          }
          return t;
        });

        return {
          ...c,
          activeTodos: updatedTodos
        };
      }
      return c;
    }));
  };

  const handleDeleteHabit = (habitId) => {
    if (!selectedCatId) return;

    setCats(prevCats => prevCats.map(c => {
      if (c.id === selectedCatId) {
        return {
          ...c,
          activeHabits: (c.activeHabits || []).filter(h => h.id !== habitId)
        };
      }
      return c;
    }));
  };

  const handleDeleteTodo = (todoId) => {
    if (!selectedCatId) return;

    setCats(prevCats => prevCats.map(c => {
      if (c.id === selectedCatId) {
        return {
          ...c,
          activeTodos: (c.activeTodos || []).filter(t => t.id !== todoId)
        };
      }
      return c;
    }));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgLight,
        color: COLORS.foreground,
        fontFamily: '"Quicksand", sans-serif',
        padding: isDesktop ? '10px' : '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#FFFFFF',
          padding: (isSignedIn && isDesktop) ? '50px 50px 50px 50px' : '45px 35px 35px 35px',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
          textAlign: 'center',
          maxWidth: (isSignedIn && isDesktop) ? (viewMode === 'detail' ? '1200px' : '1000px') : '440px',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.4s ease',
          margin: '0 auto'
        }}
      >
        {/* Top Control Bar */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          right: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '28px'
        }}>
          {/* Sign Out / User Menu */}
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
          <div style={{ flexGrow: 1 }} />

          {/* Language Selector */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              fontSize: '11px',
              backgroundColor: '#F9FAFB',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: '600',
              fontFamily: '"Quicksand", sans-serif',
              color: '#4B5563'
            }}
          >
            <option value="en">English</option>
            <option value="cat">Catinese</option>
          </select>
        </div>

        {/* SIGNED OUT STATE */}
        <Show when="signed-out">
          <h1
            style={{
              fontFamily: '"Lilita One", sans-serif',
              fontSize: '32px',
              color: COLORS.primary,
              margin: '20px 0 10px 0',
            }}
          >
            {active.title}
          </h1>
          <p style={{ margin: '0 0 30px 0', fontSize: '15px', color: '#666', lineHeight: '1.4' }}>
            Please identify yourself, human. Come in to start turning your boring documents into meow-velous insights!
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <SignInButton mode="modal">
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: `2px solid ${COLORS.primary}`,
                  color: COLORS.primary,
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'opacity 0.2s'
                }}
              >
                {active.signIn}
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: COLORS.primary,
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryDark}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
              >
                {active.signUp}
              </button>
            </SignUpButton>
          </div>
        </Show>

        {/* SIGNED IN STATE (MY CATS DASHBOARD) */}
        <Show when="signed-in">
          <div
            style={{
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              gap: '40px',
              alignItems: 'flex-start',
              justifyContent: 'center',
              marginTop: '15px'
            }}
          >
            {/* Left Column: 3D Cat Viewer & Color Selector */}
            {viewMode !== 'detail' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CatAvatar3D color={activeViewerColor} width={isDesktop ? 360 : 220} height={isDesktop ? 360 : 220} />

                {viewMode === 'add' && (
                  <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                      {active.avatarColor}
                    </p>
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                      {Object.keys(CAT_COLORS).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAvatarColor(c)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: CAT_COLORS[c].body,
                            border: avatarColor === c ? `3px solid ${COLORS.secondary}` : '2px solid #E5E7EB',
                            cursor: 'pointer',
                            transform: avatarColor === c ? 'scale(1.15)' : 'scale(1.0)',
                            transition: 'transform 0.2s, border 0.2s',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {viewMode === 'dashboard' && selectedCat && (
                  <div style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    backgroundColor: COLORS.bgLight,
                    color: COLORS.primaryDark,
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '20px'
                  }}>
                    {selectedCat.name} 🐾
                  </div>
                )}
              </div>
            )}

            {/* Right Column: Dynamic Content Panel */}
            <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {viewMode === 'add' && (
                /* ADD MODE FORM */
                <form onSubmit={handleSubmit} style={{ textAlign: 'left', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('dashboard')}
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
                      title={active.backToDashboard}
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
                    <h2
                      style={{
                        fontFamily: '"Lilita One", sans-serif',
                        fontSize: '32px',
                        color: COLORS.primary,
                        margin: 0
                      }}
                    >
                      {active.addPetTitle}
                    </h2>
                  </div>

                  {/* Name field */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
                      {active.catName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Whiskers"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #E5E7EB',
                        fontSize: '14px',
                        fontFamily: '"Quicksand", sans-serif',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border 0.2s'
                      }}
                      onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                      onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '25px' }}>
                    {/* Age field */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
                        {active.catAge}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        placeholder="2"
                        value={catAge}
                        onChange={(e) => setCatAge(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1.5px solid #E5E7EB',
                          fontSize: '14px',
                          fontFamily: '"Quicksand", sans-serif',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                        onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
                      />
                    </div>

                    {/* Weight field */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
                        {active.catWeight}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        step="0.1"
                        placeholder="4.2"
                        value={catWeight}
                        onChange={(e) => setCatWeight(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1.5px solid #E5E7EB',
                          fontSize: '14px',
                          fontFamily: '"Quicksand", sans-serif',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.border = `1.5px solid ${COLORS.primary}`}
                        onBlur={(e) => e.target.style.border = '1.5px solid #E5E7EB'}
                      />
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: COLORS.primary,
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'background-color 0.2s',
                      boxShadow: `0 4px 14px rgba(252, 163, 77, 0.3)`
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryDark}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
                  >
                    {active.saveBtn}
                  </button>
                </form>
              )}

              {viewMode === 'detail' && selectedCat && (
                <PetDetail
                  cat={selectedCat}
                  activeLocale={active}
                  onAddReport={handleAddReport}
                  onDeleteReport={handleDeleteReport}
                  onUpdateReport={handleUpdateReport}
                  onBack={() => setViewMode('dashboard')}
                  isDesktop={isDesktop}
                  onCommitCarePlan={handleCommitCarePlan}
                />
              )}

              {viewMode === 'dashboard' && (
                /* DASHBOARD VIEW MODE */
                <div style={{ textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2
                      style={{
                        fontFamily: '"Lilita One", sans-serif',
                        fontSize: '32px',
                        color: COLORS.primary,
                        margin: 0
                      }}
                    >
                      {active.dashboardTitle}
                    </h2>
                    <button
                      onClick={() => setViewMode('add')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: COLORS.primary,
                        border: 'none',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'background-color 0.2s',
                        boxShadow: `0 2px 8px rgba(252, 163, 77, 0.2)`
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryDark}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
                    >
                      {active.addNewCat}
                    </button>
                  </div>

                  {cats.length === 0 ? (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '16px',
                      border: '2px dashed #E5E7EB',
                      color: '#6B7280',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐈</div>
                      {active.emptyCats}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {selectedCat && (
                        <div style={{
                          padding: '20px',
                          backgroundColor: '#FDFBF7',
                          borderRadius: '16px',
                          border: `2.5px solid ${COLORS.bgLight}`,
                          position: 'relative'
                        }}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: COLORS.secondary, fontFamily: '"Lilita One", sans-serif' }}>
                            {selectedCat.name}
                          </h3>
                          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#4B5563', fontWeight: '500' }}>
                            <span>{active.catAgeLabel.replace('{age}', selectedCat.age || '0')}</span>
                            <span>•</span>
                            <span>{active.catWeightLabel.replace('{weight}', selectedCat.weight || '0')}</span>
                          </div>

                          <button
                            onClick={() => setViewMode('detail')}
                            style={{
                              marginTop: '15px',
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: COLORS.primary,
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              outline: 'none',
                              boxShadow: `0 2px 8px rgba(252, 163, 77, 0.2)`
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryDark}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
                          >
                            {active.viewDetails}
                          </button>
                        </div>
                      )}

                      {/* Daily Care Tracker */}
                      {selectedCat && ((selectedCat.activeHabits && selectedCat.activeHabits.length > 0) || (selectedCat.activeTodos && selectedCat.activeTodos.length > 0)) && (
                        <div style={{
                          padding: '20px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '16px',
                          border: `2px solid ${COLORS.bgLight}`,
                          boxShadow: '0 4px 12px rgba(253, 232, 209, 0.15)'
                        }}>
                          <h3 style={{
                            fontFamily: '"Lilita One", sans-serif',
                            fontSize: '20px',
                            color: COLORS.primary,
                            margin: '0 0 16px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {active.careTrackerTitle.replace('{name}', selectedCat.name)}
                          </h3>

                          {/* Habits Section */}
                          {selectedCat.activeHabits && selectedCat.activeHabits.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                              <h4 style={{
                                fontFamily: '"Lilita One", sans-serif',
                                fontSize: '15px',
                                color: COLORS.secondary,
                                margin: '0 0 10px 0'
                              }}>
                                {active.dailyHabits}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedCat.activeHabits.map((habit) => {
                                  const todayStr = new Date().toISOString().split('T')[0];
                                  const isCompletedToday = !!(habit.completions && habit.completions[todayStr]);
                                  return (
                                    <div
                                      key={habit.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        backgroundColor: isCompletedToday ? '#FFFBF7' : '#FAFAFA',
                                        borderRadius: '10px',
                                        border: isCompletedToday ? `1.5px solid ${COLORS.primary}` : '1.5px solid #F3F4F6',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <button
                                          onClick={() => handleToggleHabit(habit.id, todayStr)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            backgroundColor: isCompletedToday ? COLORS.primary : '#FFFFFF',
                                            border: `2.5px solid ${COLORS.primary}`,
                                            cursor: 'pointer',
                                            color: '#FFFFFF',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            flexShrink: 0,
                                            outline: 'none',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          {isCompletedToday ? '✓' : ''}
                                        </button>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            color: isCompletedToday ? '#6B7280' : '#1E1F22',
                                            textDecoration: isCompletedToday ? 'line-through' : 'none',
                                            lineHeight: '1.4'
                                          }}>
                                            {habit.title}
                                          </div>
                                          <div style={{
                                            fontSize: '10.5px',
                                            color: '#9CA3AF',
                                            marginTop: '2px',
                                            lineHeight: '1.4'
                                          }}>
                                            {habit.description}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '11.5px',
                                          fontWeight: '700',
                                          color: habit.streak > 0 ? '#FE7E3D' : '#9CA3AF',
                                          backgroundColor: habit.streak > 0 ? '#FFF7ED' : '#F3F4F6',
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          flexShrink: 0
                                        }}>
                                          🔥 {habit.streak || 0}
                                        </div>
                                        <button
                                          onClick={() => handleDeleteHabit(habit.id)}
                                          style={{
                                            padding: '2px 6px',
                                            backgroundColor: 'transparent',
                                            border: '1px solid #F3F4F6',
                                            color: '#EF4444',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
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
                                          {active.deleteCat}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* To-Dos Section */}
                          {selectedCat.activeTodos && selectedCat.activeTodos.length > 0 && (
                            <div>
                              <h4 style={{
                                fontFamily: '"Lilita One", sans-serif',
                                fontSize: '15px',
                                color: COLORS.secondary,
                                margin: '0 0 10px 0'
                              }}>
                                {active.oneOffTodos}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedCat.activeTodos.map((todo) => (
                                  <div
                                    key={todo.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '10px 12px',
                                      backgroundColor: todo.completed ? '#FFFBF7' : '#FAFAFA',
                                      borderRadius: '10px',
                                      border: todo.completed ? `1.5px solid ${COLORS.primary}` : '1.5px solid #F3F4F6',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                      <button
                                        onClick={() => handleToggleTodo(todo.id)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '4px',
                                          backgroundColor: todo.completed ? COLORS.primary : '#FFFFFF',
                                          border: `2.5px solid ${COLORS.primary}`,
                                          cursor: 'pointer',
                                          color: '#FFFFFF',
                                          fontSize: '11px',
                                          fontWeight: '900',
                                          marginRight: '10px',
                                          flexShrink: 0,
                                          outline: 'none',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        {todo.completed ? '✓' : ''}
                                      </button>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{
                                          fontWeight: '700',
                                          fontSize: '13px',
                                          color: todo.completed ? '#6B7280' : '#1E1F22',
                                          textDecoration: todo.completed ? 'line-through' : 'none',
                                          lineHeight: '1.4'
                                        }}>
                                          {todo.title}
                                        </div>
                                        <div style={{
                                          fontSize: '10.5px',
                                          color: '#9CA3AF',
                                          marginTop: '2px',
                                          lineHeight: '1.4'
                                        }}>
                                          {todo.description}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => handleDeleteTodo(todo.id)}
                                      style={{
                                        padding: '2px 6px',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #F3F4F6',
                                        color: '#EF4444',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        flexShrink: 0,
                                        marginLeft: '8px'
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
                                      {active.deleteCat}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          maxHeight: isDesktop ? '280px' : '220px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          paddingRight: '4px'
                        }}
                      >
                        {cats.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCatId(c.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: selectedCatId === c.id ? `2px solid ${COLORS.primary}` : '1.5px solid #E5E7EB',
                              backgroundColor: selectedCatId === c.id ? '#FFFBF7' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: CAT_COLORS[c.color]?.body || '#E8943A',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)'
                              }} />
                              <span style={{ fontWeight: '600', fontSize: '15px', color: '#1E1F22' }}>
                                {c.name}
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleDeleteCat(c.id, e)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: 'transparent',
                                border: '1.5px solid #F3F4F6',
                                color: '#EF4444',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
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
                              {active.deleteCat}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
