import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Play } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } else if (localStorage.getItem('token')) {
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  const handleLogin = () => {
    // Redirect to backend OAuth route
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-3xl" />

      <div className="card p-12 max-w-md w-full relative z-10 text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-2xl mb-8 transform hover:scale-105 transition-transform">
          <Sparkles className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Automate Your Shorts</h1>
        <p className="text-slate-400 mb-8 max-w-[260px]">
          Upload a long video and let AI create 10 viral YouTube Shorts for you automatically.
        </p>

        <button 
          onClick={handleLogin}
          className="w-full relative group bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200 overflow-hidden flex items-center justify-center gap-3 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 mb-4"
        >
          <Play className="w-5 h-5 text-red-600" />
          <span>Continue with Google</span>
        </button>

        <button 
          onClick={() => window.location.href = 'http://localhost:5000/api/auth/dummy'}
          className="w-full bg-surface hover:bg-slate-700 border border-white/10 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 active:scale-95"
        >
          <span>Continue as Guest (Dummy)</span>
        </button>
        <p className="mt-4 text-xs text-slate-500">
          Requires YouTube Data API v3 scopes for automated uploading.
        </p>
      </div>
    </div>
  );
};

export default Login;
