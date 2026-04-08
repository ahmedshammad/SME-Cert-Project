import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './state/auth';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { IssuerLayout } from './layouts/IssuerLayout';
import { HolderLayout } from './layouts/HolderLayout';
import { VerifierLayout } from './layouts/VerifierLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyPage } from './pages/public/VerifyPage';
import { WhyBlockchainPage } from './pages/public/WhyBlockchainPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { DocumentationPage } from './pages/public/DocumentationPage';
import { PricingPage } from './pages/public/PricingPage';
import { DeploymentPage } from './pages/public/DeploymentPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { OnboardingPage } from './pages/public/OnboardingPage';
import { BlockchainExplorerPage } from './pages/public/BlockchainExplorerPage';

// Issuer Portal Pages
import { IssuerDashboard } from './pages/issuer/Dashboard';
import { TemplateBuilder } from './pages/issuer/TemplateBuilder';
import { IssueCertificate } from './pages/issuer/IssueCertificate';
import { RevocationManagement } from './pages/issuer/RevocationManagement';
import { BulkIssue } from './pages/issuer/BulkIssue';

// Holder Portal Pages
import { HolderDashboard } from './pages/holder/Dashboard';
import { CertificateDetails } from './pages/holder/CertificateDetails';
import { ShareCenter } from './pages/holder/ShareCenter';
import { WalletSettings } from './pages/holder/WalletSettings';

// Verifier Portal Pages
import { VerifierDashboard } from './pages/verifier/Dashboard';
import { VerificationHistory } from './pages/verifier/VerificationHistory';

// i18n
import './i18n/config';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:certId" element={<VerifyPage />} />
            <Route path="/why-blockchain" element={<WhyBlockchainPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/deployment" element={<DeploymentPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/blockchain" element={<BlockchainExplorerPage />} />
          </Route>

          {/* Issuer Portal */}
          <Route
            path="/issuer/*"
            element={
              <ProtectedRoute requiredRole="ISSUER_ADMIN">
                <IssuerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<IssuerDashboard />} />
            <Route path="templates" element={<TemplateBuilder />} />
            <Route path="issue" element={<IssueCertificate />} />
            <Route path="bulk-issue" element={<BulkIssue />} />
            <Route path="revoke" element={<RevocationManagement />} />
          </Route>

          {/* Holder Portal */}
          <Route
            path="/holder/*"
            element={
              <ProtectedRoute requiredRole="SME_USER">
                <HolderLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HolderDashboard />} />
            <Route path="certificate/:certId" element={<CertificateDetails />} />
            <Route path="share" element={<ShareCenter />} />
            <Route path="wallet" element={<WalletSettings />} />
          </Route>

          {/* Verifier Portal */}
          <Route
            path="/verifier/*"
            element={
              <ProtectedRoute requiredRole="VERIFIER_USER">
                <VerifierLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<VerifierDashboard />} />
            <Route path="history" element={<VerificationHistory />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
