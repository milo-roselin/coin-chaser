import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCoinGame } from "@/lib/stores/useCoinGame";
import { useUserStats } from "@/lib/stores/useUserStats";
import { ArrowRight, Home } from "lucide-react";

export default function NextLevelScreen() {
  const { score, coinsCollected, resetGame, nextLevel, currentLevel, totalScore } = useCoinGame();
  const { getHighestScore } = useUserStats();

  const handleNextLevel = () => {
    nextLevel();
  };

  const handleHome = () => {
    resetGame();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      {/* Victory Message */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4">🌀</div>
        <h1 className="text-4xl font-bold text-purple-600 mb-2">Level Complete!</h1>
        <p className="text-lg text-gray-600">Great job! Ready for the next challenge?</p>
      </div>

      {/* Score Card */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl mb-6">
        <CardContent className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Level {currentLevel} Complete!</h2>
          <div className="space-y-2 mb-4">
            <div className="text-3xl font-bold text-purple-600">{score}</div>
            <div className="text-lg text-gray-600">
              Coins Collected: <span className="font-semibold text-yellow-600">{coinsCollected}</span>
            </div>
            <div className="text-sm text-gray-500 border-t pt-2">
              Total Progress: <span className="font-semibold text-purple-600">{getHighestScore().toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-semibold text-green-700">
              🎉 Checkpoint Saved!
            </p>
            <p className="text-xs text-green-600">
              You can continue from Level {currentLevel + 1} anytime
            </p>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-purple-700 font-semibold">
              Next Level Preview:
            </p>
            <p className="text-xs text-purple-600">
              • More coin clusters to defend<br/>
              • Faster TNT guards<br/>
              • Increased difficulty
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3 w-full max-w-md">
        <Button 
          onClick={handleNextLevel}
          size="lg"
          className="w-full text-xl py-6 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow-lg"
        >
          <ArrowRight className="mr-2 h-6 w-6" />
          Continue to Level {currentLevel + 1}
        </Button>

        <Button 
          onClick={handleHome}
          variant="outline"
          size="lg"
          className="w-full text-lg py-4 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to Menu
        </Button>
      </div>
    </div>
  );
}