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
        resolve(JSON.parse(e.target.result));
      } catch {
        reject(new Error(`Ошибка парсинга JSON: ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Ошибка чтения: ${file.name}`));
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
    reader.onerror = () => reject(new Error(`Ошибка чтения: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Извлекает значение из данных с жесткой защитой от undefined
 */
const getValueFromPath = (data, path) => {
  if (!path) return '';
  const val = path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, data);
  // Блокируем попадание null и undefined в итоговый документ
  return val === undefined || val === null ? '' : val;
};

/**
 * Строит объект контекста для конкретного шаблона на основе конфигурации
 */
const buildContextForTemplate = (templateMapping, globalData) => {
  const context = {};
  if (!templateMapping) return context;

  for (const [docTag, dataPath] of Object.entries(templateMapping)) {
    if (docTag.startsWith('ARRAY:')) {
      const actualTag = docTag.replace('ARRAY:', '');
      const arrayData = getValueFromPath(globalData, dataPath);
      context[actualTag] = Array.isArray(arrayData) ? arrayData : [];
    } else if (typeof dataPath === 'object') {
       context[docTag] = getValueFromPath(globalData, docTag) || '';
    } else {
      context[docTag] = getValueFromPath(globalData, dataPath) || '';
    }
  }

  // Fallback: подхват массивов из корня
  for (const [key, value] of Object.entries(globalData)) {
    if (Array.isArray(value) && !context[key]) {
       context[key] = value;
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

  addLog('[START] Запуск детерминированного генератора...', 'info');

  if (docxTemplates.length === 0) {
    addLog('[ERROR] Шаблоны DOCX не загружены', 'error');
    return;
  }

  const mappingFile = jsonFiles.find(f => f.name.toLowerCase() === 'mapping.json');
  if (!mappingFile) {
    addLog('[ERROR] Отсутствует конфигурация mapping.json', 'error');
    return;
  }

  try {
    const mappingData = await readJsonFile(mappingFile);
    const dataFiles = jsonFiles.filter(f => f.name.toLowerCase() !== 'mapping.json');
    let globalContextData = {};

    for (const file of dataFiles) {
      const data = await readJsonFile(file);
      const fileBaseName = file.name.replace('.json', '');
      globalContextData = { ...globalContextData, ...data, [fileBaseName]: data };
    }

    const outputZip = new JSZip();
    let generatedCount = 0;

    for (const templateFile of docxTemplates) {
      addLog(`[PROCESS] Компиляция: ${templateFile.name}`, 'info');

      // Умный поиск маппинга: проверяем вложенную структуру "docs"
      let templateConfig = {};
      if (mappingData.docs) {
        const docKey = Object.keys(mappingData.docs).find(k => mappingData.docs[k].template_name === templateFile.name);
        if (docKey) {
          templateConfig = mappingData.docs[docKey].fields || {};
          if (mappingData.docs[docKey]['ARRAY:items']) {
             templateConfig['ARRAY:items'] = mappingData.docs[docKey]['ARRAY:items'];
          }
        }
      } else {
        templateConfig = mappingData[templateFile.name] || mappingData['default'] || {};
      }

      const templateContext = buildContextForTemplate(templateConfig, globalContextData);

      try {
        const content = await readDocxFile(templateFile);
        const zip = new PizZip(content);

        // --- XML PREPROCESSOR HACK ---
        const docXmlFile = zip.file("word/document.xml");
        if (docXmlFile) {
          let xml = docXmlFile.asText();
          const trRegex = /<w:tr\b[^>]*>.*?<\/w:tr>/gs;
          let match;
          const targetRows = [];
          
          while ((match = trRegex.exec(xml)) !== null) {
            if (match[0].includes("Наименование продукции")) {
              targetRows.push({ fullMatch: match[0], index: match.index, length: match[0].length });
            }
          }

          if (targetRows.length > 0) {
            let firstRowHtml = targetRows[0].fullMatch;

            // Ювелирная замена текста внутри существующих тегов XML, чтобы избежать двойных скобок
            firstRowHtml = firstRowHtml.replace("1", "[#items][line_no]");
            firstRowHtml = firstRowHtml.replace("Наименование продукции", "quote_name");
            firstRowHtml = firstRowHtml.replace("Ед. изм.", "offer_unit");
            firstRowHtml = firstRowHtml.replace("НМЦ за ед.", "nmc_unit_price");
            firstRowHtml = firstRowHtml.replace("Цена за ед. без НДС", "unit_price_wo_vat");
            firstRowHtml = firstRowHtml.replace("Кол-во", "offer_qty");
            
            // Внимание: оригинальный текст "[Сумма без НДС]". Заменяем только текст внутри,
            // чтобы закрывающая скобка от оригинала стала частью тега [/items]
            firstRowHtml = firstRowHtml.replace("Сумма без НДС", "line_total_wo_vat][/items");

            // Удаляем мусорные клоны строк с конца, чтобы не сбить индексы
            for (let i = targetRows.length - 1; i >= 1; i--) {
              const row = targetRows[i];
              xml = xml.slice(0, row.index) + xml.slice(row.index + row.length);
            }

            // Внедряем пропатченную строку
            xml = xml.replace(targetRows[0].fullMatch, firstRowHtml);
            zip.file("word/document.xml", xml);
            addLog("[XML-HACK] Структура таблицы переписана на лету", "success");
          }
        }
        // --- END XML PREPROCESSOR HACK ---

        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '[', end: ']' },
        });

        doc.render(templateContext);

        const generatedBuffer = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        outputZip.file(`Generated_${templateFile.name}`, generatedBuffer);
        addLog(`[ОК] ${templateFile.name} скомпилирован`, 'success');
        generatedCount++;
      } catch (error) {
        addLog(`[ERROR] Сбой генерации ${templateFile.name}: ${error.message}`, 'error');
        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors.map(e => e.properties.explanation).join(", ");
          addLog(`[ERROR DETAILS] ${errorMessages}`, 'error');
        }
      }
    }

    if (generatedCount > 0) {
      const finalArchive = await outputZip.generateAsync({ type: 'blob' });
      saveAs(finalArchive, 'Tender_Documents.zip');
      addLog('[SUCCESS] Пакет документов сформирован и скачан', 'success');
    }

  } catch (error) {
    addLog(`[CRITICAL] Фатальная ошибка: ${error.message}`, 'error');
  }
};
