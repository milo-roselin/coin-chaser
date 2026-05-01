import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/stores/useAuth';
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function LoginForm({ onSuccess, onClose }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading, error, clearError } = useAuth();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    const success = isLogin 
      ? await login(username.trim(), password)
      : await register(username.trim(), password);

    if (success) {
      onSuccess();
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setUsername('');
    setPassword('');
    setShowPassword(false);
    // Focus username field when switching modes
    setTimeout(() => usernameRef.current?.focus(), 100);
  };

  // Auto-focus username field when component mounts
  useEffect(() => {
    setTimeout(() => usernameRef.current?.focus(), 100);
  }, []);

  const handleUsernameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username.trim()) {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim()) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Add keyboard shortcuts for the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input fields
      if (e.target instanceof HTMLInputElement) return;
      
      const key = e.key.toLowerCase();
      
      // Tab or T to switch between login/register
      if ((key === 'tab' || key === 't') && !isLoading) {
        e.preventDefault();
        switchMode();
        return;
      }
      
      // Escape to cancel/close
      if (key === 'escape' && !isLoading) {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, switchMode, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Login to Game' : 'Create Account'}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {isLogin 
              ? 'Login to save your scores across devices' 
              : 'Create an account to track your progress globally'
            }
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <Input
                ref={usernameRef}
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleUsernameKeyDown}
                className="text-center"
                maxLength={20}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <Input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordKeyDown}
                className="text-center pr-10"
                minLength={6}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Password must be at least 6 characters
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3"
                disabled={isLoading || !username.trim() || !password.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isLogin ? 'Logging in...' : 'Creating account...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isLogin ? 'Login' : 'Create Account'}
                  </div>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={switchMode}
                disabled={isLoading}
                title={isLogin ? 'Switch to Sign Up [T]' : 'Switch to Login [T]'}
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
                <span className="ml-auto text-xs opacity-75">[T]</span>
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500"
                onClick={onClose}
                disabled={isLoading}
                title="Cancel [Esc]"
              >
                Cancel
                <span className="ml-auto text-xs opacity-75">[Esc]</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}