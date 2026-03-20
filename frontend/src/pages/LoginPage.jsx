import { useState } from "react";
import { ShieldCheck, UserRound, Waves } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiLogin } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_therapy-crm-board/artifacts/u4bafq34_Fitsiomax-logo.webp";

export const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@fitsiomax.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiLogin(email, password);
      onLogin(response);
      toast.success("Welcome to FITSIOMAX Appointment CRM View");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f2a4f,#020817_60%)] px-4 py-6 md:px-8 md:py-8" data-testid="login-page">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-2xl border border-sky-500/20 bg-slate-950/70 shadow-2xl backdrop-blur-md lg:grid-cols-2">
        <div className="flex items-center justify-center p-6 md:p-10" data-testid="login-form-pane">
          <Card className="w-full max-w-xl border-slate-800 bg-slate-900/80 text-slate-100" data-testid="login-card">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3" data-testid="login-brand-row">
                <div className="rounded-lg bg-white p-1" data-testid="login-logo-wrap">
                  <img src={LOGO_URL} alt="FITSIOMAX" className="h-12 w-12 object-contain" data-testid="login-logo-image" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-300" data-testid="login-brand-subtitle">
                    Physio Care & Fitness Centre
                  </p>
                  <h1 className="font-heading text-4xl font-bold text-white" data-testid="login-brand-title">
                    FITSIOMAX CRM View
                  </h1>
                </div>
              </div>
              <p className="text-sm text-slate-300" data-testid="login-description">
                Appointment Book System with role-based lead routing and doctor calendar booking.
              </p>

              <Tabs defaultValue="super_admin" data-testid="login-role-tabs">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-slate-800 p-1">
                  <TabsTrigger value="super_admin" className="gap-1" data-testid="role-super-admin-tab">
                    <ShieldCheck className="h-4 w-4" /> Super Admin
                  </TabsTrigger>
                  <TabsTrigger value="online" className="gap-1" data-testid="role-online-tab">
                    <Waves className="h-4 w-4" /> Online
                  </TabsTrigger>
                  <TabsTrigger value="offline" className="gap-1" data-testid="role-offline-tab">
                    <UserRound className="h-4 w-4" /> Offline
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300" data-testid="login-email-label">
                    Email
                  </label>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="border-slate-700 bg-slate-950 text-slate-100"
                    placeholder="your@fitsiomax.com"
                    data-testid="login-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300" data-testid="login-password-label">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="border-slate-700 bg-slate-950 text-slate-100"
                    placeholder="••••••••"
                    data-testid="login-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400"
                  data-testid="login-submit-button"
                >
                  {loading ? "Signing in..." : "Enter CRM View"}
                </Button>
              </form>

              <div className="mt-4 rounded-md border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300" data-testid="login-demo-accounts">
                <p><strong>Super Admin:</strong> admin@fitsiomax.com / admin123</p>
                <p><strong>Online Fitness:</strong> onlinefitness@fitsiomax.com / online123</p>
                <p><strong>Online Physio:</strong> onlinephysio@fitsiomax.com / physio123</p>
                <p><strong>Offline Physio:</strong> offlinephysio@fitsiomax.com / offline123</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden p-10 lg:flex" data-testid="login-right-pane">
          <div className="flex w-full flex-col justify-end rounded-2xl border border-sky-500/30 bg-[linear-gradient(150deg,#0f172a,#0b2e56)] p-8">
            <h2 className="font-heading text-4xl text-white" data-testid="login-right-title">
              Appointment Book System
            </h2>
            <p className="mt-3 text-sm text-slate-200" data-testid="login-right-description">
              Route leads from manual/Google Sheet sources to Online Fitness, Online Physio, and Offline Physio,
              then book slots directly from each doctor calendar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
