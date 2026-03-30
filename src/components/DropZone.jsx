import React, { useState, useCallback } from 'react';
import { UploadCloud, FileJson, FileText, X } from 'lucide-react';
import useStore from '../store/useStore';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const DropZone = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const { addJsonFile, addDocxTemplate, addLog, jsonFiles, docxTemplates, removeFile } = useStore();

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback((files) => {
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'json') {
        // Проверка на дубликаты
        if (jsonFiles.some(f => f.name === file.name)) {
           addLog(`[WARNING] Файл ${file.name} уже загружен`, 'warning');
           return;
        }
        addJsonFile(file);
        addLog(`[ОК] JSON-файл добавлен: ${file.name}`, 'success');
      } else if (ext === 'docx') {
        if (docxTemplates.some(f => f.name === file.name)) {
           addLog(`[WARNING] Шаблон ${file.name} уже загружен`, 'warning');
           return;
        }
        addDocxTemplate(file);
        addLog(`[ОК] DOCX-шаблон добавлен: ${file.name}`, 'success');
      } else {
        addLog(`[ERROR] Неподдерживаемый формат файла: ${file.name}`, 'error');
      }
    });
  }, [addJsonFile, addDocxTemplate, addLog, jsonFiles, docxTemplates]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div
        className={twMerge(
          clsx(
            "relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden cursor-pointer",
            isDragActive
              ? "border-[var(--color-brand)] bg-[rgba(234,88,12,0.1)] shadow-[0_0_15px_rgba(234,88,12,0.3)]"
              : "border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(255,255,255,0.4)]"
          )
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".json,.docx"
          className="hidden"
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <UploadCloud className={clsx("w-12 h-12 transition-colors", isDragActive ? "text-[var(--color-brand)]" : "text-slate-400")} />
          <div className="text-center">
            <p className="text-lg font-medium text-slate-200">Перетащите файлы сюда</p>
            <p className="text-sm text-slate-400 mt-1">Поддерживаются .json и .docx</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Панель JSON */}
        <div className="glass-panel p-4 flex flex-col h-48">
          <div className="flex items-center gap-2 mb-3 border-b border-[rgba(255,255,255,0.1)] pb-2">
            <FileJson className="w-5 h-5 text-[var(--color-brand)]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Данные (JSON)</h3>
            <span className="ml-auto bg-[rgba(255,255,255,0.1)] text-xs px-2 py-1 rounded-full">{jsonFiles.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto terminal-scrollbar space-y-2">
            {jsonFiles.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center mt-4">Нет загруженных файлов</p>
            ) : (
              jsonFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[rgba(0,0,0,0.3)] p-2 rounded border border-[rgba(255,255,255,0.05)] group">
                  <span className="text-xs truncate max-w-[80%] text-slate-300 group-hover:text-white transition-colors">{file.name}</span>
                  <button onClick={() => removeFile(file.name, 'json')} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Панель DOCX */}
        <div className="glass-panel p-4 flex flex-col h-48">
          <div className="flex items-center gap-2 mb-3 border-b border-[rgba(255,255,255,0.1)] pb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Шаблоны (DOCX)</h3>
            <span className="ml-auto bg-[rgba(255,255,255,0.1)] text-xs px-2 py-1 rounded-full">{docxTemplates.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto terminal-scrollbar space-y-2">
            {docxTemplates.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center mt-4">Нет загруженных шаблонов</p>
            ) : (
              docxTemplates.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[rgba(0,0,0,0.3)] p-2 rounded border border-[rgba(255,255,255,0.05)] group">
                  <span className="text-xs truncate max-w-[80%] text-slate-300 group-hover:text-white transition-colors">{file.name}</span>
                  <button onClick={() => removeFile(file.name, 'docx')} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropZone;
