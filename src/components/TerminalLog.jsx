import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import clsx from 'clsx';

const LogMessage = ({ log }) => {
  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className={clsx("font-mono text-xs leading-relaxed break-all", getLogColor(log.type))}>
      <span className="opacity-50 mr-2">{'>'}</span>
      {log.text}
    </div>
  );
};

const TerminalLog = () => {
  const { logs, clearLogs } = useStore();
  const endOfLogsRef = useRef(null);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass-panel h-full flex flex-col border border-[rgba(255,255,255,0.05)] bg-[rgba(9,9,11,0.85)]">
      {/* Шапка терминала */}
      <div className="flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Terminal Output</span>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      {/* Вывод логов */}
      <div className="flex-1 p-4 overflow-y-auto terminal-scrollbar flex flex-col gap-1">
        {logs.length === 0 ? (
          <div className="font-mono text-xs text-slate-500 italic opacity-50">Ожидание команд...</div>
        ) : (
          logs.map(log => <LogMessage key={log.id} log={log} />)
        )}
        <div ref={endOfLogsRef} />
      </div>

      {/* Футер терминала */}
      {logs.length > 0 && (
        <div className="p-2 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] flex justify-end">
          <button
            onClick={clearLogs}
            className="flex items-center gap-1 text-[10px] uppercase font-mono text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default TerminalLog;
