/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sun, Moon, Bot, User, RotateCcw, Award } from 'lucide-react';
import { soundEngine } from './lib/sound';
import { PlayerMark, checkWinner, isBoardFull, getWinningCombo, getBestMove, WIN_COMBOS } from './lib/minimax';

type GameMode = 'ai' | '2p';
type Theme = 'dark' | 'light';

export default function App() {
  const [board, setBoard] = useState<PlayerMark[]>(Array(9).fill(null));
  const [mode, setMode] = useState<GameMode>('ai');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentMark, setCurrentMark] = useState<PlayerMark>('X');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  
  const [p1Name, setP1Name] = useState<string>('You');
  const [p2Name, setP2Name] = useState<string>('AI');
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  
  const [winner, setWinner] = useState<PlayerMark | 'draw' | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  const [bumpScore, setBumpScore] = useState<'p1' | 'p2' | null>(null);

  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiIsRunningRef = useRef<boolean>(false);

  // Apply theme to body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Handle AI turn
  useEffect(() => {
    if (mode === 'ai' && currentMark === 'O' && !winner && !aiIsRunningRef.current) {
      aiIsRunningRef.current = true;
      setIsAiThinking(true);
      aiTimerRef.current = setTimeout(() => {
        setBoard((prevBoard) => {
          const aiMoveIdx = getBestMove(prevBoard, 'O', 'X');
          if (aiMoveIdx !== undefined && aiMoveIdx !== null && prevBoard[aiMoveIdx] === null) {
            const newBoard = [...prevBoard];
            newBoard[aiMoveIdx] = 'O';
            soundEngine.play('markO', isMuted);
            // Use setTimeout(0) to allow board state to settle before checking end
            setTimeout(() => {
              checkGameEnd(newBoard, 'O');
              setIsAiThinking(false);
              aiIsRunningRef.current = false;
            }, 0);
            return newBoard;
          }
          setIsAiThinking(false);
          aiIsRunningRef.current = false;
          return prevBoard;
        });
      }, 500);
    }
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [currentMark, mode, winner, isMuted]);

  const checkGameEnd = (currentBoard: PlayerMark[], lastMark: PlayerMark) => {
    const winMark = checkWinner(currentBoard);
    if (winMark) {
      const combo = getWinningCombo(currentBoard);
      setWinner(winMark);
      setWinningCombo(combo);
      soundEngine.play('win', isMuted);

      if (winMark === 'X') {
        setP1Score((prev) => prev + 1);
        setBumpScore('p1');
      } else {
        setP2Score((prev) => prev + 1);
        setBumpScore('p2');
      }
      setTimeout(() => setBumpScore(null), 500);

      // Auto reset after showing celebration
      resetTimerRef.current = setTimeout(() => {
        resetBoard();
      }, 1600);
      return true;
    } else if (isBoardFull(currentBoard)) {
      setWinner('draw');
      soundEngine.play('draw', isMuted);
      resetTimerRef.current = setTimeout(() => {
        resetBoard();
      }, 1400);
      return true;
    }
    setCurrentMark(lastMark === 'X' ? 'O' : 'X');
    return false;
  };

  const handleCellClick = (index: number) => {
    if (winner || board[index] !== null || isAiThinking) return;
    if (mode === 'ai' && currentMark !== 'X') return;

    soundEngine.play(currentMark === 'X' ? 'markX' : 'markO', isMuted);
    const newBoard = [...board];
    newBoard[index] = currentMark;
    setBoard(newBoard);

    checkGameEnd(newBoard, currentMark);
  };

  const resetBoard = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    aiIsRunningRef.current = false;
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningCombo(null);
    setCurrentMark('X');
    setIsAiThinking(false);
  };

  const handleRestartGame = () => {
    soundEngine.play('restart', isMuted);
    resetBoard();
  };

  const handleModeChange = (newMode: GameMode) => {
    if (newMode === mode) return;
    soundEngine.play(newMode === 'ai' ? 'toAI' : 'to2p', isMuted);
    setMode(newMode);
    if (newMode === 'ai') {
      setP1Name('You');
      setP2Name('AI');
    } else {
      setP1Name('Player 1');
      setP2Name('Player 2');
    }
    setP1Score(0);
    setP2Score(0);
    resetBoard();
  };

  const toggleTheme = () => {
    soundEngine.play('toggle', isMuted);
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (!nextState) {
      // Play a quick test pop when unmuting so user hears immediate feedback
      soundEngine.play('unmute', false);
    }
  };

  // Status message
  const getStatusText = () => {
    if (winner === 'draw') return "It's a draw!";
    if (winner === 'X') return mode === 'ai' ? 'You win!' : `${p1Name} wins!`;
    if (winner === 'O') return mode === 'ai' ? 'AI wins!' : `${p2Name} wins!`;
    if (isAiThinking) return 'AI is thinking…';
    if (mode === 'ai') return 'Your move';
    return `${currentMark === 'X' ? p1Name : p2Name}'s move`;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#1B1F27] text-[#EDEBE4]' : 'bg-[#F3F0E8] text-[#20242C]'
    }`}>
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[15%] left-[20%] w-72 h-72 rounded-full blur-3xl opacity-15 transition-colors duration-500 ${
          theme === 'dark' ? 'bg-[#C9A227]' : 'bg-[#D97706]'
        }`} />
        <div className={`absolute bottom-[15%] right-[20%] w-80 h-80 rounded-full blur-3xl opacity-15 transition-colors duration-500 ${
          theme === 'dark' ? 'bg-[#3FA796]' : 'bg-[#0D9488]'
        }`} />
      </div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              theme === 'dark'
                ? 'bg-[#C9A227] text-[#1B1F27] shadow-[#C9A227]/30'
                : 'bg-[#FFD055] text-[#20242C] shadow-[#FFD055]/40'
            }`}
          >
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Mode Toggle Switch */}
          <div className={`flex items-center p-1 rounded-full border transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-[#232833] border-white/10'
              : 'bg-white border-black/10 shadow-sm'
          }`}>
            <button
              onClick={() => handleModeChange('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                mode === 'ai'
                  ? theme === 'dark'
                    ? 'bg-[#C9A227] text-[#1B1F27] shadow-sm'
                    : 'bg-[#FFD055] text-[#20242C] shadow-sm'
                  : 'text-[#9AA1B0] hover:text-current'
              }`}
            >
              <Bot size={15} />
              <span>VS AI</span>
            </button>
            <button
              onClick={() => handleModeChange('2p')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                mode === '2p'
                  ? theme === 'dark'
                    ? 'bg-[#C9A227] text-[#1B1F27] shadow-sm'
                    : 'bg-[#FFD055] text-[#20242C] shadow-sm'
                  : 'text-[#9AA1B0] hover:text-current'
              }`}
            >
              <User size={15} />
              <span>2 Player</span>
            </button>
          </div>

          {/* Speaker / Mute Button */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Click to Unmute Sounds' : 'Click to Mute Sounds'}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isMuted
                ? theme === 'dark'
                  ? 'bg-[#C1443C]/20 border-[#C1443C] text-[#C1443C]'
                  : 'bg-red-100 border-red-500 text-red-600'
                : theme === 'dark'
                  ? 'bg-[#232833] border-white/10 text-[#C9A227] hover:border-[#C9A227]'
                  : 'bg-white border-black/10 text-[#D97706] hover:border-[#D97706] shadow-sm'
            }`}
          >
            {!isMuted && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  theme === 'dark' ? 'bg-[#C9A227]' : 'bg-[#D97706]'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  theme === 'dark' ? 'bg-[#C9A227]' : 'bg-[#D97706]'
                }`} />
              </span>
            )}
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="animate-pulse" />}
          </button>
        </div>

        {/* Title & Subtitle */}
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-3xl sm:text-4xl font-bold text-center tracking-tight mb-1.5">
          <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
            theme === 'dark' ? 'from-[#EDEBE4] via-[#C9A227] to-[#EDEBE4]' : 'from-[#20242C] via-[#A07B10] to-[#20242C]'
          }`}>
            Tic&#8209;Tac&#8209;Toe
          </span>
        </h1>

        <p className="text-center text-xs sm:text-sm text-[#9AA1B0] mb-5 leading-relaxed px-2">
          {mode === 'ai' ? (
            <>
              You play <strong className={theme === 'dark' ? 'text-[#C9A227]' : 'text-[#A07B10]'}>X</strong>. The{' '}
              <strong className={theme === 'dark' ? 'text-[#C9A227]' : 'text-[#A07B10]'}>Minimax</strong> engine plays{' '}
              <strong className="text-[#3FA796]">O</strong> — and it never loses.
            </>
          ) : (
            <>Two players, one board — take turns playing X and O.</>
          )}
        </p>

        {/* Game Status Banner */}
        <div
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          className={`text-center font-bold text-base min-h-[28px] mb-4 flex items-center justify-center transition-colors duration-300 ${
            winner === 'X' || (winner && winner !== 'draw' && winner === 'X')
              ? 'text-[#C1443C]'
              : winner === 'O'
                ? 'text-[#3FA796]'
                : isAiThinking
                  ? 'text-[#C9A227] animate-pulse'
                  : theme === 'dark'
                    ? 'text-[#EDEBE4]'
                    : 'text-[#20242C]'
          }`}
        >
          {getStatusText()}
        </div>

        {/* Board Container */}
        <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[360px] mx-auto mb-6">
          {/* Decorative SVG Grid Lines (Behind cells, fixed bounds so it NEVER causes cross bugs) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 300 300"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className={theme === 'dark' ? 'stroke-[#C9A227]/70' : 'stroke-[#2C1F06]/80'}>
              <path d="M100,16 C98,90 102,190 100,284" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M200,16 C202,90 198,190 200,284" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M16,100 C90,98 190,102 284,100" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M16,200 C90,202 190,198 284,200" strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          </svg>

          {/* Clickable Grid Cells */}
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full relative z-10">
            {board.map((cell, idx) => {
              const isWinningCell = winningCombo?.includes(idx);
              const isDisabled = winner !== null || isAiThinking || cell !== null;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={isDisabled}
                  aria-label={`Cell ${idx + 1}: ${cell || 'empty'}`}
                  className={`relative flex items-center justify-center overflow-hidden transition-colors duration-200 group ${
                    isWinningCell
                      ? theme === 'dark'
                        ? 'bg-[#C9A227]/25 rounded-xl'
                        : 'bg-[#C9A227]/30 rounded-xl'
                      : !isDisabled
                        ? theme === 'dark'
                          ? 'hover:bg-[#C9A227]/10 hover:rounded-lg'
                          : 'hover:bg-[#8B6914]/10 hover:rounded-lg'
                        : ''
                  }`}
                >
                  {/* Thinking Dot for AI Turn */}
                  {isAiThinking && cell === null && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-ping" />
                  )}

                  {/* Strictly Bounded SVG Marks inside Cell */}
                  {cell === 'X' && (
                    <svg
                      viewBox="0 0 40 40"
                      className="w-12 h-12 sm:w-16 sm:h-16 pointer-events-none transform animate-in zoom-in-75 duration-200"
                    >
                      <path
                        d="M9 9 L31 31"
                        stroke={mode === '2p' ? '#8B5CF6' : '#C1443C'}
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                      <path
                        d="M31 9 L9 31"
                        stroke={mode === '2p' ? '#8B5CF6' : '#C1443C'}
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  {cell === 'O' && (
                    <svg
                      viewBox="0 0 40 40"
                      className="w-12 h-12 sm:w-16 sm:h-16 pointer-events-none transform animate-in zoom-in-75 duration-200"
                    >
                      <circle
                        cx="20"
                        cy="20"
                        r="11"
                        fill="none"
                        stroke={mode === '2p' ? '#F0A63A' : '#3FA796'}
                        strokeWidth="7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Celebration Pill Modal overlay */}
          {winner && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in duration-300">
              <div
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-lg font-bold border ${
                  theme === 'dark'
                    ? 'bg-[#EDEBE4] text-[#1B1F27] border-white/20'
                    : 'bg-[#20242C] text-[#F3F0E8] border-black/20'
                }`}
              >
                <Award size={20} className="text-[#C9A227]" />
                <span>{getStatusText()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Restart Button Footer */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleRestartGame}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-xs transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md ${
              theme === 'dark'
                ? 'bg-[#C9A227] text-[#1B1F27] hover:bg-[#d8b030]'
                : 'bg-[#20242C] text-[#F3F0E8] hover:bg-[#323946]'
            }`}
          >
            <RotateCcw size={15} />
            <span>Restart Game</span>
          </button>
        </div>

        {/* Player Scoreboard */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Player 1 Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
              bumpScore === 'p1' ? 'scale-105 ring-2 ring-[#C1443C]' : ''
            } ${
              theme === 'dark'
                ? 'bg-[#232833] border-white/5'
                : 'bg-white border-black/5 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  mode === '2p' ? 'bg-[#8B5CF6]' : 'bg-[#C1443C]'
                }`}
              />
              <input
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                maxLength={12}
                className="bg-transparent text-xs sm:text-sm font-semibold text-[#9AA1B0] focus:text-current focus:outline-none border-b border-dashed border-transparent focus:border-[#C9A227] max-w-[85px] sm:max-w-[100px] truncate"
                title="Click to edit Player 1 name"
              />
            </div>
            <span
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              className={`text-2xl sm:text-3xl font-bold ${
                mode === '2p' ? 'text-[#8B5CF6]' : 'text-[#C1443C]'
              }`}
            >
              {p1Score}
            </span>
          </div>

          {/* Player 2 Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
              bumpScore === 'p2' ? 'scale-105 ring-2 ring-[#3FA796]' : ''
            } ${
              theme === 'dark'
                ? 'bg-[#232833] border-white/5'
                : 'bg-white border-black/5 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  mode === '2p' ? 'bg-[#F0A63A]' : 'bg-[#3FA796]'
                }`}
              />
              <input
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                maxLength={12}
                className="bg-transparent text-xs sm:text-sm font-semibold text-[#9AA1B0] focus:text-current focus:outline-none border-b border-dashed border-transparent focus:border-[#C9A227] max-w-[85px] sm:max-w-[100px] truncate"
                title="Click to edit Player 2 name"
              />
            </div>
            <span
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              className={`text-2xl sm:text-3xl font-bold ${
                mode === '2p' ? 'text-[#F0A63A]' : 'text-[#3FA796]'
              }`}
            >
              {p2Score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
