import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import { MessageContainer } from './components/Message';
import AdsManagement from './pages/AdsManagement';
import AdsPixel from './pages/AdsPixel';
import Asr from './pages/Asr';
import Help from './pages/Help';
import Home from './pages/Home';
import JobsList from './pages/JobsList';
import JobsNew from './pages/JobsNew';
import License from './pages/License';
import Login from './pages/Login';
import Logs from './pages/Logs';
import Models from './pages/Models';
import OperationLogs from './pages/OperationLogs';
import PresetQuestions from './pages/PresetQuestions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Questions from './pages/Questions';
import ReviewDetail from './pages/ReviewDetail';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import UserAgreement from './pages/UserAgreement';
import VectorKnowledge from './pages/VectorKnowledge';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/jobs/new" element={<JobsNew />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/preset-questions" element={<PresetQuestions />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/help" element={<Help />} />
          <Route path="/legal/user-agreement" element={<UserAgreement />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/models" element={<Models />} />
          <Route path="/settings/asr" element={<Asr />} />
          <Route path="/settings/logs" element={<Logs />} />
          <Route path="/settings/vector-knowledge" element={<VectorKnowledge />} />
          <Route path="/settings/license" element={<License />} />
          <Route path="/operation-logs" element={<OperationLogs />} />
          <Route path="/pixel-ads" element={<AdsPixel />} />
          <Route path="/ads-management" element={<AdsManagement />} />
        </Route>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
      <MessageContainer />
    </BrowserRouter>
  </React.StrictMode>,
);
