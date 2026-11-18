#!/bin/sh
# Aynı imaj Docker ve Railway'de çalışır; sırlar şablona aktarılmaz.
set -eu

: "${API_UPSTREAM:=api:8000}"
case "$API_UPSTREAM" in
    ''|*[!a-zA-Z0-9.:-]*) echo 'Geçersiz API_UPSTREAM' >&2; exit 1 ;;
esac
DNS_RESOLVER=$(awk '/^nameserver / {print $2; exit}' /etc/resolv.conf)
case "$DNS_RESOLVER" in
    *:*) DNS_RESOLVER="[$DNS_RESOLVER]" ;;
esac
export API_UPSTREAM DNS_RESOLVER
# Nginx'in $host, $uri gibi kendi değişkenleri aynen korunur.
envsubst '${API_UPSTREAM} ${DNS_RESOLVER}' \
    < /etc/nginx/terapist.conf.template > /tmp/terapist-nginx.conf
exec nginx -g 'daemon off;'
