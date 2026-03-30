import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import useStore from '../store/useStore';

/**
 * Читает содержимое JSON файла как текст
 */
const readJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        resolve(json);
      } catch {
        reject(new Error(`Ошибка парсинга JSON в файле ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Ошибка чтения файла ${file.name}`));
    reader.readAsText(file);
  });
};

/**
 * Читает содержимое DOCX файла как ArrayBuffer
 */
const readDocxFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Ошибка чтения файла ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Извлекает значение из данных по пути (например, "customer.full_name")
 */
const getValueFromPath = (data, path) => {
  if (!path) return '';
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, data);
};

/**
 * Строит объект контекста для конкретного шаблона на основе mapping.json
 */
const buildContextForTemplate = (templateMapping, globalData) => {
  const context = {};

  if (!templateMapping) return context;

  for (const [docTag, dataPath] of Object.entries(templateMapping)) {
    // Особая обработка массивов (например items)
    if (typeof dataPath === 'string' && dataPath.startsWith('ARRAY:')) {
      const arrayPath = dataPath.replace('ARRAY:', '');
      const arrayData = getValueFromPath(globalData, arrayPath);

      if (Array.isArray(arrayData)) {
        context[docTag] = arrayData;
      } else {
        context[docTag] = [];
        useStore.getState().addLog(`[WARNING] Массив по пути ${arrayPath} не найден`, 'warning');
      }
    } else if (typeof dataPath === 'object') {
       // Если маппинг вложенный, просто берем как есть или пытаемся разрезолвить каждый ключ
       // В простом варианте - мы просто берем данные из globalData по ключам
       context[docTag] = getValueFromPath(globalData, docTag) || '';
    } else {
      context[docTag] = getValueFromPath(globalData, dataPath) || '';
    }
  }

  // На случай, если в самом mapping не указаны переменные массива явно (добавляем массивы из globalData напрямую)
  // Это позволит конструкции {#items} {name} {/items} работать "из коробки" если items есть в глобальных данных
  for (const [key, value] of Object.entries(globalData)) {
    if (Array.isArray(value)) {
       if(!context[key]) {
           context[key] = value;
       }
    }
  }

  return context;
};

/**
 * Главная функция генерации архива документов
 */
export const generateDocuments = async () => {
  const store = useStore.getState();
  const { jsonFiles, docxTemplates, addLog } = store;

  addLog('[START] Инициализация процесса генерации...', 'info');

  if (docxTemplates.length === 0) {
    addLog('[ERROR] Шаблоны DOCX не загружены', 'error');
    return;
  }

  // 1. Поиск mapping.json
  const mappingFile = jsonFiles.find(f => f.name.toLowerCase() === 'mapping.json');
  if (!mappingFile) {
    addLog('[ERROR] Файл mapping.json не найден среди загруженных данных', 'error');
    return;
  }

  addLog('[ОК] Файл mapping.json найден', 'success');

  try {
    // 2. Парсинг mapping.json
    const mappingData = await readJsonFile(mappingFile);

    // 3. Агрегация всех остальных JSON в единый contextData
    const dataFiles = jsonFiles.filter(f => f.name.toLowerCase() !== 'mapping.json');
    let globalContextData = {};

    for (const file of dataFiles) {
      const data = await readJsonFile(file);
      // Если файл tender.json - сохраняем его содержимое в свойство tender, иначе мержим в корень
      const fileBaseName = file.name.replace('.json', '');

      // Положим данные и в корень (для прямого доступа) и под именем файла
      globalContextData = {
        ...globalContextData,
        ...data,
        [fileBaseName]: data
      };
      addLog(`[ОК] Данные из ${file.name} добавлены в контекст`, 'info');
    }

    // 4. Инициализация итогового ZIP архива
    const outputZip = new JSZip();
    let generatedCount = 0;

    // 5. Обход шаблонов
    for (const templateFile of docxTemplates) {
      addLog(`[PROCESS] Обработка шаблона: ${templateFile.name}`, 'info');

      // Ищем маппинг для данного шаблона. Имя ключа в маппинге должно совпадать с именем файла
      // или берем 'default' если есть
      const templateConfig = mappingData[templateFile.name] || mappingData['default'] || {};

      const templateContext = buildContextForTemplate(templateConfig, globalContextData);

      try {
        const content = await readDocxFile(templateFile);
        const zip = new PizZip(content);

        // Настройка docxtemplater
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Рендер
        doc.render(templateContext);

        // Получаем готовый буфер документа
        const generatedBuffer = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // Добавляем в общий архив с префиксом
        const outputName = `Generated_${templateFile.name}`;
        outputZip.file(outputName, generatedBuffer);

        addLog(`[ОК] Документ ${outputName} успешно сгенерирован`, 'success');
        generatedCount++;
      } catch (error) {
        addLog(`[ERROR] Ошибка генерации ${templateFile.name}: ${error.message}`, 'error');
        // В случае ошибки с тегами docxtemplater
        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors.map(e => e.properties.explanation).join(", ");
          addLog(`[ERROR DETAILS] ${errorMessages}`, 'error');
        }
      }
    }

    // 6. Скачивание итогового архива
    if (generatedCount > 0) {
      addLog('[PROCESS] Упаковка готовых документов в ZIP-архив...', 'info');
      const finalArchive = await outputZip.generateAsync({ type: 'blob' });
      saveAs(finalArchive, 'Tender_Documents.zip');
      addLog('[ОК] Архив успешно скачан!', 'success');
    } else {
      addLog('[WARNING] Не удалось сгенерировать ни одного документа', 'warning');
    }

  } catch (error) {
    addLog(`[CRITICAL] Ошибка выполнения: ${error.message}`, 'error');
    console.error(error);
  }
};
