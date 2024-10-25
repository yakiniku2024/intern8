'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CELL_SIZE = 30;
const COLS = 10;
const ROWS = 20;

type Grid = (string | null)[][];
type Piece = {
  shape: number[][];
  color: string;
};

const PIECES: Piece[] = [
  { shape: [[1, 1, 1, 1]], color: 'cyan' },    // I
  { shape: [[1, 1], [1, 1]], color: 'yellow' }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' } // L
];

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function TetrisGameComponent() {
  const [gameState, setGameState] = useState('title'); // 'title', 'playing', 'gameover', 'settings'
  const [grid, setGrid] = useState<Grid>(() => Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [heldPiece, setHeldPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [nextPiecesCount, setNextPiecesCount] = useState(5);
  const [keyBindings, setKeyBindings] = useState({
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'ArrowUp',
    rotateLeft: 'a',
    rotateRight: 'f',
    hold: ' ' // 初期設定でスペースを追加
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextPiecesCanvasRef = useRef<HTMLCanvasElement>(null);
  const heldPieceCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const createNewPieceSet = useCallback(() => {
    return shuffleArray([...PIECES]);
  }, []);

  const [pieceSet, setPieceSet] = useState<Piece[]>([]);

  const getNextPiece = useCallback(() => {
    if (pieceSet.length === 0) {
      setPieceSet(createNewPieceSet());
      return createNewPieceSet()[0];
    }
    const nextPiece = pieceSet[0];
    setPieceSet(prev => prev.slice(1));
    return nextPiece;
  }, [pieceSet, createNewPieceSet]);

  const initializeGame = useCallback(() => {
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    const initialPieceSet = createNewPieceSet();
    setPieceSet(initialPieceSet.slice(1));
    setCurrentPiece(initialPieceSet[0]);
    setCurrentPosition({ x: Math.floor(COLS / 2) - 1, y: 0 });
    setNextPieces(Array(nextPiecesCount).fill(null).map(() => getNextPiece()));
    setHeldPiece(null);
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setPieceSet([]); // 追加: ピースセットをリセット
  }, [getNextPiece, nextPiecesCount, createNewPieceSet]);

  const checkCollision = useCallback((piece: Piece, position: { x: number, y: number }) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = position.x + x;
          const newY = position.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  }, [grid]);

  // レベルアップに必要なスコアを計算する関数
  const getScoreForNextLevel = (currentLevel: number) => {
    if (currentLevel === 1) {
      return 5000; // レベル1からレベル2へのスコア
    }
    return Math.floor(5000 * Math.pow(1.2, currentLevel - 2)); // 以降は1.2倍
  };

  // スコアが更新される部分
  const updateScore = (linesCleared: number) => {
    const newScore = score + [100, 300, 500, 4000][linesCleared - 1];
    setScore(newScore);

    // レベルの更新
    const nextLevelScore = getScoreForNextLevel(level);
    if (newScore >= nextLevelScore) {
      setLevel(prevLevel => prevLevel + 1); // レベルアップ
    }
  };

  const placePiece = useCallback((position = currentPosition) => {
    if (!currentPiece) return;

    const newGrid = [...grid];
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          newGrid[position.y + y][position.x + x] = currentPiece.color;
        }
      }
    }

    setGrid(newGrid);

    const newPiece = nextPieces[0];
    const startPosition = { x: Math.floor(COLS / 2) - 1, y: 0 };
    if (checkCollision(newPiece, startPosition)) {
      setGameOver(true);
      return;
    }

    setCurrentPiece(newPiece);
    setCurrentPosition(startPosition);
    setNextPieces(prevNextPieces => [...prevNextPieces.slice(1), getNextPiece()]);

    // Check for completed lines
    const completedLines = newGrid.reduce((acc, row, index) => {
      if (row.every(cell => cell !== null)) {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);

    if (completedLines.length > 0) {
      updateScore(completedLines.length); // スコアを更新

      const updatedGrid = newGrid.filter((_, index) => !completedLines.includes(index));
      const newLines = Array(completedLines.length).fill(null).map(() => Array(COLS).fill(null));
      setGrid([...newLines, ...updatedGrid]);
    }
  }, [currentPiece, grid, nextPieces, checkCollision, getNextPiece, score, currentPosition, updateScore]);

  const moveLeft = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x - 1, y: currentPosition.y })) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x - 1 }));
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const moveRight = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x + 1, y: currentPosition.y })) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x + 1 }));
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const rotateLeft = useCallback(() => {
    if (!currentPiece) return;

    const rotatedPiece: Piece = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[row.length - 1 - index])
      )
    };

    if (!checkCollision(rotatedPiece, currentPosition)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const rotateRight = useCallback(() => {
    if (!currentPiece) return;

    const rotatedPiece: Piece = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[index]).reverse()
      )
    };

    if (!checkCollision(rotatedPiece, currentPosition)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const softDrop = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x, y: currentPosition.y + 1 })) {
      setCurrentPosition(prev => ({ ...prev, y: prev.y + 1 }));
    } else {
      placePiece();
    }
  }, [currentPiece, currentPosition, checkCollision, placePiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece) return;

    let newY = currentPosition.y;
    while (!checkCollision(currentPiece, { x: currentPosition.x, y: newY + 1 })) {
      newY++;
    }

    // 新しい位置を直接使用してplacePieceを呼び出す
    placePiece({ ...currentPosition, y: newY });
  }, [currentPiece, currentPosition, checkCollision, placePiece]);

  const hold = useCallback(() => {
    if (!currentPiece) return;

    if (heldPiece) {
      setCurrentPiece(heldPiece);
      setHeldPiece(currentPiece);
    } else {
      setHeldPiece(currentPiece);
      setCurrentPiece(nextPieces[0]);
      setNextPieces([...nextPieces.slice(1), getNextPiece()]);
    }
    setCurrentPosition({ x: Math.floor(COLS / 2) - 1, y: 0 });
  }, [currentPiece, heldPiece, nextPieces, getNextPiece]);

  const [isPaused, setIsPaused] = useState(false); // ゲームの一時停止状態を管理
  const [showPauseMenu, setShowPauseMenu] = useState(false); // ポーズメニューの表示状態を管理

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      if (!prev) {
        setShowPauseMenu(true); // ポーズ中にメニューを表示
      } else {
        setShowPauseMenu(false); // ポーズ解除時にメニューを非表示
      }
      return !prev; // 一時停止状態をトグル
    });
  }, []);

  // リトライボタンの理を修正
  const handleRetry = () => {
    initializeGame();
    setIsPaused(false); // リトライ時にポーズを解除
    setShowPauseMenu(false); // ポーズメニューを非表示
    setGameState('playing'); // ゲーム状態を「playing」に設定
  };

  // タイトルに戻る処理を修正
  const handleBackToTitle = () => {
    setIsPaused(false); // タイトルに戻る際にポーズを解除
    setShowPauseMenu(false); // ポーズメニューを非表示
    setGameState('title'); // ゲーム状態を「title」に設定
  };

  // ゲームループの中でポーズ状態をチェック
  useEffect(() => {
    if (gameOver || isPaused) return; // ゲームオーバーまたはポーズ中は何もしない

    const baseSpeed = 1000; // 1秒
    const gameLoop = setInterval(() => {
      softDrop();
    }, baseSpeed * Math.pow(0.6, Math.min(level - 1, 13))); // スピード増加はレベル14で停止

    return () => clearInterval(gameLoop);
  }, [softDrop, level, gameOver, isPaused, checkCollision]); // checkCollisionを依存配列に追加

  useEffect(() => {
    let hardDropCleanup: (() => void) | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case keyBindings.moveLeft:
          moveLeft();
          break;
        case keyBindings.moveRight:
          moveRight();
          break;
        case keyBindings.softDrop:
          softDrop();
          break;
        case keyBindings.hardDrop:
          hardDrop();
          break;
        case keyBindings.rotateLeft:
          rotateLeft();
          break;
        case keyBindings.rotateRight:
          rotateRight();
          break;
        case keyBindings.hold:
          hold(); // スペースキーでホールドを呼び出す
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === keyBindings.hardDrop && hardDropCleanup) {
        hardDropCleanup();
        hardDropCleanup = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, moveLeft, moveRight, softDrop, hardDrop, rotateLeft, rotateRight, hold, keyBindings]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
  };

  // drawGridを使用する前に宣言を移動
  useEffect(() => {
    const canvas = canvasRef.current;
    const nextPiecesCanvas = nextPiecesCanvasRef.current;
    const heldPieceCanvas = heldPieceCanvasRef.current;
    if (!canvas || !nextPiecesCanvas || !heldPieceCanvas) return;

    const ctx = canvas.getContext('2d');
    const nextPiecesCtx = nextPiecesCanvas.getContext('2d');
    const heldPieceCtx = heldPieceCanvas.getContext('2d');
    if (!ctx || !nextPiecesCtx || !heldPieceCtx) return;

    const redrawCanvas = () => {
      if (!canvas || !ctx || !nextPiecesCanvas || !nextPiecesCtx || !heldPieceCanvas || !heldPieceCtx) return;

      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nextPiecesCtx.clearRect(0, 0, nextPiecesCanvas.width, nextPiecesCanvas.height);
      heldPieceCtx.clearRect(0, 0, heldPieceCanvas.width, heldPieceCanvas.height);

      // 背景を描画（オプション）
      if (backgroundImageRef.current) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      // メイングリッドを描画
      drawGrid(ctx);

      // 次のピースを描画
      nextPieces.forEach((piece, index) => {
        drawPiece(nextPiecesCtx, piece, { x: 0, y: index * 4 });
      });

      // ホールドされたースを描画
      if (heldPiece) {
        drawPiece(heldPieceCtx, heldPiece, { x: 0, y: 0 });
      }

      // 現在のピースを描画
      if (currentPiece) {
        drawPiece(ctx, currentPiece, currentPosition);
        // ゴーストピースを描画
        let ghostY = currentPosition.y;
        while (!checkCollision(currentPiece, { x: currentPosition.x, y: ghostY + 1 })) {
          ghostY++;
        }
        drawPiece(ctx, currentPiece, { x: currentPosition.x, y: ghostY }, true); // ゴーストを表示
      }
    }

    redrawCanvas();
  }, [grid, currentPiece, currentPosition, nextPieces, heldPiece, drawGrid]);

  const drawPiece = (ctx: CanvasRenderingContext2D, piece: Piece, position: { x: number, y: number }, isGhost: boolean = false) => {
    // ゴーストピースの色を透明に設定
    if (isGhost) {
        ctx.fillStyle = 'rgba(211, 211, 211, 0.5)'; // lightgray の透明色
    } else {
        ctx.fillStyle = piece.color; // 通常の色
    }

    piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                ctx.fillRect((position.x + x) * CELL_SIZE, (position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.strokeRect((position.x + x) * CELL_SIZE, (position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        });
    });
  };

  const renderTitleScreen = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-8">Tetris Game</h1>
      <Button onClick={() => { initializeGame(); setGameState('playing'); }}>Start Game</Button>
      <Button onClick={() => setGameState('settings')} className="mt-4">Settings</Button>
    </div>
  );

  const renderGameScreen = () => (
    <div className="flex items-start justify-center">
      <div className="mr-8">
        <h2 className="text-xl font-bold mb-2">Hold</h2>
        <canvas
          ref={heldPieceCanvasRef}
          width={4 * CELL_SIZE}
          height={4 * CELL_SIZE}
          className="border-2 border-gray-400 mb-4"
        />
      </div>
      <div>
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          className="border-2 border-gray-400"
        />
        {/* スコアとレベルの表示位置をゲームフィールドの真下に移動 */}
        <div className="text-center mt-4">
          <h2 className="text-xl font-bold">score: {score}</h2> 
          <h2 className="text-xl font-bold">level: {level}</h2>
          <Button onClick={togglePause} className="mt-4">{isPaused ? 'Resume' : 'Pause'}</Button> {/* ポーズボタンを追加 */}
        </div>
      </div>
      <div className="ml-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Next</h2>
          <canvas
            ref={nextPiecesCanvasRef}
            width={4 * CELL_SIZE}
            height={nextPiecesCount * 4 * CELL_SIZE}
            className="border-2 border-gray-400"
          />
        </div>
      </div>
    </div>
  );

  const renderGameOverScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen"> {/* h-fullからh-screenに変更 */}
      <h1 className="text-4xl font-bold mb-8 text-center"> {/* テキストを中央揃え */}
        Game Over
      </h1>
      <h2 className="text-2xl mb-4 text-center">Score: {score}</h2> {/* テキストを中央揃え */}
      <div className="flex flex-col items-center"> {/* ボタンを中央揃え */}
        <Button onClick={() => { initializeGame(); setGameState('playing'); }} className="mb-2">Retry</Button>
        <Button onClick={() => { setGameState('title'); initializeGame(); }} className="mt-4">Back to Title</Button>
      </div>
    </div>
  );

  const renderSettingsScreen = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      <div className="w-64 mb-4">
        <Label htmlFor="nextPiecesCount">Next Pieces Count</Label>
        <Select
          value={nextPiecesCount.toString()}
          onValueChange={(value) => setNextPiecesCount(parseInt(value))}
        >
          <SelectTrigger id="nextPiecesCount">
            <SelectValue placeholder="Select next pieces count" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((count) => ( // 1から5までの数に戻す
              <SelectItem key={count} value={count.toString()}>
                {count}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {Object.entries(keyBindings).map(([action, key]) => (
        <div key={action} className="mb-4">
          <Label htmlFor={action}>{action}</Label>
          <Input
            id={action}
            type="text"
            value={key === ' ' ? 'Space' : key} // スペースキーを押したときに"Space"と表示
            onChange={(e) => setKeyBindings(prev => ({ ...prev, [action]: e.target.value }))} 
            onKeyDown={(e) => {
              e.preventDefault(); // デフォルトのキー入力を防ぐ
              setKeyBindings(prev => ({ ...prev, [action]: e.key === ' ' ? 'Space' : e.key })); // スペースキーを"Space"に設定
            }}
          />
        </div>
      ))}
      <Button onClick={() => setGameState('title')} className="mt-4">Back to Title</Button>
    </div>
  );

  const renderPauseMenu = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold mb-4">Paused</h1>
      <Button onClick={() => { setIsPaused(false); setShowPauseMenu(false); }} className="mb-2">Resume</Button>
      <Button onClick={handleRetry} className="mb-2">Retry</Button>
      <Button onClick={handleBackToTitle} className="mt-4">Back to Title</Button> {/* タイトルに戻る処理を修正 */}
    </div>
  );

  // ゲームオーバーの条件をチェックする部分で、ゲームオーバー画面を表示
  if (gameOver) {
    return renderGameOverScreen(); // ゲムオーバー画面を表示
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      {showPauseMenu ? renderPauseMenu() : (
        <div className="h-screen flex items-center justify-center bg-gray-100">
          {gameState === 'title' && renderTitleScreen()}
          {gameState === 'playing' && renderGameScreen()}
          {gameState === 'gameover' && renderGameOverScreen()}
          {gameState === 'settings' && renderSettingsScreen()}
        </div>
      )}
    </div>
  );
}
