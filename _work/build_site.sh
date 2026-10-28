#!/bin/bash
# يبني المتجر لمكانه في مستودع أثر (ATHR/huroof) ويجمّع المجلد النهائي في build-athr/huroof
set -e
SITE="${1:-https://a3r-om.github.io/ATHR/huroof/}"
cd /home/claude
rm -rf build-athr/site build-athr/huroof && mkdir -p build-athr/site
cd /home/claude/huroof && node tools/build.mjs --data /home/claude/gen/seed.json --site "$SITE" --out /home/claude/build-athr/site ${ALLOW_EMPTY:+--allow-empty} 2>&1 | grep -E "✓|الرئيسية|خطأ|Error" || true
cd /home/claude/build-athr && mkdir huroof
cp -r /home/claude/huroof/admin.html /home/claude/huroof/css /home/claude/huroof/js /home/claude/huroof/images /home/claude/huroof/fonts huroof/
rm -rf huroof/images/stories/space  # رسومات الخطة المجانية (ممنوع بيعها) لا تُنشر أبداً
(cd site && for x in 404.html c cart checkout done fav gift index.html p points review search shipping; do [ -e "$x" ] && cp -r "$x" ../huroof/; done; cp js/* ../huroof/js/)
# نسخة للاختبار المحلي على المنفذ 8813
rm -rf /home/claude/localsite && mkdir -p /home/claude/localsite/ATHR && cp -r /home/claude/build-athr/huroof /home/claude/localsite/ATHR/huroof
echo "built: $(du -sh huroof | cut -f1)"
