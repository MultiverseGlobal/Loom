"use client";

import { Code2, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CodePreviewProps {
  code: string;
  filename: string;
  language?: string;
}

export function CodePreview({ code, filename, language = "typescript" }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting via regex (MVP)
  const highlightCode = (text: string) => {
    if (!text) return "";
    
    // Escape HTML
    let highlighted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Keywords
    highlighted = highlighted.replace(/\b(import|from|export|default|function|const|let|var|return|if|else|async|await|interface|type)\b/g, '<span class="text-[#c678dd]">$1</span>');
    
    // Strings
    highlighted = highlighted.replace(/(['"`])(.*?)\1/g, '<span class="text-[#98c379]">$1$2$1</span>');
    
    // Functions and component-like names
    highlighted = highlighted.replace(/\b([A-Z][a-zA-Z0-9]+)\b/g, '<span class="text-[#e5c07b]">$1</span>');
    
    // Comments
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-[#5c6370] italic">$1</span>');

    return highlighted;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-[#61dafb]" />
          <span className="text-[11px] font-mono text-[#ccc]">{filename}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 px-2 rounded hover:bg-white/5 text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
          <Copy size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 font-mono text-[13px] leading-relaxed select-text">
        <pre className="whitespace-pre overflow-hidden">
          <code 
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
            className="block"
          />
        </pre>
      </div>
      
      <div className="flex items-center gap-2 px-4 py-1 bg-[#007acc] text-white text-[10px] uppercase font-bold tracking-widest">
        <Terminal size={10} />
        Ready for IDE Import
      </div>
    </div>
  );
}
