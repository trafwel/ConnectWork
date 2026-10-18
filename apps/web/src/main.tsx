/**
 * M0 — Web entry point · done
 *
 * WHAT THIS ACHIEVES
 *   Mounts the React app into index.html's #root and loads the global styles.
 *
 * HOW IT FITS
 *   index.html → main.tsx → App.tsx. StrictMode runs effects twice in development
 *   to surface bugs; that's why seeding (db/seed.ts) memoizes its promise.
 *
 * HOW IT WAS BUILT
 *   1. createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>).
 *   2. import './index.css' (Tailwind + shadcn theme variables).
 *
 * Guide: §4.4
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './themes.css'; // Oct 18: Spiderweb and Phantom styles, after index.css so they win ties
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
