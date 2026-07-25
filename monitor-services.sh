#!/bin/bash

# Watches the two long-running services (Reverb WebSocket + the V2 queue worker) and emails
# the admin the moment either one isn't RUNNING under supervisor — the exact outage that hit
# Reverb silently after a deploy and only got noticed because someone happened to check.
#
# Cron (as root), every 5 minutes: */5 * * * * /var/www/crm-kw/monitor-services.sh
#
# Requires the `mail` command to actually be able to send (mailutils + a working local MTA,
# e.g. postfix in satellite/relay mode). If mail never arrives, that's the first thing to check
# — `echo test | mail -s test you@example.com` should land in your inbox on its own.

ALERT_EMAIL="CHANGE_ME@example.com"
SERVICES=("laravel-reverb" "laravel-worker-v2:laravel-worker-v2_00")
STATE_FILE="/tmp/crm-services-down.state"

down=()

for service in "${SERVICES[@]}"; do
    status=$(supervisorctl status "$service" 2>&1)
    if ! echo "$status" | grep -q "RUNNING"; then
        down+=("$status")
    fi
done

if [ ${#down[@]} -eq 0 ]; then
    # Recovered — clear the "already alerted" flag so the next real outage alerts again.
    rm -f "$STATE_FILE"
    exit 0
fi

# Alert once per outage, not once per 5-minute tick — otherwise a stuck-down service
# floods the inbox every 5 minutes until someone fixes it.
if [ -f "$STATE_FILE" ]; then
    exit 0
fi

touch "$STATE_FILE"

{
    echo "One or more CRM background services are down on $(hostname) at $(date):"
    echo ""
    printf '%s\n' "${down[@]}"
    echo ""
    echo "Reconnect: ssh root@crm.motmaina-center.com"
    echo "Check: supervisorctl status"
} | mail -s "🔴 CRM: خدمة متوقفة على السيرفر" "$ALERT_EMAIL"
