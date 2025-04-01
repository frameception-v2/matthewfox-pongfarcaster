"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useFrameSDK } from "~/hooks/useFrameSDK";

// Game constants
const GAME_WIDTH = 280;
const GAME_HEIGHT = 200;
const PADDLE_HEIGHT = 50;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const BALL_SPEED = 3;
const PADDLE_SPEED = 8;

export default function Frame() {
  const { isSDKLoaded } = useFrameSDK();
  const [gameStarted, setGameStarted] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [aiPosition, setAiPosition] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ballPosition, setBallPosition] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const [ballVelocity, setBallVelocity] = useState({ x: BALL_SPEED, y: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) });
  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game loop
  useEffect(() => {
    if (!gameStarted) return;

    // Initialize the canvas once the game starts
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastBallPos = { ...ballPosition };
    let lastBallVel = { ...ballVelocity };
    const lastPlayerPos = playerPosition;
    let lastAiPos = aiPosition;

    const gameLoop = () => {
      // Move ball
      const newBallPos = {
        x: lastBallPos.x + lastBallVel.x,
        y: lastBallPos.y + lastBallVel.y
      };
      
      // Simple AI movement
      let newAiPos = lastAiPos;
      const aiCenter = lastAiPos + PADDLE_HEIGHT / 2;
      const ballCenter = lastBallPos.y;
      
      if (aiCenter < ballCenter - 10) {
        newAiPos = Math.min(lastAiPos + PADDLE_SPEED / 2, GAME_HEIGHT - PADDLE_HEIGHT);
      } else if (aiCenter > ballCenter + 10) {
        newAiPos = Math.max(lastAiPos - PADDLE_SPEED / 2, 0);
      }

      // Wall collisions (top/bottom)
      let newBallVel = { ...lastBallVel };
      if (newBallPos.y <= 0 || newBallPos.y >= GAME_HEIGHT - BALL_SIZE) {
        newBallVel.y = -lastBallVel.y;
      }

      // Paddle collisions
      // Player paddle
      if (
        newBallPos.x <= PADDLE_WIDTH &&
        lastBallPos.y + BALL_SIZE >= lastPlayerPos &&
        lastBallPos.y <= lastPlayerPos + PADDLE_HEIGHT
      ) {
        // Calculate angle based on where ball hits paddle
        const hitPosition = (lastBallPos.y - lastPlayerPos) / PADDLE_HEIGHT;
        const angle = (hitPosition - 0.5) * Math.PI / 2; // -45 to 45 degrees
        
        newBallVel = {
          x: BALL_SPEED * Math.cos(angle),
          y: BALL_SPEED * Math.sin(angle)
        };
      }

      // AI paddle
      if (
        newBallPos.x >= GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
        lastBallPos.y + BALL_SIZE >= lastAiPos &&
        lastBallPos.y <= lastAiPos + PADDLE_HEIGHT
      ) {
        // Calculate angle based on where ball hits paddle
        const hitPosition = (lastBallPos.y - lastAiPos) / PADDLE_HEIGHT;
        const angle = (hitPosition - 0.5) * Math.PI / 2; // -45 to 45 degrees
        
        newBallVel = {
          x: -BALL_SPEED * Math.cos(angle),
          y: BALL_SPEED * Math.sin(angle)
        };
      }

      // Score detection
      if (newBallPos.x < 0) {
        // AI scores
        setAiScore(prev => prev + 1);
        // Reset ball
        newBallPos.x = GAME_WIDTH / 2;
        newBallPos.y = GAME_HEIGHT / 2;
        newBallVel = { 
          x: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), 
          y: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) 
        };
      } else if (newBallPos.x > GAME_WIDTH) {
        // Player scores
        setPlayerScore(prev => prev + 1);
        // Reset ball
        newBallPos.x = GAME_WIDTH / 2;
        newBallPos.y = GAME_HEIGHT / 2;
        newBallVel = { 
          x: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), 
          y: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) 
        };
      }

      // Update state variables
      lastBallPos = newBallPos;
      lastBallVel = newBallVel;
      lastAiPos = newAiPos;

      // Draw game
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw center line
      ctx.strokeStyle = '#333';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(GAME_WIDTH / 2, 0);
      ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw paddles
      ctx.fillStyle = '#fff';
      // Player paddle
      ctx.fillRect(0, lastPlayerPos, PADDLE_WIDTH, PADDLE_HEIGHT);
      // AI paddle
      ctx.fillRect(GAME_WIDTH - PADDLE_WIDTH, lastAiPos, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball
      ctx.fillRect(lastBallPos.x - BALL_SIZE / 2, lastBallPos.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

      // Draw scores
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(playerScore.toString(), GAME_WIDTH / 4, 30);
      ctx.fillText(aiScore.toString(), (GAME_WIDTH / 4) * 3, 30);

      // Update React state (less frequently to avoid performance issues)
      setBallPosition(lastBallPos);
      setBallVelocity(lastBallVel);
      setAiPosition(lastAiPos);

      // Continue the game loop
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    animationFrameId = requestAnimationFrame(gameLoop);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameStarted, playerScore, aiScore, aiPosition, ballPosition, ballVelocity, playerPosition]);

  // Initialize canvas when component mounts
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Initial render of the game board
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, 0);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('0', GAME_WIDTH / 4, 30);
    ctx.fillText('0', (GAME_WIDTH / 4) * 3, 30);
    
    // Draw paddles
    ctx.fillRect(0, playerPosition, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(GAME_WIDTH - PADDLE_WIDTH, aiPosition, PADDLE_WIDTH, PADDLE_HEIGHT);
  }, [aiPosition, playerPosition]);

  // Reset ball to center - not used directly anymore, handled in game loop

  // Start game
  const startGame = useCallback(() => {
    setGameStarted(true);
    setPlayerScore(0);
    setAiScore(0);
    setBallPosition({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
    setBallVelocity({ 
      x: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), 
      y: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) 
    });
  }, []);

  // Handle player movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Update player paddle position
    setPlayerPosition(prev => {
      const newPos = mouseY - PADDLE_HEIGHT / 2;
      return Math.max(0, Math.min(newPos, GAME_HEIGHT - PADDLE_HEIGHT));
    });
  }, [gameStarted]);

  // Handle touch movement for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!gameStarted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    
    // Update player paddle position
    setPlayerPosition(prev => {
      const newPos = touchY - PADDLE_HEIGHT / 2;
      return Math.max(0, Math.min(newPos, GAME_HEIGHT - PADDLE_HEIGHT));
    });
  }, [gameStarted]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-[300px] mx-auto py-2 px-2">
      <Card>
        <CardHeader>
          <CardTitle>Farcaster Pong</CardTitle>
          <CardDescription>
            {gameStarted ? "Move your paddle to hit the ball!" : "Classic Pong game in a Farcaster Frame"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <canvas 
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border border-gray-700 bg-black"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          {!gameStarted ? (
            <Button onClick={startGame}>Start Game</Button>
          ) : (
            <div className="text-sm text-center">
              {playerScore > aiScore 
                ? "You're winning!" 
                : playerScore < aiScore 
                  ? "AI is ahead!" 
                  : "It's a tie!"}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
