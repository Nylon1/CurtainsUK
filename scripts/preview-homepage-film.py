import html
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
theme = root / 'shopify-theme/curtainsuk-dawn-16'
out = root / 'artifacts/homepage-film'
out.mkdir(parents=True, exist_ok=True)
locale = (theme / 'locales/en.default.json').read_text(encoding='utf-8')
translations = json.loads(locale[locale.index('{'):])
source = (theme / 'snippets/curtainsuk-fabric-film.liquid').read_text(encoding='utf-8')
video_url = re.search("assign film_url = '([^']+)'", source).group(1)
source = re.sub(r'{% doc %}.*?{% enddoc %}', '', source, flags=re.S)
source = re.sub(r'{% liquid.*?%}', '', source, flags=re.S)
loop = re.search(r'{% for chapter in chapter_keys %}(.*?){% endfor %}', source, re.S)
chapters = [('filters',4.5,'0:04'),('closer',28.5,'0:28'),('details',41.2,'0:41'),('samples',55.7,'0:55'),('jane',60.2,'1:00'),('pricing',64.2,'1:04')]
items=[]
for key,sec,time in chapters:
    item=loop.group(1).replace('{{ image_name | asset_url }}', f'/assets/cuk-film-{key}.webp')
    item=item.replace('{{ title_key | t }}', html.escape(translations['fabric_film']['chapters'][key]))
    item=item.replace('{{ chapter_seconds[forloop.index0] }}',str(sec)).replace('{{ chapter_times[forloop.index0] }}',time)
    items.append(item)
source=source[:loop.start()]+''.join(items)+source[loop.end():]
def translate(match):
    value=translations
    for key in match.group(1).split('.'): value=value[key]
    return html.escape(value)
source=re.sub(r"{{ '([^']+)' \| t(?: \| escape)? }}", translate, source)
source=re.sub(r"{{ '([^']+)' \| asset_url \| stylesheet_tag }}",r'<link rel="stylesheet" href="/assets/\1">',source)
source=re.sub(r"{{ '([^']+)' \| asset_url }}",r'/assets/\1',source)
source=source.replace('{{ film_url }}',video_url).replace('{{ section_id }}','preview')
assert '{{' not in source and '{%' not in source
(out/'player.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CurtainsUK interactive fabric guide</title><link rel="stylesheet" href="/assets/curtainsuk-home-features.css"><style>body{margin:0;background:#f8f6ef}main{max-width:1420px;padding:20px;margin:auto}</style><main class="cukfeature">'+source+'</main></html>',encoding='utf-8')
print('Preview rendered from the theme snippet.')
