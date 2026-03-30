import React from 'react';
import DropZone from './components/DropZone';
import AiParser from './components/AiParser';
import TerminalLog from './components/TerminalLog';
import GenerateButton from './components/GenerateButton';
import { Layers } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col items-center">
      {/* Шапка */}
      <header className="w-full max-w-7xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand)] to-[rgba(234,88,12,0.4)] flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.4)]">
            <Layers className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase">Tender<span className="text-[var(--color-brand)] font-light">Gen</span></h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest mt-0.5">Automated DOCX Generation</p>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Левая панель - Управление и Парсер */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-panel p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="mb-6 border-b border-[rgba(255,255,255,0.1)] pb-4">
              <h2 className="text-lg font-semibold text-slate-200 uppercase tracking-widest">Рабочая область</h2>
              <p className="text-sm text-slate-400 mt-1 font-mono">Загрузите mapping.json, файлы данных и шаблоны DOCX</p>
            </div>

            <DropZone />
            <GenerateButton />
          </div>

          {/* Панель AI Парсера */}
          <AiParser />
        </div>

        {/* Правая панель - Терминал */}
        <div className="lg:col-span-5 h-[500px] lg:h-full lg:min-h-[600px] relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.8)] pointer-events-none z-10"></div>
          <TerminalLog />
        </div>
      </main>
    </div>
  );
}

export default App;
