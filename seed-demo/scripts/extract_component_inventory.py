# coding: utf-8
"""Read-only extraction of names from an installed OpenAI release and a public runner.
Never imports/evaluates vendor JavaScript. Only derived metadata is written.
"""
import argparse, hashlib, json, plistlib, re, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def extract(app, runner):
    with (app / 'Contents/Resources/app.asar').open('rb') as stream:
        _, header_size, _, string_size = struct.unpack('<4I', stream.read(16))
        tree = json.loads(stream.read(string_size))
        base = 8 + header_size
        assets = tree['files']['webview']['files']['assets']['files']
        native = chart_evidence = None
        for name, entry in assets.items():
            if not name.endswith('.js') or 'offset' not in entry:
                continue
            stream.seek(base + int(entry['offset']))
            content = stream.read(entry['size']).decode('utf-8', errors='replace')
            if 'grid-item' in content and 'data-d-component' in content:
                match = re.search(r'(\w+)=\{(animate:[^{}]+)\},\w+=\{\.\.\.\1,([^{}]+)\}', content)
                if match:
                    keys = lambda raw: [a or b for a,b in re.findall(r'(?:^|,)(?:"([^"]+)"|([a-z][a-z-]*)):', raw)]
                    native = {'base': keys(match[2]), 'extended': keys(match[3]), 'asset': 'webview/assets/'+name, 'sha256': hashlib.sha256(content.encode()).hexdigest()}
            if all(re.search(r'data-d-component["`]?\s*:\s*["`]'+name+r'["`]', content) for name in ['chart','pie-chart']):
                chart_evidence = {'names': ['chart','pie-chart'], 'asset':'webview/assets/'+name, 'sha256':hashlib.sha256(content.encode()).hexdigest()}
    if not native or not chart_evidence:
        raise RuntimeError('No matching registry in this release; do not infer names.')
    source = runner.read_text()
    pos = source.index('LedgerNetWorthWidget')
    start = source.rfind('[', 0, pos)
    end = source.index(']:[]', pos)
    lazy = json.loads(source[start:end+1])
    start = source.index('DIL_COMPONENT_NAMES=Object.freeze([')
    end = source.index(',...o]', start)
    eager = json.loads(source[source.index('[', start):end]+']')
    version = plistlib.load((app/'Contents/Info.plist').open('rb'))
    result = {'checkedAt':'2026-10-22','scope':'versioned snapshots, not a complete official API specification','release':{k:version.get(k) for k in ['CFBundleShortVersionString','CFBundleVersion','CFBundleIdentifier']},'native':native,'charts':chart_evidence,'host':{'eager':eager,'lazy':lazy,'sourceURL':'https://cdn.platform.openai.com/assets/dil/runner-C-vppISG.js','sha256':hashlib.sha256(source.encode()).hexdigest()}}
    (ROOT/'research/registry-evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f"Extracted {len(native['base'])+len(native['extended'])} registry entries, {len(chart_evidence['names'])} chart names, {len(eager)+len(lazy)} host allowlist names.")

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app',type=Path,default=Path('/Applications/ChatGPT.app'))
    parser.add_argument('--runner-file',type=Path,required=True)
    args=parser.parse_args();extract(args.app,args.runner_file)
