"""Import supplied Figure 3.3 runtime tables and pure Apps Script engine.

Usage: python scripts/import-subgrade-model.py <package-directory>
No Excel recalculation or Google Sheets connection is required.
"""
import json
import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

source = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
target = root / 'src/components/subgrade-reaction'
target.mkdir(parents=True, exist_ok=True)
ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source / 'AASHTO93_Figure3_3_Google_Sheets_App_v1.1.0.xlsx') as archive:
    strings = []
    if 'xl/sharedStrings.xml' in archive.namelist():
        strings = [''.join(n.itertext()) for n in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('x:si', ns)]
    relationships = {n.attrib['Id']: n.attrib['Target'] for n in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
    tables = {}
    names = ['01_METADATA', '02_VARIABLES', '03_SCALE_DEFINITIONS', '05_OPERATIONS', '06_INTERPOLATION_RULES', '09_GOLDEN_TESTS']
    for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('x:sheets/x:sheet', ns):
        name = sheet.attrib['name']
        if name not in names:
            continue
        rel = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        part = relationships[rel]
        part = part.lstrip('/') if part.startswith('/') else 'xl/' + part
        rows = []
        for row in ET.fromstring(archive.read(part)).findall('x:sheetData/x:row', ns):
            values = {}
            for cell in row.findall('x:c', ns):
                col = re.match('[A-Z]+', cell.attrib['r']).group()
                value = cell.find('x:v', ns)
                kind = cell.attrib.get('t')
                if kind == 'inlineStr':
                    value = ''.join(cell.find('x:is', ns).itertext())
                elif value is None:
                    value = ''
                elif kind == 's':
                    value = strings[int(value.text)]
                elif kind == 'b':
                    value = value.text == '1'
                elif kind in ('str', 'e'):
                    value = value.text
                else:
                    value = float(value.text)
                values[col] = value
            rows.append(values)
        headers = rows[0]
        tables[name] = [{str(label).strip(): row.get(col, '') for col, label in headers.items() if label != ''} for row in rows[1:] if any(v != '' for v in row.values())]
    golden = tables.pop('09_GOLDEN_TESTS')
    (root / 'scripts/subgrade-golden-tests.json').write_text(json.dumps(golden, indent=2), encoding='utf-8')
    (target / 'model-data.js').write_text('// Exact runtime tables extracted from the supplied workbook.\n' + 'globalThis.SubgradeModelTables = ' + json.dumps(tables, indent=2) + ';\n', encoding='utf-8')

code = (source / 'Apps_Script_Project/Code.gs').read_text(encoding='utf-8')
config = code[code.index('const APP_CONFIG'):code.index('let RUNTIME_MODEL_CACHE_')]
config = re.sub(r"  (DEFAULT_SPREADSHEET_ID|SPREADSHEET_ID_PROPERTY):[^\n]+\n", '', config)
pure = code[code.index('function calculateNomographWithModel_'):code.index('function loadNomographModel(')]
pure += code[code.index('function buildModelFromTables_'):code.index('function validateModelPackage(')]
pure += code[code.index('function formatEngineeringResult_'):code.index('function readTableObjects_')]
exports = """
const t = globalThis.SubgradeModelTables;
const model = buildModelFromTables_(t['01_METADATA'], t['02_VARIABLES'], t['03_SCALE_DEFINITIONS'], t['05_OPERATIONS'], t['06_INTERPOLATION_RULES']);
globalThis.SubgradeCalculation = Object.freeze({
  model,
  calculate: inputs => calculateNomographWithModel_(inputs, model)
});
})();
"""
(target / 'engine.js').write_text('// Ported without changing the supplied Figure 3.3 calculation functions.\n(() => {\n' + config + pure + exports, encoding='utf-8')
shutil.copyfile(source / 'Apps_Script_Project/Figure_3_3_Clean_Display.png', target / 'figure-3-3.png')
print({name: len(rows) for name, rows in tables.items()}, 'Golden cases:', len(golden))
