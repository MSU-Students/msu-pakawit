import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RegistrationPage } from './modules/auth/RegistrationPage';
import './index.css';

const query = new URLSearchParams(window.location.search);
const verificationToken = query.get('verifyEmail');
const showRegistration = query.has('register');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {verificationToken || showRegistration
      ? <RegistrationPage verificationToken={verificationToken ?? undefined} />
      : <App />}
  </React.StrictMode>
);
