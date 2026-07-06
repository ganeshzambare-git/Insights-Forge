import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Mic, Globe, Paperclip, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Animated pill chat input — collapsed it cycles ghost-typed placeholder
// prompts; focused it expands to reveal Think / Deep Search toggles.
// Controlled: parent owns the value so suggestion chips can prefill it.

interface AIChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholders?: string[];
  /** Shown as staggered animated rows above the pill while the input is focused and empty */
  suggestions?: string[];
}

const DEFAULT_PLACEHOLDERS = [
  'How many records are in this dataset?',
  'What is the total revenue in this dataset?',
  'Summarize the most important insights.',
  'Which category is growing fastest?',
  'Any anomalies I should look at?',
];

const containerVariants = {
  collapsed: {
    height: 68,
    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
    transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
  },
  expanded: {
    height: 128,
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.16)',
    transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
  },
};

const placeholderContainerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.025 } },
  exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
};

const letterVariants = {
  initial: { opacity: 0, filter: 'blur(12px)', y: 10 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      opacity: { duration: 0.25 },
      filter: { duration: 0.4 },
      y: { type: 'spring' as const, stiffness: 80, damping: 20 },
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(12px)',
    y: -10,
    transition: {
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 },
      y: { type: 'spring' as const, stiffness: 80, damping: 20 },
    },
  },
};

const suggestionListVariants = {
  hidden: { opacity: 0, y: 8, transition: { duration: 0.18 } },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const suggestionItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

export const AIChatInput: React.FC<AIChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholders = DEFAULT_PLACEHOLDERS,
  suggestions = [],
}) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [thinkActive, setThinkActive] = useState(false);
  const [deepSearchActive, setDeepSearchActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cycle placeholder text when input is inactive
  useEffect(() => {
    if (isActive || value) return;
    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setShowPlaceholder(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, value, placeholders.length]);

  // Collapse when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!value) setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleActivate = () => setIsActive(true);

  const handleSend = () => {
    if (disabled || !value.trim()) return;
    onSend();
  };

  return (
    <div className="w-full flex justify-center items-center text-black">
      <div className="relative w-full max-w-3xl" ref={wrapperRef}>
        {/* Suggested queries — slide in line-by-line while focused & empty */}
        <AnimatePresence>
          {isActive && !value && !disabled && suggestions.length > 0 && (
            <motion.div
              className="absolute bottom-full left-0 right-0 mb-3 z-20"
              variants={suggestionListVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div
                className="bg-white border rounded-2xl p-3"
                style={{ borderColor: '#e8e8e8', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.10)' }}
              >
                <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-slate px-2 pb-2">
                  Suggested queries
                </p>
                <div className="flex flex-col gap-1">
                  {suggestions.map((sug) => (
                    <motion.button
                      key={sug}
                      type="button"
                      variants={suggestionItemVariants}
                      className="text-left text-sm text-steel rounded-xl px-3 py-2 hover:bg-ash hover:text-graphite transition-colors"
                      // mousedown (not click) so the outside-click collapse never wins
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(sug);
                      }}
                    >
                      {sug}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <motion.div
        className="w-full max-w-3xl"
        variants={containerVariants}
        animate={isActive || value ? 'expanded' : 'collapsed'}
        initial="collapsed"
        style={{ overflow: 'hidden', borderRadius: 32, background: '#fff', border: '1px solid #e8e8e8' }}
        onClick={handleActivate}
      >
        <div className="flex flex-col items-stretch w-full h-full">
          {/* Input Row */}
          <div className="flex items-center gap-2 p-3 rounded-full bg-white max-w-3xl w-full">
            <button
              className="p-3 rounded-full hover:bg-gray-100 transition"
              title="Attach file"
              type="button"
              tabIndex={-1}
            >
              <Paperclip size={20} />
            </button>

            {/* Text Input & Placeholder */}
            <div className="relative flex-1">
              <input
                type="text"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 border-0 outline-none focus:outline-none focus-visible:outline-none rounded-md py-2 text-base bg-transparent w-full font-normal disabled:opacity-60"
                style={{ position: 'relative', zIndex: 1, outline: 'none', boxShadow: 'none' }}
                onFocus={handleActivate}
                aria-label="Chat message"
              />
              <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center px-3 py-2">
                <AnimatePresence mode="wait">
                  {showPlaceholder && !isActive && !value && (
                    <motion.span
                      key={placeholderIndex}
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 select-none pointer-events-none"
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        zIndex: 0,
                      }}
                      variants={placeholderContainerVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {placeholders[placeholderIndex].split('').map((char, i) => (
                        <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block' }}>
                          {char === ' ' ? ' ' : char}
                        </motion.span>
                      ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              className="p-3 rounded-full hover:bg-gray-100 transition"
              title="Voice input"
              type="button"
              tabIndex={-1}
            >
              <Mic size={20} />
            </button>
            <button
              className="flex items-center gap-1 bg-black hover:bg-zinc-700 text-white p-3 rounded-full font-medium justify-center disabled:opacity-50"
              title="Send"
              type="button"
              disabled={disabled}
              onClick={handleSend}
            >
              <Send size={18} />
            </button>
          </div>

          {/* Expanded Controls */}
          <motion.div
            className="w-full flex justify-start px-4 items-center text-sm"
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
                pointerEvents: 'none' as const,
                transition: { duration: 0.25 },
              },
              visible: {
                opacity: 1,
                y: 0,
                pointerEvents: 'auto' as const,
                transition: { duration: 0.35, delay: 0.08 },
              },
            }}
            initial="hidden"
            animate={isActive || value ? 'visible' : 'hidden'}
            style={{ marginTop: 8 }}
          >
            <div className="flex gap-3 items-center">
              {/* Think Toggle */}
              <button
                className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all font-medium group ${
                  thinkActive
                    ? 'bg-ember/10 outline outline-1 outline-ember/60 text-graphite'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Think"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setThinkActive((a) => !a);
                }}
              >
                <Lightbulb className="group-hover:fill-yellow-300 transition-all" size={18} />
                Think
              </button>

              {/* Deep Search Toggle */}
              <motion.button
                className={`flex items-center px-4 gap-1 py-2 rounded-full transition font-medium whitespace-nowrap overflow-hidden justify-start ${
                  deepSearchActive
                    ? 'bg-ember/10 outline outline-1 outline-ember/60 text-graphite'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Deep Search"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeepSearchActive((a) => !a);
                }}
                initial={false}
                animate={{
                  width: deepSearchActive ? 125 : 36,
                  paddingLeft: deepSearchActive ? 8 : 9,
                }}
              >
                <div className="flex-1">
                  <Globe size={18} />
                </div>
                <motion.span
                  className="pb-[2px]"
                  initial={false}
                  animate={{ opacity: deepSearchActive ? 1 : 0 }}
                >
                  Deep Search
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};
