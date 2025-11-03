const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '..', 'data', 'EHO_Compliance_Checklist.xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel file parsed successfully!');
console.log(`Found ${data.length} rows in sheet: ${sheetName}`);
console.log('\nColumn names found:');
if (data.length > 0) {
  console.log(Object.keys(data[0]).join(', '));
}

console.log('\nFirst few rows:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

// Write to a JSON file for inspection
const outputPath = path.join(__dirname, '..', 'data', 'compliance_checklist_parsed.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`\nParsed data written to: ${outputPath}`);

