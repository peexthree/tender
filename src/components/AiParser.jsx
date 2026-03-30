import React, { useState } from 'react';
import { Cpu, Key, FileText, Loader2 } from 'lucide-react';
import useStore from '../store/useStore';

const AiParser = () => {
  const [apiKey, setApiKey] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addLog, addJsonFile } = useStore();

  const handleGenerate = async () => {
    if (!apiKey) {
      addLog('[ERROR] Не указан API ключ Gemini', 'error');
      return;
    }
    if (!rawText.trim()) {
      addLog('[ERROR] Текст ТКП пуст', 'error');
      return;
    }

    setIsLoading(true);
    addLog('[AI] Анализ ТКП запущен...', 'info');

    try {
      const prompt = `Извлеки данные из текста тендера. Верни строго валидный JSON без маркдауна. Структура должна содержать: purchase_number, subject, bid_deadline, offer_validity_days, customer (full_name, legal_address, email, inn, kpp, ogrn).\n\nТекст ТКП:\n${rawText}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      let jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Очистка от маркдауна, если модель его все-таки вернула
      jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedData = JSON.parse(jsonString);

      // Создаем File объект для совместимости с нашим стором
      const fileBlob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
      const file = new File([fileBlob], 'tender.json', { type: 'application/json' });

      addJsonFile(file);
      addLog('[AI] JSON успешно сформирован и добавлен как tender.json', 'success');

      // Очищаем форму
      setRawText('');

    } catch (error) {
      addLog(`[AI ERROR] Ошибка генерации: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.1)] pb-3">
        <Cpu className="w-6 h-6 text-[var(--color-brand)]" />
        <h2 className="text-lg font-bold uppercase tracking-wider text-slate-200">AI Распознавание</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="password"
            placeholder="Gemini API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full glass-input py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="relative flex-1">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            placeholder="Вставьте сырой текст ТКП от заказчика..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full h-40 glass-input py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 resize-none terminal-scrollbar"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="glitch-btn w-full py-3 bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Cpu className="w-5 h-5" />
          )}
          {isLoading ? 'Генерация...' : 'Сгенерировать tender.json'}
        </button>
      </div>
    </div>
  );
};

export default AiParser;
