import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import { MessageContainer } from './components/Message';
import AdsManagementList from './pages/AdsManagementList';
import AdsPixel from './pages/AdsPixel';
import AIRecords from './pages/AIRecords';
import Asr from './pages/Asr';
import DockerMonitorList from './pages/DockerMonitorList';
import Help from './pages/Help';
import Home from './pages/Home';
import JobsList from './pages/JobsList';
import JobsNew from './pages/JobsNew';
import License from './pages/LegalPages/License';
import Login from './pages/Login';
import LogsList from './pages/LogsList';
import ModelsList from './pages/ModelsList';
import OperationLogsList from './pages/OperationLogsList';
import PresetQuestionsList from './pages/PresetQuestionsList';
import PrivacyPolicy from './pages/LegalPages/PrivacyPolicy';
import QuestionsList from './pages/QuestionsList';
import ReviewDetail from './pages/Reviews/ReviewDetail';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import UserAgreement from './pages/LegalPages/UserAgreement';
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
          <Route path="/questions" element={<QuestionsList />} />
          <Route path="/settings/preset-questions" element={<PresetQuestionsList />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/help" element={<Help />} />
          <Route path="/legal/user-agreement" element={<UserAgreement />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/models" element={<ModelsList />} />
          <Route path="/settings/asr" element={<Asr />} />
          <Route path="/settings/logs" element={<LogsList />} />
          <Route path="/settings/vector-knowledge" element={<VectorKnowledge />} />
          <Route path="/settings/ai-records" element={<AIRecords />} />
          <Route path="/settings/license" element={<License />} />
          <Route path="/settings/docker-monitor" element={<DockerMonitorList />} />
          <Route path="/settings/operation-logs" element={<OperationLogsList />} />
          <Route path="/settings/pixel-ads" element={<AdsPixel />} />
          <Route path="/settings/ads-management" element={<AdsManagementList />} />
        </Route>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
      <MessageContainer />
    </BrowserRouter>
  </React.StrictMode>,
);
