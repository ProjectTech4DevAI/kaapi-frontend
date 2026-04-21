"use client";

import { useRef, useCallback } from 'react';
import { colors } from '@/app/lib/colors';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  isValid?: boolean;
  placeholder?: string;
  minHeight?: number;
}

/* JSON token colors — light background */
const C = {
  key:     '#0550ae', // blue — property keys
  string:  '#116329', // green — string values
  number:  '#953800', // orange — numbers
  boolean: '#8250df', // purple — true/false
  null:    '#8250df', // purple — null
  punct:   '#6e7781', // gray — brackets, commas, colons
};

function highlight(code: string): string {
  if (!code) return '';

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let result = '';
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code)) !== null) {
    // punctuation / whitespace between tokens
    if (cursor < m.index) {
      result += `<span style="color:${C.punct}">${escHtml(code.slice(cursor, m.index))}</span>`;
    }

    if (m[1] !== undefined) {
      const isKey = !!m[2];
      result += `<span style="color:${isKey ? C.key : C.string}">${escHtml(m[1])}</span>`;
      if (m[2]) result += `<span style="color:${C.punct}">${escHtml(m[2])}</span>`;
      cursor = m.index + m[0].length;
    } else if (m[3] !== undefined) {
      result += `<span style="color:${m[3] === 'null' ? C.null : C.boolean}">${escHtml(m[3])}</span>`;
      cursor = m.index + m[3].length;
    } else if (m[4] !== undefined) {
      result += `<span style="color:${C.number}">${escHtml(m[4])}</span>`;
      cursor = m.index + m[4].length;
    }
  }

  if (cursor < code.length) {
    result += `<span style="color:${C.punct}">${escHtml(code.slice(cursor))}</span>`;
  }

  return result;
}

const FONT: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '13px',
  lineHeight: '1.7',
  tabSize: 2,
};

export default function JsonEditor({ value, onChange, error, isValid, placeholder, minHeight = 400 }: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const newVal = value.substring(0, s) + '  ' + value.substring(el.selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
      return;
    }
    const pairs: Record<string, string> = { '{': '}', '[': ']' };
    if (pairs[e.key]) {
      const el = e.currentTarget;
      const s = el.selectionStart;
      if (s === el.selectionEnd) {
        e.preventDefault();
        const newVal = value.substring(0, s) + e.key + pairs[e.key] + value.substring(s);
        onChange(newVal);
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 1; });
      }
    }
  };

  const borderColor = error
    ? 'rgba(239,68,68,0.4)'
    : isValid && value.trim()
      ? 'rgba(34,197,94,0.35)'
      : colors.border;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
      {/* Minimal top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2">
          <span style={{ ...FONT, fontSize: '11px', color: colors.text.secondary }}>JSON</span>
          {value.trim() && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={
                error
                  ? { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.07)' }
                  : isValid
                    ? { color: '#16a34a', backgroundColor: 'rgba(22,163,74,0.07)' }
                    : {}
              }
            >
              {error ? 'Invalid' : isValid ? 'Valid' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[11px] truncate max-w-xs" style={{ color: '#ef4444' }}>{error}</span>}
          {value.trim() && (
            <button onClick={() => onChange('')} className="cursor-pointer text-xs" style={{ color: colors.text.secondary }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="relative overflow-auto" style={{ minHeight, backgroundColor: colors.bg.primary }}>
        {/* Placeholder */}
        {!value && placeholder && (
          <pre
            aria-hidden
            style={{ ...FONT, position: 'absolute', inset: 0, padding: '16px 20px', color: colors.border, pointerEvents: 'none', zIndex: 0, margin: 0 }}
          >
            {placeholder}
          </pre>
        )}

        {/* Highlighted layer */}
        <pre
          ref={preRef}
          aria-hidden
          style={{ ...FONT, position: 'absolute', inset: 0, padding: '16px 20px', margin: 0, pointerEvents: 'none', overflow: 'hidden', minHeight, zIndex: 1, whiteSpace: 'pre', wordBreak: 'normal' }}
          dangerouslySetInnerHTML={{ __html: highlight(value) + '\n' }}
        />

        {/* Editable layer */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="relative w-full resize-none outline-none"
          style={{ ...FONT, position: 'relative', padding: '16px 20px', backgroundColor: 'transparent', color: 'transparent', caretColor: colors.text.primary, minHeight, zIndex: 2, border: 'none', display: 'block', whiteSpace: 'pre', wordBreak: 'normal' }}
        />
      </div>
    </div>
  );
}
