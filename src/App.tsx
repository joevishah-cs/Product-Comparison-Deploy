import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { SelectionProvider } from "@/features/selection/SelectionProvider";
import { AiAdvisorProvider } from "@/features/ai/AiAdvisorProvider";
import { HomeownerProvider } from "@/features/homeowner/HomeownerProvider";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProductExplorerPage } from "@/features/explorer/ProductExplorerPage";
import { ComparePage } from "@/features/compare/ComparePage";
import { ReviewsPage } from "@/features/reviews/ReviewsPage";
import { AnalystPage } from "@/features/analyst/AnalystPage";
import { PressPage } from "@/features/press/PressPage";
import { BriefsPage } from "@/features/briefs/BriefsPage";
import { SavedComparisonsPage } from "@/features/saved/SavedComparisonsPage";
import { ReportSharePage } from "@/features/homeowner/ReportSharePage";


function RequireAuth() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-center">
          <img src="/brand/daikin-logo.png" alt="Daikin" className="mx-auto h-8 w-auto opacity-80" />
          <p className="mt-4 text-sm text-navy-500">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={180} skipDelayDuration={300}>
        <ToastProvider>
          <AuthProvider>
            <SelectionProvider>
              <AiAdvisorProvider>
                <HomeownerProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  {/* Read-only shared homeowner report — intentionally outside auth. */}
                  <Route path="/report" element={<ReportSharePage />} />
                  <Route element={<RequireAuth />}>
                    <Route element={<AppShell />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/compare" element={<ComparePage />} />
                      <Route path="/explorer" element={<ProductExplorerPage />} />
                      <Route path="/analyst" element={<AnalystPage />} />
                      <Route path="/press" element={<PressPage />} />
                      <Route path="/reviews" element={<ReviewsPage />} />
                      <Route path="/briefs" element={<BriefsPage />} />
                      <Route path="/saved" element={<SavedComparisonsPage />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                </HomeownerProvider>
              </AiAdvisorProvider>
            </SelectionProvider>
          </AuthProvider>
        </ToastProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}
