#!/bin/bash
# Font subsetting script
# Generates two files for each font:
#   - <font>-subset.woff2  = exact characters used across the site + ASCII (~100KB, loaded on first paint)
#   - <font>.woff2         = GB2312 level-1 common characters + ASCII (~1.5MB, filled in in the background)
#
# Usage:
#   pnpm fonts:subset (run from the framework repo root; takes characters from the content of the starter/ demo site and writes to the framework's own src/fonts/)
#
# Adding a new font:
#   1. Put the .ttf file in scripts/fonts-source/
#   2. Run bash scripts/subset-fonts.sh
#   3. Register the new font in src/data/config/fonts.ts

set -e

FONTS_SOURCE="scripts/fonts-source"
FONTS_OUTPUT="src/fonts"
SUBSET_CHARS="/tmp/font_subset_chars.txt"
FULL_CHARS="/tmp/font_full_chars.txt"

echo "=== 字体子集化 ==="
echo ""

# Check dependencies
if ! python3 -c "import fontTools" 2>/dev/null; then
    echo "错误: 缺少 fontTools，请先安装:"
    echo "  pip3 install fonttools brotli"
    exit 1
fi

if ! python3 -c "import brotli" 2>/dev/null; then
    echo "错误: 缺少 brotli，请先安装:"
    echo "  pip3 install brotli"
    exit 1
fi

if [ ! -d "$FONTS_SOURCE" ]; then
    echo "错误: 源文件目录不存在: $FONTS_SOURCE"
    exit 1
fi

FONT_COUNT=$(find "$FONTS_SOURCE" -name "*.ttf" | wc -l)
if [ "$FONT_COUNT" -eq 0 ]; then
    echo "错误: $FONTS_SOURCE/ 下没有找到 .ttf 文件"
    exit 1
fi

# Generate the two character sets
echo "[1/2] 生成字符集..."
python3 << 'PYEOF'
import subprocess
import string

def get_gb2312_level1():
    """GB2312 level-1 common characters (3755 characters)"""
    chars = []
    for high in range(0xB0, 0xD8):
        for low in range(0xA1, 0xFF):
            if high == 0xD7 and low > 0xF9:
                break
            try:
                chars.append(bytes([high, low]).decode('gb2312'))
            except:
                pass
    return chars

def get_gb2312_level2():
    """GB2312 level-2 Chinese characters (3008 characters)"""
    chars = []
    for high in range(0xD8, 0xF8):
        for low in range(0xA1, 0xFF):
            try:
                chars.append(bytes([high, low]).decode('gb2312'))
            except:
                pass
    return chars

# Characters used across the site (all characters)
result = subprocess.run(
    ['grep', '-orh', '.', 'starter/src/content/', 'starter/public/'],
    capture_output=True, text=True
)
site_chars = set()
for c in result.stdout:
    code = ord(c)
    if 0x20 <= code <= 0x10FFFF and code not in (0x0A, 0x0D, 0x09):
        site_chars.add(c)

# ASCII
ascii_chars = set(string.ascii_letters + string.digits + string.punctuation + string.whitespace)

# GB2312 level 1
level1 = set(get_gb2312_level1())

# Subset character set = characters used across the site + ASCII
subset_chars = site_chars | ascii_chars

# Full character set = subset + GB2312 level 1
full_chars = subset_chars | level1

# Print stats
subset_han = len([c for c in subset_chars if '\u4e00' <= c <= '\u9fff'])
full_han = len([c for c in full_chars if '\u4e00' <= c <= '\u9fff'])

print(f'  全站用字:     {subset_han} 汉字')
print(f'  ASCII字符:    {len(subset_chars & ascii_chars)}')
print(f'  子集总计:     {len(subset_chars)}')
print(f'  完整总计:     {len(full_chars)}（含 GB2312 一级 {len(level1)} 字）')

with open('/tmp/font_subset_chars.txt', 'w', encoding='utf-8') as f:
    f.write(''.join(sorted(subset_chars)))

with open('/tmp/font_full_chars.txt', 'w', encoding='utf-8') as f:
    f.write(''.join(sorted(full_chars)))
PYEOF

# Subset the fonts
echo ""
echo "[2/2] 子集化字体..."

mkdir -p "$FONTS_OUTPUT"

for font in "$FONTS_SOURCE"/*.ttf; do
    [ -f "$font" ] || continue

    filename=$(basename "$font" .ttf)
    subset_output="$FONTS_OUTPUT/${filename}-subset.woff2"
    full_output="$FONTS_OUTPUT/${filename}.woff2"

    echo "  $filename.ttf"

    # Subset file (characters used across the site + ASCII)
    echo "    → ${filename}-subset.woff2"
    python3 -m fontTools.subset "$font" \
        --text-file="$SUBSET_CHARS" \
        --output-file="$subset_output" \
        --flavor=woff2 \
        --layout-features='*' \
        --glyph-names \
        --symbol-cmap \
        --legacy-cmap \
        --notdef-glyph \
        --notdef-outline \
        --recommended-glyphs \
        --name-IDs='*' \
        2>/dev/null

    # Full file (GB2312 level 1 + ASCII)
    echo "    → ${filename}.woff2"
    python3 -m fontTools.subset "$font" \
        --text-file="$FULL_CHARS" \
        --output-file="$full_output" \
        --flavor=woff2 \
        --layout-features='*' \
        --glyph-names \
        --symbol-cmap \
        --legacy-cmap \
        --notdef-glyph \
        --notdef-outline \
        --recommended-glyphs \
        --name-IDs='*' \
        2>/dev/null

    subset_size=$(du -h "$subset_output" | cut -f1 | tr -d ' ')
    full_size=$(du -h "$full_output" | cut -f1 | tr -d ' ')
    echo "      subset: $subset_size | full: $full_size"
done

echo ""
echo "=== 完成 ==="
echo "输出目录: $FONTS_OUTPUT/"
ls -lh "$FONTS_OUTPUT"/
echo ""
echo "使用说明:"
echo "  1. 在 src/data/config/fonts.ts 中注册字体（如未注册）"
echo "  2. 构建后 subset 文件会自动 preload，full 文件后台加载"
