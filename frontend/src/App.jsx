import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Public pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

// Dashboards
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExaminerDashboard from './pages/ExaminerDashboard';

// Shared / role-gated
import QuestionBank from './pages/QuestionBank';
import ExamList from './pages/ExamList';
import CreateExam from './pages/CreateExam';
import ExamInstructions from './pages/ExamInstructions';
import TakeExam from './pages/TakeExam';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import ExamResults from './pages/ExamResults';
import LiveProctoring from './pages/LiveProctoring';
import Evaluations from './pages/Evaluations';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin')    return <AdminDashboard />;
  if (user?.role === 'examiner') return <ExaminerDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Authenticated – role-conditional dashboard at root */}
      <Route path="/"
        element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>}
      />

      {/* Exams */}
      <Route path="/exams"
        element={<ProtectedRoute><ExamList /></ProtectedRoute>}
      />
      <Route path="/exams/new"
        element={<ProtectedRoute roles={['admin','examiner']}><CreateExam /></ProtectedRoute>}
      />
      <Route path="/exams/:examId/instructions"
        element={<ProtectedRoute roles={['student']}><ExamInstructions /></ProtectedRoute>}
      />
      <Route path="/exams/:examId/results"
        element={<ProtectedRoute roles={['admin','examiner']}><ExamResults /></ProtectedRoute>}
      />
      <Route path="/exams/:examId/proctoring"
        element={<ProtectedRoute roles={['admin','examiner']}><LiveProctoring /></ProtectedRoute>}
      />

      {/* Taking an exam */}
      <Route path="/attempts/:attemptId"
        element={<ProtectedRoute roles={['student']}><TakeExam /></ProtectedRoute>}
      />

      {/* Student results */}
      <Route path="/results"
        element={<ProtectedRoute roles={['student']}><Results /></ProtectedRoute>}
      />
      <Route path="/results/:id"
        element={<ProtectedRoute><ResultDetail /></ProtectedRoute>}
      />

      {/* Examiner / Admin */}
      <Route path="/questions"
        element={<ProtectedRoute roles={['admin','examiner']}><QuestionBank /></ProtectedRoute>}
      />
      <Route path="/evaluations"
        element={<ProtectedRoute roles={['admin','examiner']}><Evaluations /></ProtectedRoute>}
      />

      {/* Admin only */}
      <Route path="/users"
        element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>}
      />
      <Route path="/analytics"
        element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>}
      />

      {/* All authenticated */}
      <Route path="/notifications"
        element={<ProtectedRoute><Notifications /></ProtectedRoute>}
      />
      <Route path="/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
