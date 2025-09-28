import { BarChart3, Clock, Target, TrendingUp, FileText, Download, Share2, Star, Award, Brain } from 'lucide-react';
import { useState } from 'react';
import { InterviewQuestion } from './InterviewHistory';

export interface InterviewReportData {
  interviewId: string;
  position: string;
  duration: number;
  totalQuestions: number;
  completedQuestions: number;
  averageScore: number;
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  skillAnalysis: {
    technical: number;
    communication: number;
    problemSolving: number;
    leadership: number;
    creativity: number;
  };
  questions: InterviewQuestion[];
  startTime: number;
  endTime: number;
}

interface InterviewReportProps {
  reportData: InterviewReportData;
  onExport?: (format: 'pdf' | 'word' | 'txt') => void;
  onShare?: () => void;
  className?: string;
}

export function InterviewReport({
  reportData,
  onExport,
  onShare,
  className = ''
}: InterviewReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'analysis'>('overview');

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const getScoreLevel = (score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 90) return { label: '优秀', color: '#059669', bgColor: '#ecfdf5' };
    if (score >= 80) return { label: '良好', color: '#0891b2', bgColor: '#f0f9ff' };
    if (score >= 70) return { label: '中等', color: '#ca8a04', bgColor: '#fefce8' };
    if (score >= 60) return { label: '及格', color: '#ea580c', bgColor: '#fff7ed' };
    return { label: '待提升', color: '#dc2626', bgColor: '#fef2f2' };
  };

  const scoreLevel = getScoreLevel(reportData.averageScore);

  const completionRate = (reportData.completedQuestions / reportData.totalQuestions) * 100;

  const renderOverview = () => (
    <div className="report-overview">
      {/* 基本信息 */}
      <div className="overview-header">
        <div className="report-title">
          <h2>{reportData.position} 模拟面试报告</h2>
          <div className="report-meta">
            <span>面试时间: {new Date(reportData.startTime).toLocaleString()}</span>
            <span>总用时: {formatDuration(reportData.duration)}</span>
          </div>
        </div>
        <div className="overall-score">
          <div
            className="score-circle"
            style={{ background: scoreLevel.bgColor, color: scoreLevel.color }}
          >
            <span className="score-number">{reportData.averageScore}</span>
            <span className="score-label">{scoreLevel.label}</span>
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="key-metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <Target size={24} color="#3b82f6" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{completionRate.toFixed(1)}%</div>
            <div className="metric-label">完成率</div>
            <div className="metric-detail">{reportData.completedQuestions}/{reportData.totalQuestions} 题</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Clock size={24} color="#10b981" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{Math.round(reportData.duration / reportData.totalQuestions)}秒</div>
            <div className="metric-label">平均答题时间</div>
            <div className="metric-detail">总用时 {formatDuration(reportData.duration)}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Star size={24} color="#f59e0b" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{reportData.averageScore}</div>
            <div className="metric-label">平均得分</div>
            <div className="metric-detail">{scoreLevel.label}水平</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} color="#8b5cf6" />
          </div>
          <div className="metric-content">
            <div className="metric-value">{reportData.questions.filter(q => q.analysis?.score && q.analysis.score >= 80).length}</div>
            <div className="metric-label">优秀回答</div>
            <div className="metric-detail">≥80分题目数</div>
          </div>
        </div>
      </div>

      {/* 技能雷达图 */}
      <div className="skills-radar">
        <h3>能力分析</h3>
        <div className="radar-container">
          <div className="skill-item">
            <span className="skill-label">技术能力</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${reportData.skillAnalysis.technical}%` }}
              />
            </div>
            <span className="skill-score">{reportData.skillAnalysis.technical}分</span>
          </div>
          <div className="skill-item">
            <span className="skill-label">沟通能力</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${reportData.skillAnalysis.communication}%` }}
              />
            </div>
            <span className="skill-score">{reportData.skillAnalysis.communication}分</span>
          </div>
          <div className="skill-item">
            <span className="skill-label">问题解决</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${reportData.skillAnalysis.problemSolving}%` }}
              />
            </div>
            <span className="skill-score">{reportData.skillAnalysis.problemSolving}分</span>
          </div>
          <div className="skill-item">
            <span className="skill-label">领导力</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${reportData.skillAnalysis.leadership}%` }}
              />
            </div>
            <span className="skill-score">{reportData.skillAnalysis.leadership}分</span>
          </div>
          <div className="skill-item">
            <span className="skill-label">创新思维</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${reportData.skillAnalysis.creativity}%` }}
              />
            </div>
            <span className="skill-score">{reportData.skillAnalysis.creativity}分</span>
          </div>
        </div>
      </div>

      {/* 总体评价 */}
      <div className="overall-assessment">
        <h3>总体评价</h3>
        <div className="assessment-content">
          {reportData.overallAssessment}
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="report-questions">
      <div className="questions-header">
        <h3>题目回顾</h3>
        <div className="questions-stats">
          <span>共 {reportData.totalQuestions} 题，完成 {reportData.completedQuestions} 题</span>
        </div>
      </div>
      <div className="questions-list">
        {reportData.questions.map((question, index) => (
          <div key={index} className="question-summary">
            <div className="question-header">
              <span className="question-number">Q{index + 1}</span>
              <div className="question-score">
                {question.analysis?.score ? (
                  <span
                    className="score-badge"
                    style={{
                      background: getScoreLevel(question.analysis.score).bgColor,
                      color: getScoreLevel(question.analysis.score).color
                    }}
                  >
                    {question.analysis.score}分
                  </span>
                ) : (
                  <span className="no-score">未评分</span>
                )}
              </div>
            </div>
            <div className="question-content">
              <div className="question-text">{question.question}</div>
              {question.userResponse && (
                <div className="user-answer">
                  <strong>您的回答：</strong>
                  {question.userResponse.length > 100
                    ? `${question.userResponse.substring(0, 100)}...`
                    : question.userResponse}
                </div>
              )}
              {question.analysis?.assessment && (
                <div className="question-assessment">
                  <strong>评价：</strong>
                  {question.analysis.assessment}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="report-analysis">
      {/* 优势分析 */}
      <div className="analysis-section strengths">
        <div className="section-header">
          <Award size={20} color="#10b981" />
          <h3>表现优势</h3>
        </div>
        <div className="section-content">
          {reportData.strengths.map((strength, index) => (
            <div key={index} className="analysis-item positive">
              <span className="item-bullet">+</span>
              <span className="item-text">{strength}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 待改进点 */}
      <div className="analysis-section weaknesses">
        <div className="section-header">
          <Target size={20} color="#f59e0b" />
          <h3>待改进点</h3>
        </div>
        <div className="section-content">
          {reportData.weaknesses.map((weakness, index) => (
            <div key={index} className="analysis-item negative">
              <span className="item-bullet">-</span>
              <span className="item-text">{weakness}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 改进建议 */}
      <div className="analysis-section recommendations">
        <div className="section-header">
          <Brain size={20} color="#3b82f6" />
          <h3>改进建议</h3>
        </div>
        <div className="section-content">
          {reportData.recommendations.map((recommendation, index) => (
            <div key={index} className="analysis-item suggestion">
              <span className="item-number">{index + 1}</span>
              <span className="item-text">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`interview-report ${className}`}>
      {/* 报告头部 */}
      <div className="report-header">
        <div className="header-title">
          <FileText size={24} />
          <span>面试报告</span>
        </div>
        <div className="header-actions">
          {onShare && (
            <button className="action-button share-button" onClick={onShare}>
              <Share2 size={16} />
              分享
            </button>
          )}
          {onExport && (
            <div className="export-dropdown">
              <button className="action-button export-button">
                <Download size={16} />
                导出
              </button>
              <div className="dropdown-menu">
                <button onClick={() => onExport('pdf')}>导出为PDF</button>
                <button onClick={() => onExport('word')}>导出为Word</button>
                <button onClick={() => onExport('txt')}>导出为文本</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="report-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          总览
        </button>
        <button
          className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <FileText size={16} />
          题目回顾
        </button>
        <button
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <Brain size={16} />
          详细分析
        </button>
      </div>

      {/* 报告内容 */}
      <div className="report-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'questions' && renderQuestions()}
        {activeTab === 'analysis' && renderAnalysis()}
      </div>
    </div>
  );
}