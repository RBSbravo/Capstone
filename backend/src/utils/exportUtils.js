const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

async function toCSV(data, fields = null) {
  const opts = fields ? { fields } : {};
  const parser = new Parser(opts);
  return parser.parse(data);
}

async function toExcel(data, sheetName = 'Sheet1') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (Array.isArray(data) && data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
    data.forEach(row => worksheet.addRow(row));
  } else if (typeof data === 'object') {
    worksheet.columns = Object.keys(data).map(key => ({ header: key, key }));
    worksheet.addRow(data);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  toCSV,
  toExcel
}; 