#!/bin/sh
set -eu

name="$1"
request="store-assets/grok/${name}.json"
response="$(mktemp -t "latchmx-grok-${name}.XXXXXX")"
image="store-assets/grok/output/${name}.png"

cleanup() {
  find "${response}" -type f -delete
}
trap cleanup EXIT

mkdir -p store-assets/grok/output
curl -fsS https://api.x.ai/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GROK_API_KEY" \
  --data-binary "@${request}" \
  -o "${response}"

url="$(jq -r '.data[0].url // empty' "${response}")"
if [ -z "${url}" ]; then
  jq '{error, errors}' "${response}"
  exit 1
fi

curl -fsSL "${url}" -o "${image}"
file "${image}"
