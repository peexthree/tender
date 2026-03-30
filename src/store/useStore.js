import { create } from 'zustand';

const useStore = create((set) => ({
  jsonFiles: [],
  docxTemplates: [],
  logs: [],

  addJsonFile: (file) => set((state) => ({
    jsonFiles: [...state.jsonFiles, file]
  })),

  addDocxTemplate: (file) => set((state) => ({
    docxTemplates: [...state.docxTemplates, file]
  })),

  removeFile: (fileName, type) => set((state) => {
    if (type === 'json') {
      return { jsonFiles: state.jsonFiles.filter(f => f.name !== fileName) };
    }
    if (type === 'docx') {
      return { docxTemplates: state.docxTemplates.filter(f => f.name !== fileName) };
    }
    return state;
  }),

  clearFiles: () => set({ jsonFiles: [], docxTemplates: [] }),

  addLog: (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const formattedMessage = `[${timestamp}] ${message}`;
    set((state) => ({
      logs: [...state.logs, { id: Date.now() + Math.random(), text: formattedMessage, type }]
    }));
  },

  clearLogs: () => set({ logs: [] }),
}));

export default useStore;
