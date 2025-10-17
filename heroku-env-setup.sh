#!/bin/bash
# Heroku Environment Variables Setup Script
# Run this after creating your Heroku app: heroku create your-app-name

echo "Setting up Heroku environment variables for PNPtv Bot..."

# Replace YOUR_APP_NAME with your actual Heroku app name
APP_NAME="your-pnptv-bot"

echo "Using Heroku app: $APP_NAME"
echo ""

# Telegram Configuration
heroku config:set TELEGRAM_BOT_TOKEN="8499797477:AAENAxfDXTwoKw2aaDOjA--ANmCOtP2haFQ" --app $APP_NAME
heroku config:set CHANNEL_ID="-1002997324714" --app $APP_NAME
heroku config:set ADMIN_IDS="8365312597" --app $APP_NAME

# Firebase Configuration
heroku config:set FIREBASE_PROJECT_ID="pnptv-b8af8" --app $APP_NAME
heroku config:set FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com" --app $APP_NAME
heroku config:set FIREBASE_STORAGE_BUCKET="pnptv-b8af8.appspot.com" --app $APP_NAME

# Firebase Private Key (with escaped newlines)
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCo/FttNjfP+VbA\n1OF9AYo/koRHRw5VEV4M0+e8nr6CIBmCCgxJZXVjiIVt8UNsPJ2mlsOLhj+v5zzm\nIl3Lxr21cmL0BFbBBD1pXF+6lTPADxW/0+kj3C5s7ZDAXDsFndeQT/70Y3gS+O4n\ntkmkRgtXbPLKNEg6Ij6BaytiYw37anpIGGuqueU4+ImTzNdzTFqeP6B4yR0thrK6\nNCp51+kBY0Y8nUdCzaDODbFLYN+vh2wKTFQ6/i295hy0rhejnvBU7/jXc5r44wpP\nA9e8Q5bc7qa8TxjMM+dCUzrW9ghHpWFVeEEKXydjrSpnyrGlmtueITrTMqVQLKjc\nGYvpUl71AgMBAAECggEABXc+0HfyCGy83PIUAtQylv7sqbmK3j7cAelShcThI0TL\nat2UVe/bu/GM8toVWGzlfy2zbQrHQXbYm2uos6yk3cXODuYNB2qOIthKtpoKoHhc\ncGX329qhxq2Fyb2x9pWnvb04qFhOaGXNSOFS+cpiM/kMKVhjkh+Tp1OJoiVFLPN7\nC3C75EMuEoIzGSqFhk1x61gSmqHc3sMXgdZfJDHyA/usylci1hjz0rBr9C47lwjc\n0+/FtVB5lPNxjZlrIAKRlZMpqb9yndJvRYL4XRjSuYDViinoNApyXDbIEnrk807c\nlqSivnR8hDTRA7G4qSRR3q9l6QjfeBy+PCKwcQpCyQKBgQDUKbfLW/m0pRU5pjW0\nZzNSNnUYnflxHc28kIT7nXHOl8ds4Sh2d2T4wWDWa/FmGF4qBcP34aMDXve/22B6\ntAuF/O/aTgNl2srnY3yEviZsYDAG6xkEQ8Xw+tsAjVzwcNL2GMX1CI0k14Wo7r3/\nVDdlsqDuXw+VgAKlCvGjRYFsTwKBgQDL5swpuliH6qxlqYzh1zgAxNYvLhWW5FTT\nibjw4Qtr89uTEZv2kQld/sw0JB260BT1b2gJuGQukrXc+lRsNv/wuiJm4yez/BJs\nFa//YvxdmXyjzYVW/PVqItVKlhn6/dbOTJ/F0tdCk+/ppZdLbV5foYu2iuF9x8Pp\nP9rllhkbewKBgQC5ihY6mJ/CM9BhDxLORqYiEo/KzHRVUQwYCIbTiHf7hM6ZUDrT\nh0xdIrguLE36y/qlY09i2wd1LjsZpJ82D3g4X9/eGPVtwK5LNryxVZ1Cj8fQdQ72\npNJZEPgu/nE1sGU9ZKLRy/2rJ3OzLb4oqZycql+EtstpIX6umOiCsYkijwKBgCeQ\n0HskYrt1CSDtBp5oMcDMcTdUfPH7uo4VwmJTePDor+nY1+e/ew7XO26+t1ohuH9r\nr8d7FU2IQGvx02HwRjfDFpvaZkDhn/2DM9Sds5TCDNKINeCMU17WBYdkmwP+L6l2\nauZrJEQSCtLOxA3p2g86fK7eQiUzF0vyjRpRxutzAoGBALXU3TG5WV9gRokJbTdg\nbf5Acf7SH9WGSD/igHZ2Pi4XeC1SQhyn/0axQSqqhUtfOam1sIWGimccUD/8vbV/\nrAv01Y6QbjUl57ZwWltzTZezjjygQ0M0KnDNHfwma6+e8sOwHVP+g1QibQgQsSes\nTm95cVqOGdNZHYX8PVUS6ekB\n-----END PRIVATE KEY-----\n" --app $APP_NAME

# ePayco Configuration
heroku config:set EPAYCO_PUBLIC_KEY="881ddf8418549218fe2f227458f2f59c" --app $APP_NAME
heroku config:set EPAYCO_PRIVATE_KEY="80174d93a6f8d760f5cca2b2cc6ee48b" --app $APP_NAME
heroku config:set EPAYCO_CUSTOMER_ID="1555482" --app $APP_NAME
heroku config:set EPAYCO_TEST="false" --app $APP_NAME

# IMPORTANT: Update these URLs with your actual Heroku app URL
# Replace https://your-pnptv-bot.herokuapp.com with your actual URL
HEROKU_URL="https://$APP_NAME.herokuapp.com"

heroku config:set WEBAPP_URL="$HEROKU_URL" --app $APP_NAME
heroku config:set RESPONSE_URL="$HEROKU_URL/epayco/response" --app $APP_NAME
heroku config:set CONFIRMATION_URL="$HEROKU_URL/epayco/confirmation" --app $APP_NAME

# Environment
heroku config:set NODE_ENV="production" --app $APP_NAME

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "Next steps:"
echo "1. Verify config: heroku config --app $APP_NAME"
echo "2. Deploy: git push heroku main"
echo "3. Scale dyno: heroku ps:scale web=1 --app $APP_NAME"
echo "4. Check logs: heroku logs --tail --app $APP_NAME"
