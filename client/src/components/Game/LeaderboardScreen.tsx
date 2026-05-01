import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { useLeaderboard } from "@/lib/stores/useLeaderboard";
import { useCoinBank } from "@/lib/stores/useCoinBank";
import { ArrowLeft, Trophy, Medal, Award, Edit3, Check, X, Coins } from "lucide-react";

export default function LeaderboardScreen() {
  const { resetGame } = useCoinGame();
  const { scores, removeScore, updateScore, canEditName } = useLeaderboard();
  const { totalCoins } = useCoinBank();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  // Clean up anonymous entries on component mount
  useEffect(() => {
    removeScore("anonymous");
    removeScore("Anonymous");
  }, [removeScore]);

  const handleBack = () => {
    resetGame();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when editing names or in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || editingIndex !== null) return;
      
      const key = e.key.toLowerCase();
      const code = e.code;
      
      // Handle back keys
      if (key === 'b' || code === 'KeyB' || key === 'escape' || code === 'Escape' || e.keyCode === 27 || key === 'h' || code === 'KeyH') {
        e.preventDefault();
        handleBack();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleBack, editingIndex]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const startEditing = (index: number, currentName: string) => {
    // Check if this score can be edited
    if (canEditName(scores[index])) {
      setEditingIndex(index);
      setEditingName(currentName);
    }
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingName.trim()) {
      const oldName = scores[editingIndex].name;
      updateScore(oldName, editingName.trim());
    }
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full p-4">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <Button
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="mb-4 bg-white/90 hover:bg-white border-gray-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
          <span className="ml-auto text-xs opacity-75">[B]</span>
        </Button>

        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Leaderboard</h1>
          <p className="text-gray-600">Top players and their scores</p>
        </div>
      </div>

      {/* Leaderboard */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">High Scores</CardTitle>
          <p className="text-center text-sm text-gray-600">Click on your name to edit it</p>
        </CardHeader>
        <CardContent className="p-4">
          {scores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold mb-2">No scores yet!</p>
              <p className="text-sm">Be the first to complete a level and submit your score.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {scores.map((score, index) => (
                <div
                  key={`${score.name}-${score.date}`}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(index + 1)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    {editingIndex === index ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-8 text-sm font-semibold"
                          maxLength={20}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveEdit}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className={`flex items-center gap-2 ${canEditName(score) ? 'cursor-pointer group' : ''}`}
                        onClick={() => canEditName(score) && startEditing(index, score.name)}
                      >
                        <div className="font-semibold text-gray-800 truncate">
                          {score.name}
                        </div>
                        {canEditName(score) && (
                          <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {formatDate(score.date)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      {score.score.toLocaleString()} pts
                    </div>
                    <div className="text-xs text-gray-500 font-semibold">
                      Bank: {totalCoins.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
