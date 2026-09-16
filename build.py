from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
html = (root / 'src/template.html').read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (root / 'src/styles.css').read_text() + '</style>')
for file in ['core.js', 'app.js']:
    html = html.replace(f'<script src="{file}"></script>', '<script>' + (root / 'src' / file).read_text() + '</script>')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
(root / 'index.html').write_text(html)
(root / '此刻.html').write_text(html)
with zipfile.ZipFile(root / '此刻-本地使用包.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(root / '此刻.html', '此刻/此刻.html')
    z.write(root / '使用说明.md', '此刻/使用说明.md')
print('Built standalone app and local-use ZIP.')
