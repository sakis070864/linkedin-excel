import React, { useState } from "react";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { SCOPES } from "./constants";
import Dashboard from "./components/Dashboard";
import { ShieldCheck, Layout, AlertCircle, Copy, ExternalLink, RefreshCw, Smartphone } from "lucide-react";

const App: React.FC = () => {
  const { instance, inProgress } = useMsal();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [missingUri, setMissingUri] = useState<string | null>(null);
  const [isDeviceError, setIsDeviceError] = useState<boolean>(false);
  
  // NEW: Manual Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const handleLogin = async () => {
    // Login logic kept for reference but not attached to the button in this preview version
    if (inProgress !== InteractionStatus.None) return;

    setLoginError(null);
    setMissingUri(null);
    setIsDeviceError(false);

    try {
      const response = await instance.loginPopup({
        ...SCOPES,
        prompt: "select_account",
      });
      instance.setActiveAccount(response.account);
    } catch (e: any) {
      console.error("Login failed:", e);
      let errorMessage = e.message || "Authentication failed.";
      
      if (errorMessage.includes("user_cancelled") || errorMessage.includes("User cancelled the flow")) {
        errorMessage = "The login process was cancelled by the user.";
      }
      else if (errorMessage.includes("AADSTS50011")) {
        const match = errorMessage.match(/The redirect URI '([^']+)'/);
        const url = match ? match[1] : window.location.origin;
        setMissingUri(url);
        errorMessage = "Error: 'Redirect URI Mismatch'.";
      } 
      else if (errorMessage.includes("device") || errorMessage.includes("AADSTS50158")) {
        setIsDeviceError(true);
        errorMessage = "Your organization requires device compliance.";
      }

      setLoginError(errorMessage);
    }
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    localStorage.clear();
    instance.clearCache();
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("URL copied!");
  };

  // If Demo Mode is active, show the Dashboard immediately
  if (isDemoMode) {
    return <Dashboard demoMode={true} />;
  }

  return (
    <>
      <AuthenticatedTemplate>
        <Dashboard />
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Layout size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Excel Intelligence</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Sign in with your Microsoft account or try the Demo.
            </p>
            
            {loginError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm text-left shadow-sm">
                <div className="flex items-start gap-2 mb-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="font-bold">{loginError}</span>
                </div>
                {/* Error details */}
                {missingUri && (
                     <div className="mt-2 text-xs">
                        <p className="font-semibold">Missing URL:</p>
                        <code className="bg-white p-1 block mt-1 border">{missingUri}</code>
                     </div>
                )}
              </div>
            )}
            
            {/* DISABLED LOGIN BUTTON WITH TOOLTIP */}
            <div className="relative group w-full mb-4">
                <button
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 cursor-not-allowed opacity-90"
                onClick={(e) => e.preventDefault()}
                >
                <ShieldCheck size={20} />
                Sign in with Microsoft
                </button>
                
                {/* Tooltip Popup */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-sm rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none text-center z-50 border border-slate-700 transform translate-y-2 group-hover:translate-y-0">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <AlertCircle size={14} />
                            <span>Restricted Access</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                            This feature is available in the full application only. Please use <b>Demo Mode</b> for this preview.
                        </p>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                </div>
            </div>

            {/* DEMO BUTTON */}
            <button
              onClick={() => setIsDemoMode(true)}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
            >
              <Smartphone size={20} />
              Enter Demo Mode (No Login)
            </button>
            
            <p className="mt-6 text-xs text-slate-400">
              Mock Data Enabled • 2024-2025 Financials
            </p>
          </div>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
};

export default App;