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

  // Form State
  const [catName, setCatName] = useState('');
  const [catAge, setCatAge] = useState('');
  const [catWeight, setCatWeight] = useState('');
  const [avatarColor, setAvatarColor] = useState('orange');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const texts = { en, cat };
  const active = texts[lang];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setCatName('');
    setCatAge('');
    setCatWeight('');
    setAvatarColor('orange');
    setIsSubmitted(false);
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
          maxWidth: (isSignedIn && isDesktop) ? '1000px' : '440px',
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
                onMouseOver={(e) => e.target.style.backgroundColor = COLORS.primaryDark}
                onMouseOut={(e) => e.target.style.backgroundColor = COLORS.primary}
              >
                {active.signUp}
              </button>
            </SignUpButton>
          </div>
        </Show>

        {/* SIGNED IN STATE (ADD PET INTERFACE) */}
        <Show when="signed-in">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: '15px' }}>
              <h2
                style={{
                  fontFamily: '"Lilita One", sans-serif',
                  fontSize: '32px',
                  color: COLORS.primary,
                  margin: '0 0 20px 0',
                  textAlign: 'center'
                }}
              >
                {active.addPetTitle}
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: isDesktop ? 'row' : 'column',
                  gap: '40px',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Left Column: Avatar & Colors */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Three.js Canvas Container */}
                  <CatAvatar3D color={avatarColor} width={isDesktop ? 360 : 220} height={isDesktop ? 360 : 220} />

                  {/* Avatar Color Selector */}
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
                </div>

                {/* Right Column: Form Fields */}
                <div style={{ flex: 1, width: '100%' }}>
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

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
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
                    onMouseOver={(e) => e.target.style.backgroundColor = COLORS.primaryDark}
                    onMouseOut={(e) => e.target.style.backgroundColor = COLORS.primary}
                  >
                    {active.saveBtn}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', animate: 'bounce' }}>😻</div>
              <h2
                style={{
                  fontFamily: '"Lilita One", sans-serif',
                  fontSize: '26px',
                  color: COLORS.primary,
                  margin: '0 0 15px 0'
                }}
              >
                {active.successMsg.replace('{name}', catName)}
              </h2>

              <button
                onClick={handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: COLORS.primary,
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  marginTop: '10px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = COLORS.primaryDark}
                onMouseOut={(e) => e.target.style.backgroundColor = COLORS.primary}
              >
                {active.addAnother}
              </button>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}

export default App;
