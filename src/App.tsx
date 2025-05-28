import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Index from "./pages/Index"
import CasinoPage from "./pages/CasinoPage"
import TreePage from "./pages/TreePage"
import WalletPage from "./pages/WalletPage"
import TopUpPage from "./pages/TopUpPage"
import WithdrawPage from "./pages/WithdrawPage"
import TopUpWithdrawPage from "./pages/TopUpWithdrawPage"
import NotFound from "./pages/NotFound"
import AdminDashboard from "./pages/AdminDashboard"
import TestSupabase from "./pages/TestSupabase"
import MigrationPage from "./pages/MigrationPage"
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/casino" element={<CasinoPage />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/topup" element={<TopUpPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/topup-withdraw" element={<TopUpWithdrawPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/test-supabase" element={<TestSupabase />} />
          <Route path="/migration" element={<MigrationPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  )
}

export default App