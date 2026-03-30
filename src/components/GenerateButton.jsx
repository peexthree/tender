import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { generateDocuments } from '../services/docxBuilder';
import useStore from '../store/useStore';
import clsx from 'clsx';

const GenerateButton = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { docxTemplates, jsonFiles } = useStore();

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    await generateDocuments();
    setIsGenerating(false);
  };

  const isReady = docxTemplates.length > 0 && jsonFiles.length > 0;

  return (
    <div className="w-full relative mt-4">
      <button
        onClick={handleGenerateClick}
        disabled={isGenerating || !isReady}
        className={clsx(
          "w-full py-4 px-6 rounded-xl font-bold uppercase tracking-[0.2em] text-sm transition-all duration-300 flex items-center justify-center gap-3",
          "border border-[rgba(255,255,255,0.1)] shadow-[0_0_20px_rgba(0,0,0,0.5)]",
          isReady && !isGenerating
            ? "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-light)] hover:shadow-[0_0_30px_rgba(234,88,12,0.4)] glitch-btn cursor-pointer"
            : "bg-[rgba(255,255,255,0.05)] text-slate-500 cursor-not-allowed opacity-70"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Генерация...</span>
          </>
        ) : (
          <>
            <Zap className={clsx("w-5 h-5", isReady ? "animate-pulse" : "")} />
            <span className={clsx(isReady ? "neon-text" : "")}>Сгенерировать</span>
          </>
        )}
      </button>

      {/* Индикаторы готовности */}
      <div className="flex justify-between items-center mt-3 text-xs font-mono uppercase px-2">
        <div className="flex items-center gap-2">
          <div className={clsx("w-2 h-2 rounded-full", jsonFiles.length > 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
          <span className={clsx(jsonFiles.length > 0 ? "text-green-400" : "text-slate-500")}>Данные (JSON)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(docxTemplates.length > 0 ? "text-green-400" : "text-slate-500")}>Шаблоны (DOCX)</span>
          <div className={clsx("w-2 h-2 rounded-full", docxTemplates.length > 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
        </div>
      </div>
    </div>
  );
};

export default GenerateButton;
