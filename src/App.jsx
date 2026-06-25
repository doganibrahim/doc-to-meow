import React, { useState } from 'react';
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton
} from '@clerk/react';
import { COLORS } from './constants/theme';

import { en } from './constants/locales/en';
import { cat } from './constants/locales/cat';

function App() {
  const [lang, setLang] = useState('en');

  const texts = { en, cat };
  const active = texts[lang];

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
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: '#FFFFFF',
          padding: '45px 40px 40px 40px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}
      >
        {/* Language Selector Dropdown */}
        <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
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

        <h1
          style={{
            fontFamily: '"Lilita One", sans-serif',
            fontSize: '32px',
            color: COLORS.primary,
            margin: '0 0 10px 0',
          }}
        >
          {active.title}
        </h1>
        <p style={{ margin: '0 0 30px 0', fontSize: '15px', color: '#666', lineHeight: '1.4' }}>
          {active.desc}
        </p>

        <Show when="signed-out">
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

        <Show when="signed-in">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>{active.signedIn}</p>
            <UserButton afterSignOutUrl="/" />
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
