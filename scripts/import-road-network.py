"""Import the supplied inventory without altering any CSV cell values."""
import csv, hashlib, json, sys
from pathlib import Path
source=Path(sys.argv[1])
target=Path(__file__).resolve().parent.parent/'src/components/project-details/network-data.json'
with source.open(encoding='utf-8-sig',newline='') as stream:
    reader=csv.reader(stream); columns=next(reader); records=list(reader)
if any(len(row)!=len(columns) for row in records):
    raise ValueError('CSV row width does not match the header')
values=[[] for _ in columns]; lookups=[{} for _ in columns]; rows=[]
for record in records:
    row=[]
    for i,value in enumerate(record):
        if value not in lookups[i]:
            lookups[i][value]=len(values[i]); values[i].append(value)
        row.append(lookups[i][value])
    rows.append(row)
data={'schemaVersion':1,'source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'recordCount':len(rows),'columns':columns,'values':values,'rows':rows}
target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
# Prove the dictionary encoding round-trips every original cell.
assert [[values[i][code] for i,code in enumerate(row)] for row in rows]==records
print(f'{len(rows)} records; {len(columns)} fields; {target.stat().st_size:,} bytes; exact CSV values retained')
