import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/stores/useAuth';
import { useGlobalLeaderboard } from '@/lib/stores/useGlobalLeaderboard';
import { Trophy, Crown, Medal, Award, Users, LogIn, RefreshCw, AlertCircle } from 'lucide-react';
import LoginForm from '../Auth/LoginForm';

interface GlobalLeaderboardProps {
  onClose: () => void;
}

export default function GlobalLeaderboard({ onClose }: GlobalLeaderboardProps) {
  const { user } = useAuth();
  const { leaderboard, isLoading, error, fetchLeaderboard } = useGlobalLeaderboard();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-100 to-amber-200 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    fetchLeaderboard();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
        <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm shadow-xl max-h-[90vh] overflow-hidden">
          <CardHeader className="text-center border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Global Leaderboard
              <Users className="h-6 w-6 text-blue-500" />
            </CardTitle>
            <p className="text-sm text-gray-600">
              Compete with players from around the world!
            </p>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-y-auto max-h-[60vh]">
              {!user && (
                <div className="p-6 text-center border-b bg-blue-50">
                  <p className="text-gray-700 mb-4">
                    Login to save your scores and compete globally!
                  </p>
                  <Button
                    onClick={() => setShowLogin(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login / Sign Up
                  </Button>
                </div>
              )}

              {error && (
                <div className="p-4 mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                  <Button
                    onClick={fetchLeaderboard}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Try Again
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading global leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No scores yet. Be the first to join the global leaderboard!</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => {
                      const rank = index + 1;
                      const isCurrentUser = user && entry.userId === user.id;
                      
                      return (
                        <div
                          key={`user-${entry.userId}-${index}`}
                          className={`
                            p-4 rounded-lg border-2 transition-all
                            ${getRankColor(rank)}
                            ${isCurrentUser ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12">
                                {getRankIcon(rank)}
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-lg font-bold ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                                    {entry.username}
                                    {isCurrentUser && <span className="text-sm text-blue-600">(You)</span>}
                                  </h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Level {entry.level} • {entry.coins} coins
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(entry.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {entry.score.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">points</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {user ? `Logged in as ${user.username}` : 'Not logged in'}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchLeaderboard}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={onClose} variant="default">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showLogin && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}