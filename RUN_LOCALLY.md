# 🚀 Run Daimo Pay Locally - Simple Guide

## ✅ Status Check

Both servers are **already running**:

```
✅ Backend API:  http://localhost:8080
✅ Frontend Web: http://localhost:5173
```

---

## 🧪 Test in 3 Easy Ways

### Method 1: Browser (Visual Test) ⭐ EASIEST

**Just open your browser and paste this:**

```
http://localhost:5173/?plan=trial-pass&userId=8365312597
```

**What you'll see:**
- Purple/magenta PNPtv branding
- "Trial Pass - $14.99/week"
- Daimo Pay button
- Feature cards

**Test all plans:**
- Trial Pass: `http://localhost:5173/?plan=trial-pass&userId=test-123`
- PNP Member: `http://localhost:5173/?plan=pnp-member&userId=test-123`
- Crystal Member: `http://localhost:5173/?plan=crystal-member&userId=test-123`
- Diamond Member: `http://localhost:5173/?plan=diamond-member&userId=test-123`

---

### Method 2: API Test (Command Line)

**Test plan endpoints:**

```bash
# Test each plan
curl http://localhost:8080/api/plans/trial-pass
curl http://localhost:8080/api/plans/pnp-member
curl http://localhost:8080/api/plans/crystal-member
curl http://localhost:8080/api/plans/diamond-member
```

**Expected output:**
```json
{"id":"trial-pass","name":"Trial Pass","price":"14.99","description":"7 days access","periodLabel":"week"}
```

---

### Method 3: Automated Tests

**Run the full test suite:**

```bash
node test-daimo-integration.js
```

This tests:
- ✅ All plan endpoints
- ✅ Webhook with mock payment
- ✅ Firestore updates
- ✅ Payment page accessibility

---

## 🔧 If Servers Stopped

If you need to restart the servers, here's how:

### Terminal 1 - Start Backend Server

```bash
cd server
npm run dev
```

**Wait for this message:**
```
[INFO] Firebase initialized
API listening on :8080
```

### Terminal 2 - Start Frontend Web App

```bash
cd web
npm run dev
```

**Wait for this message:**
```
VITE v5.4.21 ready in XXXms
➜ Local: http://localhost:5173/
```

---

## 🧪 Test Webhook

**Simulate a payment completion:**

```bash
curl -X POST http://localhost:8080/api/daimo/webhook ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Basic 0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c" ^
  -d "{\"type\":\"payment_completed\",\"payment\":{\"id\":\"pay_test_123\",\"status\":\"payment_completed\",\"metadata\":{\"userId\":\"8365312597\",\"planId\":\"trial-pass\"}}}"
```

**Expected response:** `OK`

**Then check Firestore:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: pnptv-b8af8
3. Go to Firestore Database
4. Look for `users/8365312597` - should have `subscriptionActive: true`
5. Look for `payments/pay_test_123` - payment record

---

## 📊 Monitor Logs

**Watch server logs (Terminal 1):**
```
[INFO] Daimo event: payment_completed pay_test_123
[INFO] ✅ Activated subscription for user 8365312597, plan trial-pass, 7 days
```

**Watch web logs (Terminal 2):**
```
19:11:59 [vite] page reload src/App.tsx
```

---

## 🎯 Quick Test Checklist

- [ ] **Backend API works:** Open http://localhost:8080/api/plans/trial-pass
- [ ] **Frontend loads:** Open http://localhost:5173
- [ ] **Payment page works:** Open http://localhost:5173/?plan=trial-pass&userId=test-123
- [ ] **Shows correct plan:** Should say "Trial Pass - $14.99/week"
- [ ] **Daimo button visible:** Purple payment button appears
- [ ] **Webhook responds:** Test with curl command above
- [ ] **Firestore updates:** Check Firebase Console after webhook test

---

## 🔍 Verify Everything is Running

**Check if ports are in use:**

```bash
# Windows PowerShell
netstat -ano | findstr :8080
netstat -ano | findstr :5173
```

Should show both ports are listening.

---

## 💡 Common Issues

### "Cannot GET /"

**Problem:** Opening http://localhost:5173 without parameters

**Solution:** Payment page needs query parameters. Use:
```
http://localhost:5173/?plan=trial-pass&userId=test-123
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::8080`

**Solution:**
```bash
# Kill process on port 8080
npx kill-port 8080

# Or restart server
cd server
npm run dev
```

### CORS Errors in Browser

**Problem:** Console shows CORS policy errors

**Solution:** Server has CORS enabled. Make sure:
- Server is running on 8080
- Web is running on 5173
- Both from localhost

### Firebase Error

**Problem:** `Firebase Admin SDK has not been initialized`

**Solution:** Check server logs. Firebase credentials should auto-load from .env

---

## 🎨 Visual Confirmation

When payment page loads correctly, you should see:

```
┌─────────────────────────────────────────┐
│  PNPtv Premium Subscription            │
│  Unlock exclusive content with crypto  │
├─────────────────────────────────────────┤
│                                         │
│  Trial Pass                             │
│  7 days access                          │
│                                         │
│  $14.99 / week                          │
│                                         │
│  [💰 Daimo Pay Button]                  │
│                                         │
│  ┌───────────┐  ┌───────────┐         │
│  │Exclusive  │  │  No Ads   │         │
│  │Content    │  │           │         │
│  └───────────┘  └───────────┘         │
│  ┌───────────┐  ┌───────────┐         │
│  │Priority   │  │  Early    │         │
│  │Support    │  │  Access   │         │
│  └───────────┘  └───────────┘         │
│                                         │
│  Powered by Daimo Pay | pnptv.app      │
└─────────────────────────────────────────┘
```

Colors:
- Background: Dark gray (#28282B)
- Headings: Magenta (#DF00FF)
- Price: Magenta (#DF00FF)
- Cards: Dark purple (#3A3A3E, #4A4A4E)

---

## ✅ Success Indicators

**You'll know it's working when:**

1. ✅ Browser opens payment page without errors
2. ✅ Page shows plan name and price
3. ✅ Daimo button is visible
4. ✅ Curl returns JSON for plans
5. ✅ Webhook returns "OK"
6. ✅ Firestore shows subscription data

---

## 🚀 Next Step: Test in Browser

**Right now, just click or paste this:**

```
http://localhost:5173/?plan=trial-pass&userId=8365312597
```

If you see the PNPtv payment page, **you're ready!** ✨

---

## 📞 Still Having Issues?

Check the server terminals for error messages. Common logs:

**Good (Server):**
```
[INFO] Firebase initialized
API listening on :8080
```

**Good (Web):**
```
➜ Local: http://localhost:5173/
```

**Bad:**
```
Error: EADDRINUSE
Error: Cannot find module
```

If you see errors, make sure you're in the correct directory and all dependencies are installed.
