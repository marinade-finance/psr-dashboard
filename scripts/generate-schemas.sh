#!/usr/bin/env bash
set -e

SPEC_DIR="src/schemas/openapi"
OUT_DIR="src/schemas/generated"

mkdir -p "$SPEC_DIR" "$OUT_DIR"

fetch() {
  local name=$1 url=$2
  echo "Fetching $name..."
  curl -sf "$url" -o "$SPEC_DIR/$name.json"
}

fetch "validators"    "https://validators-api.marinade.finance/docs.json"
fetch "bonds"         "https://validator-bonds-api.marinade.finance/docs.json"
fetch "scoring"       "https://scoring.marinade.finance/docs.json"
fetch "notifications" "https://marinade-notifications.marinade.finance/docs-json"

# notifications uses inline $defs (JSON Schema 2020-12); hoist to components/schemas
# so openapi-zod-client's ref parser can resolve them
python3 - << 'PYEOF'
import json, re

text = open('src/schemas/openapi/notifications.json').read()
d = json.loads(text)

def hoist_defs(obj, schemas):
    if isinstance(obj, dict):
        if '$defs' in obj:
            for name, schema in obj.pop('$defs').items():
                schemas[name] = hoist_defs(schema, schemas)
        return {k: hoist_defs(v, schemas) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [hoist_defs(i, schemas) for i in obj]
    return obj

schemas = d.setdefault('components', {}).setdefault('schemas', {})
d = hoist_defs(d, schemas)
d['components']['schemas'] = schemas
text = re.sub(r'"#/\$defs/([^"]+)"', r'"#/components/schemas/\1"', json.dumps(d, indent=2))
open('src/schemas/openapi/notifications.json', 'w').write(text)
PYEOF

generate() {
  local name=$1
  echo "Generating $name..."
  npx openapi-zod-client "$SPEC_DIR/$name.json" -o "$OUT_DIR/$name.ts"
}

generate "validators"
generate "bonds"
generate "scoring"
generate "notifications"

echo "Done. Schemas in $OUT_DIR/"
