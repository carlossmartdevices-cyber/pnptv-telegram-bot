# Heroku Environment Variables Setup Script (PowerShell)
# Run this after creating your Heroku app: heroku create your-app-name

Write-Host "Setting up Heroku environment variables for PNPtv Bot..." -ForegroundColor Green
Write-Host ""

# Replace with your actual Heroku app name
$APP_NAME = "your-pnptv-bot"

Write-Host "Using Heroku app: $APP_NAME" -ForegroundColor Yellow
Write-Host ""

# Telegram Configuration
heroku config:set TELEGRAM_BOT_TOKEN="8499797477:AAENAxfDXTwoKw2aaDOjA--ANmCOtP2haFQ" --app $APP_NAME
heroku config:set CHANNEL_ID="-1002997324714" --app $APP_NAME
heroku config:set ADMIN_IDS="8365312597" --app $APP_NAME

# Firebase Configuration
heroku config:set FIREBASE_PROJECT_ID="pnptv-b8af8" --app $APP_NAME
heroku config:set FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com" --app $APP_NAME
heroku config:set FIREBASE_STORAGE_BUCKET="pnptv-b8af8.appspot.com" --app $APP_NAME

# Firebase Private Key (with escaped newlines)
$FIREBASE_KEY = @"
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCo/FttNjfP+VbA
1OF9AYo/koRHRw5VEV4M0+e8nr6CIBmCCgxJZXVjiIVt8UNsPJ2mlsOLhj+v5zzm
Il3Lxr21cmL0BFbBBD1pXF+6lTPADxW/0+kj3C5s7ZDAXDsFndeQT/70Y3gS+O4n
tkmkRgtXbPLKNEg6Ij6BaytiYw37anpIGGuqueU4+ImTzNdzTFqeP6B4yR0thrK6
NCp51+kBY0Y8nUdCzaDODbFLYN+vh2wKTFQ6/i295hy0rhejnvBU7/jXc5r44wpP
A9e8Q5bc7qa8TxjMM+dCUzrW9ghHpWFVeEEKXydjrSpnyrGlmtueITrTMqVQLKjc
GYvpUl71AgMBAAECggEABXc+0HfyCGy83PIUAtQylv7sqbmK3j7cAelShcThI0TL
at2UVe/bu/GM8toVWGzlfy2zbQrHQXbYm2uos6yk3cXODuYNB2qOIthKtpoKoHhc
cGX329qhxq2Fyb2x9pWnvb04qFhOaGXNSOFS+cpiM/kMKVhjkh+Tp1OJoiVFLPN7
C3C75EMuEoIzGSqFhk1x61gSmqHc3sMXgdZfJDHyA/usylci1hjz0rBr9C47lwjc
0+/FtVB5lPNxjZlrIAKRlZMpqb9yndJvRYL4XRjSuYDViinoNApyXDbIEnrk807c
lqSivnR8hDTRA7G4qSRR3q9l6QjfeBy+PCKwcQpCyQKBgQDUKbfLW/m0pRU5pjW0
ZzNSNnUYnflxHc28kIT7nXHOl8ds4Sh2d2T4wWDWa/FmGF4qBcP34aMDXve/22B6
tAuF/O/aTgNl2srnY3yEviZsYDAG6xkEQ8Xw+tsAjVzwcNL2GMX1CI0k14Wo7r3/
VDdlsqDuXw+VgAKlCvGjRYFsTwKBgQDL5swpuliH6qxlqYzh1zgAxNYvLhWW5FTT
ibjw4Qtr89uTEZv2kQld/sw0JB260BT1b2gJuGQukrXc+lRsNv/wuiJm4yez/BJs
Fa//YvxdmXyjzYVW/PVqItVKlhn6/dbOTJ/F0tdCk+/ppZdLbV5foYu2iuF9x8Pp
P9rllhkbewKBgQC5ihY6mJ/CM9BhDxLORqYiEo/KzHRVUQwYCIbTiHf7hM6ZUDrT
h0xdIrguLE36y/qlY09i2wd1LjsZpJ82D3g4X9/eGPVtwK5LNryxVZ1Cj8fQdQ72
pNJZEPgu/nE1sGU9ZKLRy/2rJ3OzLb4oqZycql+EtstpIX6umOiCsYkijwKBgCeQ
0HskYrt1CSDtBp5oMcDMcTdUfPH7uo4VwmJTePDor+nY1+e/ew7XO26+t1ohuH9r
r8d7FU2IQGvx02HwRjfDFpvaZkDhn/2DM9Sds5TCDNKINeCMU17WBYdkmwP+L6l2
auZrJEQSCtLOxA3p2g86fK7eQiUzF0vyjRpRxutzAoGBALXU3TG5WV9gRokJbTdg
bf5Acf7SH9WGSD/igHZ2Pi4XeC1SQhyn/0axQSqqhUtfOam1sIWGimccUD/8vbV/
rAv01Y6QbjUl57ZwWltzTZezjjygQ0M0KnDNHfwma6+e8sOwHVP+g1QibQgQsSes
Tm95cVqOGdNZHYX8PVUS6ekB
-----END PRIVATE KEY-----
"@

$FIREBASE_KEY_ESCAPED = $FIREBASE_KEY -replace "`n", "\n"
heroku config:set FIREBASE_PRIVATE_KEY="$FIREBASE_KEY_ESCAPED" --app $APP_NAME

# ePayco Configuration
heroku config:set EPAYCO_PUBLIC_KEY="881ddf8418549218fe2f227458f2f59c" --app $APP_NAME
heroku config:set EPAYCO_PRIVATE_KEY="80174d93a6f8d760f5cca2b2cc6ee48b" --app $APP_NAME
heroku config:set EPAYCO_CUSTOMER_ID="1555482" --app $APP_NAME
heroku config:set EPAYCO_TEST="false" --app $APP_NAME

# IMPORTANT: Update these URLs with your actual Heroku app URL
$HEROKU_URL = "https://$APP_NAME.herokuapp.com"

heroku config:set WEBAPP_URL="$HEROKU_URL" --app $APP_NAME
heroku config:set RESPONSE_URL="$HEROKU_URL/epayco/response" --app $APP_NAME
heroku config:set CONFIRMATION_URL="$HEROKU_URL/epayco/confirmation" --app $APP_NAME

# Environment
heroku config:set NODE_ENV="production" --app $APP_NAME

Write-Host ""
Write-Host "✅ Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify config: heroku config --app $APP_NAME"
Write-Host "2. Deploy: git push heroku main"
Write-Host "3. Scale dyno: heroku ps:scale web=1 --app $APP_NAME"
Write-Host "4. Check logs: heroku logs --tail --app $APP_NAME"
