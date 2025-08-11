import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import { MessageContainer } from './components/Message';
import Help from './pages/Help';
import Home from './pages/Home';
import JobsList from './pages/JobsList';
import JobsNew from './pages/JobsNew';
import Login from './pages/Login';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import UserAgreement from './pages/UserAgreement';
import './styles.css';
const PromptBank = Tasks;
const Reviews = Help;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/home" element={<Home />} />
          <Route path="/jobs/new" element={<JobsNew />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/prompts" element={<PromptBank />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/help" element={<Help />} />
          <Route path="/legal/user-agreement" element={<UserAgreement />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
      <MessageContainer />
    </BrowserRouter>
  </React.StrictMode>,
);


