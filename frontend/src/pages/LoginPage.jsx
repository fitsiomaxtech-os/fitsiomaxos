import { useState } from "react";
import { Activity, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiLogin } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1764314138160-5f04f4a50dae?crop=entropy&cs=srgb&fm=jpg&q=85";

export const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@physiofit.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const loginResponse = await apiLogin(email, password);
      onLogin(loginResponse);
      toast.success("Welcome to PhysioFit CRM");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8 md:py-8" data-testid="login-page">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="flex items-center justify-center p-6 md:p-10" data-testid="login-form-container">
          <Card className="w-full max-w-xl border-slate-100 shadow-none" data-testid="login-form-card">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3" data-testid="login-branding-row">
                <div className="rounded-md bg-slate-900 p-2 text-slate-100">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500" data-testid="login-brand-subtitle">
                    Physiotherapy & Fitness
                  </p>
                  <h1 className="font-heading text-4xl font-bold text-slate-900" data-testid="login-brand-title">
                    PhysioFit CRM
                  </h1>
                </div>
              </div>
              <p className="text-sm text-slate-600" data-testid="login-welcome-text">
                Login with your assigned role. Super Admin can manage branches, teams, and Google Sheets mapping.
              </p>
              <Tabs defaultValue="super_admin" data-testid="login-role-tabs">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-slate-100 p-1">
                  <TabsTrigger value="super_admin" className="gap-1" data-testid="login-role-super-admin-tab">
                    <ShieldCheck className="h-4 w-4" /> Super Admin
                  </TabsTrigger>
                  <TabsTrigger value="pre_sales" className="gap-1" data-testid="login-role-pre-sales-tab">
                    <UsersRound className="h-4 w-4" /> Pre-sales
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="gap-1" data-testid="login-role-sales-tab">
                    <UserRound className="h-4 w-4" /> Sales
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitLogin} data-testid="login-form">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" data-testid="login-email-label">
                    Email
                  </label>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-10 border-slate-200"
                    data-testid="login-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" data-testid="login-password-label">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-10 border-slate-200"
                    data-testid="login-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 w-full bg-slate-900 text-slate-100 hover:bg-slate-800"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? "Signing in..." : "Login to CRM"}
                </Button>
                <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600" data-testid="login-demo-credentials">
                  <p data-testid="login-demo-super-admin">Super Admin: <strong>admin@physiofit.com / admin123</strong></p>
                  <p data-testid="login-demo-pre-sales">Pre-sales: <strong>presales@physiofit.com / presales123</strong></p>
                  <p data-testid="login-demo-sales">Sales: <strong>sales@physiofit.com / sales123</strong></p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="relative hidden lg:block" data-testid="login-hero-panel">
          <img src={HERO_IMAGE} alt="Physiotherapy session" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-slate-900/40 p-10">
            <div className="mt-auto rounded-xl border border-white/25 bg-white/20 p-6 backdrop-blur-md" data-testid="login-hero-overlay">
              <h2 className="font-heading text-base text-white md:text-lg" data-testid="login-hero-title">
                Convert new leads into appointments and package sales with branch-level visibility.
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
