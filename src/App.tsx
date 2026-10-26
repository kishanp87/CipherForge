/**
 * CipherForge — Cryptographic Password Generator
 * Modern, responsive interface with vibrant domain-specific color accents,
 * first-time user walkthrough popup, and zero-bias CSPRNG engine.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
  SlidersHorizontal,
  Zap,
  HelpCircle,
  X,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GeneratorOptions,
  PasswordHistoryItem,
  PasswordAnalysis,
  generateCryptographicPassword,
  analyzePassword,
  getCharCategory,
} from './utils/cryptoPassword.ts';

export default function App() {
  // Generator state
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
  });

  const [password, setPassword] = useState<string>('');
  const [history, setHistory] = useState<PasswordHistoryItem[]>([]);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [colorCodeChars, setColorCodeChars] = useState<boolean>(true);
  const [copiedMain, setCopiedMain] = useState<boolean>(false);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'presets' | 'guide'>('generator');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Play subtle feedback click using Web Audio API
  const playClickSound = useCallback((frequency = 520) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.07);
    } catch {
      // AudioContext policy fallback
    }
  }, [soundEnabled]);

  // Generate new password
  const handleGenerate = useCallback((opts?: GeneratorOptions) => {
    const currentOpts = opts || options;
    const newPw = generateCryptographicPassword(currentOpts);
    setPassword(newPw);
    playClickSound(640);

    const analysis = analyzePassword(newPw, currentOpts);

    setHistory((prev) => {
      if (prev.length > 0 && prev[0].password === newPw) return prev;
      const newItem: PasswordHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        password: newPw,
        timestamp: Date.now(),
        length: newPw.length,
        strength: analysis.strength,
        entropyBits: analysis.entropyBits,
      };
      return [newItem, ...prev.slice(0, 4)];
    });
  }, [options, playClickSound]);

  // First-time user welcome detection
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('cipherforge_welcome_seen');
    if (!hasSeenWelcome) {
      setWelcomeOpen(true);
    }
    handleGenerate();
  }, []);

  const closeWelcomeModal = (neverShowAgain = true) => {
    if (neverShowAgain) {
      localStorage.setItem('cipherforge_welcome_seen', 'true');
    }
    setWelcomeOpen(false);
  };

  // Keyboard shortcut: Space or Cmd/Ctrl+G to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (welcomeOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleGenerate();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG') {
        e.preventDefault();
        handleGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, welcomeOpen]);

  // Synchronized length changes
  const handleLengthChange = (val: number) => {
    const clamped = Math.max(8, Math.min(64, val || 8));
    const nextOpts = { ...options, length: clamped };
    setOptions(nextOpts);
    handleGenerate(nextOpts);
  };

  // Toggle character sets safely
  const handleToggleOption = (key: keyof GeneratorOptions) => {
    if (key === 'length') return;

    if (key !== 'excludeAmbiguous' && options[key] === true) {
      const activeCount = [
        options.includeUppercase,
        options.includeLowercase,
        options.includeNumbers,
        options.includeSymbols,
      ].filter(Boolean).length;

      if (activeCount <= 1) {
        return; // Guard: Keep at least one active set
      }
    }

    const nextOpts = { ...options, [key]: !options[key] };
    setOptions(nextOpts);
    handleGenerate(nextOpts);
  };

  // Copy helper
  const copyToClipboard = async (text: string, isHistoryId?: string) => {
    playClickSound(880);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (isHistoryId) {
        setCopiedHistoryId(isHistoryId);
        setTimeout(() => setCopiedHistoryId(null), 1800);
      } else {
        setCopiedMain(true);
        setTimeout(() => setCopiedMain(false), 1800);
      }
    } catch {
      // Fallback
    }
  };

  // Presets definition with vibrant badges
  const presets = [
    {
      title: 'High Security (Recommended)',
      tag: 'Balanced',
      tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      desc: '16 characters across letters, digits & symbols. Ideal for master accounts and password managers.',
      opts: {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: false,
      },
    },
    {
      title: 'Ultra Fortified',
      tag: 'Max Entropy',
      tagColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
      desc: '32 characters with extreme cryptographic entropy (>200 bits) for root credentials and API secrets.',
      opts: {
        length: 32,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: false,
      },
    },
    {
      title: 'Alphanumeric Only',
      tag: 'No Symbols',
      tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      desc: '20 characters using letters and numbers for legacy systems with strict symbol restrictions.',
      opts: {
        length: 20,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeAmbiguous: false,
      },
    },
    {
      title: 'Easy to Read & Type',
      tag: 'No Ambiguity',
      tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      desc: '16 characters with zero visual ambiguity (omits 0, O, 1, l, I) for printed cards and manual keypad entry.',
      opts: {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: true,
      },
    },
    {
      title: 'Numeric PIN',
      tag: '8 Digits',
      tagColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      desc: '8 digits for hardware authenticators, door keypads, and telephone security codes.',
      opts: {
        length: 8,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: true,
        includeSymbols: false,
        excludeAmbiguous: false,
      },
    },
  ];

  const applyPreset = (presetOpts: GeneratorOptions) => {
    setOptions(presetOpts);
    handleGenerate(presetOpts);
    setActiveTab('generator');
  };

  // Password analysis memo
  const analysis: PasswordAnalysis = useMemo(() => {
    return analyzePassword(password, options);
  }, [password, options]);

  // Multi-color Strength Palette
  const strengthColorMap = {
    Weak: {
      bar: 'bg-rose-500',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      badge: 'bg-rose-950/60 text-rose-300 border-rose-800/50',
    },
    Fair: {
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      badge: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
    },
    Strong: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
    },
    Excellent: {
      bar: 'bg-gradient-to-r from-violet-500 to-cyan-400',
      text: 'text-violet-300',
      border: 'border-violet-500/40',
      badge: 'bg-violet-950/60 text-violet-300 border-violet-800/50',
    },
  };

  const currentTheme = strengthColorMap[analysis.strength];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting subtle radial gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[110px]" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-violet-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0a0f1d]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand Wordmark with vibrant badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-indigo-900/30">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                CipherForge
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CSPRNG
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('generator')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'generator' ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold' : ''
              }`}
            >
              Generator
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'presets' ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold' : ''
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`hover:text-white transition-colors whitespace-nowrap pb-1 ${
                activeTab === 'guide' ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold' : ''
              }`}
            >
              Security Specs
            </button>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Tour / Welcome Modal Trigger */}
            <button
              type="button"
              onClick={() => setWelcomeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-colors"
              title="First time? View Quick Tour & Features"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Tour & Help</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-400'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title={soundEnabled ? 'Disable audio feedback' : 'Enable audio clicks'}
              aria-label="Toggle audio feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-center p-1 bg-slate-900/90 border border-slate-800 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'generator' ? 'bg-indigo-950/80 text-indigo-300 shadow-sm border border-indigo-800/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Generator
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'presets' ? 'bg-indigo-950/80 text-indigo-300 shadow-sm border border-indigo-800/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'guide' ? 'bg-indigo-950/80 text-indigo-300 shadow-sm border border-indigo-800/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Specs
          </button>
        </div>

        {/* Tab 1: Password Generator */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* Password Display Card with Gradient Border */}
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/40 via-purple-500/20 to-emerald-500/40 shadow-2xl shadow-black/50">
              <div className="bg-[#0b101e] rounded-2xl p-5 sm:p-7">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Generated Password
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {password.length} chars
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setColorCodeChars(!colorCodeChars)}
                      className={`text-xs transition-colors px-2 py-0.5 rounded ${
                        colorCodeChars
                          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Color Syntax: {colorCodeChars ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>

                {/* Password Output Field */}
                <div className="py-2 min-h-[58px] flex items-center">
                  <div className="font-mono text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide break-all select-all leading-relaxed">
                    {!showPassword ? (
                      <span className="text-slate-500 tracking-widest font-mono">
                        {'•'.repeat(password.length)}
                      </span>
                    ) : colorCodeChars ? (
                      <span>
                        {password.split('').map((char, index) => {
                          const category = getCharCategory(char);
                          let styleClass = 'text-slate-100';
                          if (category === 'upper') styleClass = 'text-indigo-400 font-bold';
                          else if (category === 'lower') styleClass = 'text-cyan-300';
                          else if (category === 'number') styleClass = 'text-emerald-400 font-bold';
                          else if (category === 'symbol') styleClass = 'text-amber-400 font-bold';
                          else if (category === 'ambiguous') styleClass = 'text-rose-400 underline decoration-rose-500/50';

                          return (
                            <span key={index} className={styleClass}>
                              {char}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-100">{password}</span>
                    )}
                  </div>
                </div>

                {/* Main Action Bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  {/* Visual Character Syntax Legend */}
                  {colorCodeChars && showPassword ? (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-indigo-300">Upper</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-cyan-300">Lower</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-300">Digits</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-amber-300">Symbols</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">⌘G</kbd> to regenerate
                    </div>
                  )}

                  {/* Buttons: Reveal, Refresh, Copy */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-all active:scale-95 group"
                      title="Generate new password (Space or ⌘G)"
                      aria-label="Generate new password"
                    >
                      <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(password)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 ${
                        copiedMain
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/30'
                          : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950/50'
                      }`}
                    >
                      {copiedMain ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Strength & Entropy Intelligence Panel */}
            <div className="bg-[#0b101e] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-slate-400">Calculated Strength:</span>
                  <span className={`font-bold uppercase tracking-wider text-xs px-2.5 py-0.5 rounded-full border ${currentTheme.badge}`}>
                    {analysis.strength}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span>
                    Entropy: <strong className="text-white">{analysis.entropyBits} bits</strong>
                  </span>
                  <span className="hidden sm:inline text-slate-700">|</span>
                  <span className="hidden sm:inline">
                    Pool: <strong className="text-white">{analysis.poolSize} chars</strong>
                  </span>
                </div>
              </div>

              {/* 4-Segment Progress Bar */}
              <div className="grid grid-cols-4 gap-2 h-2.5 rounded-full overflow-hidden bg-slate-900 p-0.5 border border-slate-800">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-full rounded-sm transition-all duration-300 ${
                      seg <= analysis.score ? currentTheme.bar : 'bg-slate-800/40'
                    }`}
                  />
                ))}
              </div>

              {/* Crack Time & Character Diversity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brute-force resistance (100 GH/s):</span>
                  <span className="font-semibold text-emerald-400 font-mono">{analysis.estimatedCrackTime}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={`px-1.5 py-0.5 rounded ${analysis.details.hasUpper ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/40' : 'text-slate-600'}`}>A-Z</span>
                  <span className={`px-1.5 py-0.5 rounded ${analysis.details.hasLower ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40' : 'text-slate-600'}`}>a-z</span>
                  <span className={`px-1.5 py-0.5 rounded ${analysis.details.hasNumbers ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'text-slate-600'}`}>0-9</span>
                  <span className={`px-1.5 py-0.5 rounded ${analysis.details.hasSymbols ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40' : 'text-slate-600'}`}>!@#</span>
                </div>
              </div>
            </div>

            {/* Generator Controls */}
            <div className="bg-[#0b101e] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-6 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span>Configuration & Character Rules</span>
                </div>
                <span className="text-xs text-slate-400">8 to 64 characters</span>
              </div>

              {/* Slider & Numeric Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="lengthRange" className="text-sm font-semibold text-slate-200">
                    Password Length
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="lengthNum"
                      min={8}
                      max={64}
                      value={options.length}
                      onChange={(e) => handleLengthChange(parseInt(e.target.value, 10))}
                      className="w-16 h-9 text-center bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-base focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <span className="text-xs text-slate-400 font-mono">chars</span>
                  </div>
                </div>

                <div className="relative pt-1">
                  <input
                    type="range"
                    id="lengthRange"
                    min={8}
                    max={64}
                    value={options.length}
                    onChange={(e) => handleLengthChange(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-all"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>8 (Min)</span>
                    <span className="text-indigo-400 font-semibold">16 (Default)</span>
                    <span>32 (Strong)</span>
                    <span>64 (Max)</span>
                  </div>
                </div>
              </div>

              {/* Distinct Color-Coded Character Set Toggles */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                  Character Sets
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Uppercase: Violet/Indigo Theme */}
                  <label
                    onClick={() => handleToggleOption('includeUppercase')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                      options.includeUppercase
                        ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm shadow-indigo-950/40'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={options.includeUppercase}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-indigo-500"
                      />
                      <div>
                        <div className={`text-sm font-semibold ${options.includeUppercase ? 'text-indigo-300' : 'text-slate-300'}`}>
                          Uppercase Letters
                        </div>
                        <div className="text-xs font-mono text-slate-400">A - Z (26 chars)</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-indigo-400 font-bold hidden sm:inline">ABC</span>
                  </label>

                  {/* Lowercase: Cyan/Teal Theme */}
                  <label
                    onClick={() => handleToggleOption('includeLowercase')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                      options.includeLowercase
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={options.includeLowercase}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-cyan-500"
                      />
                      <div>
                        <div className={`text-sm font-semibold ${options.includeLowercase ? 'text-cyan-300' : 'text-slate-300'}`}>
                          Lowercase Letters
                        </div>
                        <div className="text-xs font-mono text-slate-400">a - z (26 chars)</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 font-bold hidden sm:inline">xyz</span>
                  </label>

                  {/* Numbers: Emerald Theme */}
                  <label
                    onClick={() => handleToggleOption('includeNumbers')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                      options.includeNumbers
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={options.includeNumbers}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-emerald-500"
                      />
                      <div>
                        <div className={`text-sm font-semibold ${options.includeNumbers ? 'text-emerald-300' : 'text-slate-300'}`}>
                          Numbers
                        </div>
                        <div className="text-xs font-mono text-slate-400">0 - 9 (10 chars)</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold hidden sm:inline">019</span>
                  </label>

                  {/* Special Symbols: Amber/Gold Theme */}
                  <label
                    onClick={() => handleToggleOption('includeSymbols')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                      options.includeSymbols
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-950/40'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={options.includeSymbols}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-amber-500"
                      />
                      <div>
                        <div className={`text-sm font-semibold ${options.includeSymbols ? 'text-amber-300' : 'text-slate-300'}`}>
                          Special Symbols
                        </div>
                        <div className="text-xs font-mono text-slate-400">!@#$%^&*()_+...</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-bold hidden sm:inline">!#%</span>
                  </label>
                </div>

                {/* Exclude Ambiguous: Rose/Coral Theme */}
                <label
                  onClick={() => handleToggleOption('excludeAmbiguous')}
                  className={`flex items-start sm:items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                    options.excludeAmbiguous
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-sm'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <input
                      type="checkbox"
                      checked={options.excludeAmbiguous}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 sm:mt-0 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer accent-rose-500"
                    />
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span className={options.excludeAmbiguous ? 'text-rose-300' : 'text-slate-300'}>
                          Exclude Ambiguous Characters
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
                          High Readability
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        Omits confusing glyphs: <code className="text-rose-300 font-bold">l</code>, <code className="text-rose-300 font-bold">I</code>, <code className="text-rose-300 font-bold">1</code>, <code className="text-rose-300 font-bold">O</code>, <code className="text-rose-300 font-bold">0</code>, <code className="text-rose-300 font-bold">o</code>, <code className="text-rose-300 font-bold">|</code>
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Primary Generate Button (Vibrant Emerald Gradient) */}
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-950/50 active:scale-[0.99] transition-all cursor-pointer"
              >
                <KeyRound className="w-5 h-5 text-slate-950" />
                <span>Generate Secure Password</span>
              </button>
            </div>

            {/* Password History (Last 5 Passwords) */}
            <div className="bg-[#0b101e] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Recent Passwords (Last 5)</span>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  No generated passwords in history yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-all"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-200 truncate select-all">
                          {item.password}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
                          <span>{item.length} chars</span>
                          <span aria-hidden="true" className="text-slate-700">·</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              item.strength === 'Excellent'
                                ? 'text-violet-300 bg-violet-950/60 border border-violet-800/40'
                                : item.strength === 'Strong'
                                ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/40'
                                : item.strength === 'Fair'
                                ? 'text-amber-300 bg-amber-950/60 border border-amber-800/40'
                                : 'text-rose-300 bg-rose-950/60 border border-rose-800/40'
                            }`}
                          >
                            {item.strength}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.password, item.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            copiedHistoryId === item.id
                              ? 'bg-emerald-900/60 border-emerald-500/60 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {copiedHistoryId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Recommended Security Profiles</h2>
              <p className="text-sm text-slate-400">
                Tailored configurations crafted for specific systems and security tiers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {presets.map((preset, idx) => (
                <div
                  key={idx}
                  className="bg-[#0b101e] border border-slate-800/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{preset.title}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${preset.tagColor}`}>
                        {preset.tag}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {preset.opts.length} chars
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">{preset.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => applyPreset(preset.opts)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 border border-slate-700 hover:border-indigo-500 transition-all whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Apply Preset</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Security Specifications */}
        {activeTab === 'guide' && (
          <div className="space-y-6 bg-[#0b101e] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-lg">
            <div>
              <h2 className="text-lg font-bold text-white">Cryptographic Standards & Architecture</h2>
              <p className="text-xs text-slate-400 mt-1">
                Zero network requests, zero telemetry, and pure browser-native entropy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-indigo-400 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hardware Entropy Pool</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Utilizes <code className="text-indigo-300 font-mono">window.crypto.getRandomValues()</code> to sample from operating-system entropy sources (kernel CSPRNG). Predictable engines like <code className="text-rose-400 font-mono">Math.random()</code> are prohibited.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-400 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Modulo Bias Prevention</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Standard remainder math introduces statistical bias toward lower ASCII values. CipherForge applies rejection sampling over 32-bit integer boundaries for true uniform distribution across all character pools.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Fisher-Yates Permutation</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Guarantees representation of every selected character category, followed by an unbiased cryptographic shuffle so character positions have zero structural leakage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-cyan-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Local Memory Isolation</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Generated strings and temporary history are stored solely in volatile browser memory. No data is written to remote databases, external APIs, or analytics trackers.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080d18] py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">CipherForge</span>
            <span aria-hidden="true">·</span>
            <span>Cryptographic Client-Side Password Generator</span>
          </div>

          <button
            type="button"
            onClick={() => setWelcomeOpen(true)}
            className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How it works</span>
          </button>
        </div>
      </footer>

      {/* First-Time Welcome Modal / Walkthrough Popup */}
      {welcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0d1424] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            {/* Top decorative gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-cyan-400" />

            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Welcome to CipherForge</h3>
                  <p className="text-xs text-slate-400">Your secure, client-side password laboratory</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeWelcomeModal(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close welcome popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Explanation */}
            <div className="px-6 py-2 space-y-4 text-xs text-slate-300">
              <p className="leading-relaxed text-slate-300">
                CipherForge creates mathematically resilient passwords using your browser&apos;s cryptographically secure pseudo-random number generator (<code className="text-indigo-300 font-mono">window.crypto</code>), completely eliminating the predictability of standard generators.
              </p>

              {/* 3 Key Feature Highlights */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white block font-semibold text-xs">Custom Length & Sets</strong>
                    <span className="text-slate-400">
                      Adjust length from 8 to 64 characters, toggle uppercase, lowercase, numbers, symbols, or exclude ambiguous letters like <code className="text-rose-300 font-mono">0</code> and <code className="text-rose-300 font-mono">O</code>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-white block font-semibold text-xs">Real-Time Strength & Entropy</strong>
                    <span className="text-slate-400">
                      Monitors Shannon entropy bits and estimates brute-force crack time against modern high-performance GPU clusters.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-white block font-semibold text-xs">Where to Start</strong>
                    <span className="text-slate-400">
                      Adjust the slider or pick a preset, tap <strong className="text-slate-200">Generate Password</strong> (or tap <kbd className="px-1 rounded bg-slate-800 font-mono text-[10px]">Space</kbd>), then click <strong className="text-slate-200">Copy</strong> to use it immediately.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-6 pt-4 flex items-center justify-between border-t border-slate-800/80 mt-3 bg-slate-900/40">
              <span className="text-[11px] text-slate-500 font-mono">
                Private & client-side only
              </span>

              <button
                type="button"
                onClick={() => closeWelcomeModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
