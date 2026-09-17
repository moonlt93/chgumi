"""Create a source-only submission ZIP. Requires Python 3 standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
output = root / 'artifacts' / 'chugumi-mvp.zip'
files = ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts',
         'next.config.ts', 'next.config.mjs', 'postcss.config.mjs',
         'eslint.config.mjs', '.prettierrc.json', '.prettierignore',
         '.editorconfig', '.gitignore', '.env.example', 'README.md', 'AGENTS.md']
directories = ['src', 'public', 'tests', 'scripts', 'docs']
selected = [root / name for name in files if (root / name).is_file()]
for name in directories:
    selected.extend(path for path in (root / name).rglob('*')
                    if path.is_file() and not path.is_symlink()
                    and not any(part.startswith('.') or part == '__pycache__'
                                for part in path.relative_to(root / name).parts))
for name in ['evaluation/cases.json', 'evaluation/README.md']:
    if (root / name).is_file():
        selected.append(root / name)
# Fail rather than include accidentally placed credentials in source directories.
for path in selected:
    if path.name != '.env.example' and (path.name.startswith('.env') or
                                       path.suffix in {'.pem', '.key'} or
                                       path.name in {'auth.json', 'credentials.json'}):
        raise SystemExit('Refusing to package a credential file.')
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(selected):
        archive.write(path, Path('chugumi-mvp') / path.relative_to(root))
print(f'Created {output.relative_to(root)} ({len(selected)} files)')
