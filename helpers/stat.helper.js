import fs from 'fs'
import path from 'path'

export function writeOrUpdateStatsToFile(data) {
  const now = new Date();
  const relativePath = `./${[
  String(now.getMonth() + 1).padStart(2, '0'),  // місяці з 0, тому +1
  String(now.getDate()).padStart(2, '0')
].join('-')}-stats.csv`
  const dirname = path.resolve();
  if (typeof data !== 'object' || data === null) {
    throw new Error('Data must be a non-null object.');
  }

  const keys = Object.keys(data);
  const values = Object.values(data);

  let csvContent = '';
  let updated = false;

  // Проверяем, существует ли файл
  if (fs.existsSync(path.join(dirname, relativePath))) {
    const fileContent = fs.readFileSync(path.join(dirname, relativePath), 'utf8');
    const fileLines = fileContent.split('\n');
    const headers = fileLines[0].split(',');

    // Проверка на совпадение заголовков
    if (headers.join(',') !== keys.join(',')) {
      throw new Error('New data headers do not match the existing file headers.');
    }

    // Обрабатываем существующие строки и ищем запись для обновления
    csvContent = fileLines.map((line, index) => {
      if (index === 0) return line; // Заголовок
      const lineValues = line.split(',');

      if (lineValues[4] === data.wallet) {
        updated = true;
        return values.join(','); // Обновляем строку
      }
      return line;
    }).join('\n');

    if (!updated) {
      csvContent += `\n${values.join(',')}`; // Добавляем новую строку, если не было обновления
    }
  } else {
    // Создаем файл с заголовками и данными
    csvContent = `${keys.join(',')}\n${values.join(',')}`;
  }

  fs.writeFileSync(path.join(dirname, relativePath), csvContent, 'utf8');
}

export function writeOrUpdateStatsToFileGlobal(data) {
  const relativePath = './stats.csv'
  const dirname = path.resolve();
  if (typeof data !== 'object' || data === null) {
    throw new Error('Data must be a non-null object.');
  }

  const keys = Object.keys(data);
  const values = Object.values(data);

  let csvContent = '';
  let updated = false;

  // Проверяем, существует ли файл
  if (fs.existsSync(path.join(dirname, relativePath))) {
    const fileContent = fs.readFileSync(path.join(dirname, relativePath), 'utf8');
    const fileLines = fileContent.split('\n');
    const headers = fileLines[0].split(',');

    // Проверка на совпадение заголовков
    if (headers.join(',') !== keys.join(',')) {
      throw new Error('New data headers do not match the existing file headers.');
    }

    // Обрабатываем существующие строки и ищем запись для обновления
    csvContent = fileLines.map((line, index) => {
      if (index === 0) return line; // Заголовок
      const lineValues = line.split(',');

      if (lineValues[4] === data.wallet) {
        updated = true;
        return values.join(','); // Обновляем строку
      }
      return line;
    }).join('\n');

    if (!updated) {
      csvContent += `\n${values.join(',')}`; // Добавляем новую строку, если не было обновления
    }
  } else {
    // Создаем файл с заголовками и данными
    csvContent = `${keys.join(',')}\n${values.join(',')}`;
  }

  fs.writeFileSync(path.join(dirname, relativePath), csvContent, 'utf8');
}