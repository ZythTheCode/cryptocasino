import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import TreePage from './pages/TreePage';
import CasinoPage from './pages/CasinoPage';
import WalletPage from './pages/WalletPage';
import TopUpPage from './pages/TopUpPage';
import WithdrawPage from './pages/WithdrawPage';
import AdminDashboard from './pages/AdminDashboard';
import TestSupabase from './pages/TestSupabase';
import MigrationPage from './pages/MigrationPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/casino" element={<CasinoPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/topup" element={<TopUpPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/test-supabase" element={<TestSupabase />} />
          <Route path="/migrate" element={<MigrationPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;