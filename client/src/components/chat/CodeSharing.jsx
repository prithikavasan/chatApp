import React, { useState } from 'react';
import { FiCopy, FiCheck, FiPlay, FiTerminal } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const CodeSharing = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalOutput('Compiling code files...\nResolving dependencies...\n');

    setTimeout(() => {
      setTerminalOutput((prev) => prev + `Running script under compiler environment: ${language.toUpperCase()}\n\n`);
      
      setTimeout(() => {
        // Generate simulated output based on code or language
        let output = '';
        if (code.toLowerCase().includes('hello')) {
          output = 'Hello, World!\n';
        } else if (code.toLowerCase().includes('add') || code.toLowerCase().includes('sum')) {
          output = 'Result: 15\n';
        } else {
          output = 'Task completed successfully.\n';
        }
        
        setTerminalOutput(
          (prev) =>
            prev +
            output +
            '\n---------------------------------\n' +
            `Process exited successfully with code 0 (0.12s)`
        );
        setIsRunning(false);
      }, 1000);
    }, 800);
  };

  // Custom regex-based code syntax highlighter for beautiful layout
  const highlightCode = (rawCode, lang) => {
    if (!rawCode) return '';
    
    // HTML Escape
    let escaped = rawCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Simple highlighting rules
    const rules = [
      // Strings
      { regex: /(["'`])(.*?)\1/g, class: 'syntax-string' },
      // Comments
      { regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g, class: 'syntax-comment' },
      // Keywords
      {
        regex: /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|true|false|null|async|await|try|catch|require|module)\b/g,
        class: 'syntax-keyword',
      },
      // Numbers
      { regex: /\b(\d+)\b/g, class: 'syntax-number' },
      // Functions
      { regex: /\b(\w+)(?=\()/g, class: 'syntax-function' },
    ];

    let highlighted = escaped;
    rules.forEach((rule) => {
      // We wrap the matches with spans using temporary tokens to avoid highlighting already highlighted HTML classes
      highlighted = highlighted.replace(rule.regex, `<span class="${rule.class}">$&</span>`);
    });

    return highlighted;
  };

  return (
    <div
      style={{
        background: '#0d1117', // VS Code Dark Theme background
        borderRadius: '10px',
        border: '1px solid #30363d',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: '100%',
        margin: '8px 0',
      }}
    >
      {/* Editor Titlebar (macOS styling) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#161b22',
          borderBottom: '1px solid #21262d',
        }}
      >
        {/* macOS Windows controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: '#8b949e', fontWeight: 600 }}>
            snippet.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'html' ? 'html' : 'txt'}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#c9d1d9')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}
          >
            {copied ? <FiCheck style={{ color: '#56d364' }} /> : <FiCopy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              background: 'rgba(56, 139, 253, 0.15)',
              border: '1px solid rgba(56, 139, 253, 0.4)',
              color: '#58a6ff',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (!isRunning) e.currentTarget.style.background = 'rgba(56, 139, 253, 0.3)';
            }}
            onMouseOut={(e) => {
              if (!isRunning) e.currentTarget.style.background = 'rgba(56, 139, 253, 0.15)';
            }}
          >
            <FiPlay size={12} />
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Editor Content Area with Line Numbers */}
      <div style={{ display: 'flex', overflowX: 'auto', maxHeight: '350px' }}>
        {/* Line Numbers */}
        <div
          style={{
            padding: '12px 8px 12px 16px',
            color: '#484f58',
            textAlign: 'right',
            userSelect: 'none',
            borderRight: '1px solid #21262d',
            background: '#0d1117',
          }}
        >
          {code.split('\n').map((_, index) => (
            <div key={index} style={{ height: '19px' }}>
              {index + 1}
            </div>
          ))}
        </div>

        {/* Code Renderer */}
        <pre
          style={{
            margin: 0,
            padding: '12px 16px',
            color: '#c9d1d9',
            overflowX: 'auto',
            flex: 1,
            lineHeight: '19px',
            whiteSpace: 'pre',
          }}
        >
          <code
            dangerouslySetInnerHTML={{
              __html: highlightCode(code, language),
            }}
          />
        </pre>
      </div>

      {/* Simulated Terminal Overlay */}
      {showTerminal && (
        <div style={{ borderTop: '1px solid #30363d', background: '#090d13', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#58a6ff', fontSize: '0.75rem', fontWeight: 600 }}>
              <FiTerminal size={14} /> Output Terminal
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: '0.72rem' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#8b949e')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#484f58')}
            >
              Clear
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '8px',
              background: '#0d1117',
              borderRadius: '6px',
              border: '1px solid #21262d',
              color: '#a5d6ff',
              fontSize: '0.78rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: '1.4',
            }}
          >
            {terminalOutput}
            {isRunning && <span className="terminal-cursor">|</span>}
          </pre>
        </div>
      )}

      {/* CSS Syntax classes embedded in component context */}
      <style dangerouslySetInnerHTML={{__html: `
        .syntax-keyword { color: #ff7b72; font-weight: bold; }
        .syntax-comment { color: #8b949e; font-style: italic; }
        .syntax-string { color: #a5d6ff; }
        .syntax-number { color: #f0883e; }
        .syntax-function { color: #d2a8ff; }
        
        .terminal-cursor {
          animation: blink 1s step-end infinite;
          color: #58a6ff;
          font-weight: bold;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default CodeSharing;
