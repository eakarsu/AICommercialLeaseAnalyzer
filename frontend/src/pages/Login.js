import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAutoFill = () => {
    setEmail('admin@leaseanalyzer.com');
    setPassword('password123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/25">
            <span className="text-4xl">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Lease Analyzer</h1>
          <p className="text-dark-400">Commercial Real Estate Intelligence Platform</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900/50 border border-dark-700/50 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder="Enter your email" required />
            </div>
            <div>
              <label className="block text-dark-300 text-sm font-medium mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900/50 border border-dark-700/50 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder="Enter your password" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4">
            <button onClick={handleAutoFill}
              className="w-full bg-dark-700/50 text-dark-300 font-medium py-3 rounded-xl hover:bg-dark-700 hover:text-white transition-all border border-dark-600/50">
              ⚡ Auto-fill Demo Credentials
            </button>
          </div>
        </div>

        <p className="text-center text-dark-500 text-sm mt-6">AI-Powered Commercial Lease Analysis</p>
      </div>
    </div>
  );
};

export default Login;
