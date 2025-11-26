# PNPTV Bot Onboarding Flow - Complete Review

## 🎯 Full Onboarding Journey

```
START: User sends /start
   ↓
1️⃣ LANGUAGE SELECTION
   ├─ Check: Is user in Firestore?
   │  ├─ YES → Check onboarding status
   │  └─ NO → New user, start from scratch
   │
   └─ Display: 🌎 Choose Language (English / Español)
      Handler: handleLanguageSelection()
      Callback: language_en / language_es
      Session Set: language, onboardingStep = "ageVerification"
      ↓

2️⃣ AGE VERIFICATION
   ├─ Check: Age already verified?
   │  ├─ YES & not expired → Show main menu
   │  ├─ YES & expired → Require re-verification
   │  └─ NO → Continue
   │
   ├─ Display: 🔞 Age Verification (18+ confirmation)
   │  Callback: confirm_age
   │  Handler: handleAgeConfirmation()
   │  Session Set: ageVerified, ageVerifiedAt, ageVerificationExpiresAt (7 days)
   │  ↓

3️⃣ TERMS & CONDITIONS
   ├─ Display: 📜 Terms & Conditions
   │  Buttons: ✅ Accept & Continue / ❌ Decline
   │  Callbacks: accept_terms / decline_terms
   │
   ├─ Accept Path:
   │  Handler: handleTermsAcceptance()
   │  Session Set: termsAccepted = true, onboardingStep = "email", awaitingEmail = true
   │  Display: 📧 Email Prompt
   │  Awaits: User message (email input)
   │  ↓
   │
   └─ Decline Path:
      Handler: handleTermsDecline()
      Show Alert: "You must accept Terms & Conditions"
      Flow Stops ❌

4️⃣ EMAIL COLLECTION
   ├─ Receive: User's email message
   │  Handler: handleEmailSubmission() [in bot.on("message")]
   │  Validation: EMAIL_REGEX check
   │
   ├─ If Invalid:
   │  └─ Show: "❌ Please enter a valid email"
   │     Continue awaiting valid email
   │
   ├─ If Valid:
   │  ├─ Update: ctx.session.awaitingEmail = false (CRITICAL - stops email mode)
   │  ├─ Save: Email to Firestore users/{userId}
   │  ├─ Send: ✅ Email confirmed message
   │  │
   │  ├─ Generate: One-time invite link to free channel (-1003159260496)
   │  │  ├─ Success: Send invite link to user
   │  │  └─ Fail: Show fallback message
   │  │
   │  ├─ Update: ctx.session.onboardingStep = "privacy"
   │  ├─ Display: 🕶️ Privacy & Discretion Policy
   │  │  Buttons: ✅ Accept & Continue / ❌ Decline
   │  │  Callbacks: accept_privacy / decline_privacy
   │  ↓
   │
   └─ Session State at Email Step:
      {
        language: "en" | "es",
        onboardingStep: "privacy",
        ageVerified: true,
        termsAccepted: true,
        awaitingEmail: false,
        email: "user@example.com",
        onboardingComplete: false  ← NOT YET!
      }

5️⃣ PRIVACY POLICY ACCEPTANCE
   ├─ Accept Path:
   │  Handler: handlePrivacyAcceptance()
   │  
   │  ├─ Create/Update Firestore Document:
   │  │  {
   │  │    userId, username, firstName, lastName,
   │  │    language, ageVerified, termsAccepted, privacyAccepted,
   │  │    ageVerificationExpiresAt,
   │  │    onboardingComplete: true ← NOW SET!
   │  │    tier: "Free"
   │  │  }
   │  │
   │  ├─ Update Session:
   │  │  onboardingComplete = true ✅
   │  │  privacyAccepted = true
   │  │
   │  ├─ Display Message:
   │  │  New User: "✨ Welcome to the Cult! Your profile is live!"
   │  │  Returning User: "✨ Age verification successful"
   │  │  ↓
   │
   ├─ Decline Path:
   │  Handler: handlePrivacyDecline()
   │  Show Alert: "You must accept Privacy Policy"
   │  Flow Stops ❌
   │  ↓

6️⃣ MAIN MENU (Intro Screen)
   └─ Display: Interactive Inline Menu
      
      💎 Subscribe to PRIME Channel
      [callback: show_subscription_plans]
      
      👤 My Profile  
      [callback: show_my_profile]
      
      🌍 Who is nearby?
      [callback: show_nearby]
      
      🤖 PNPtv! Support
      [callback: show_help]

✅ ONBOARDING COMPLETE!
```

---

## 🔧 Key Fixes Applied

### ✅ Fix #1: Firestore Update Error
**Problem:** Using `.update()` on non-existent document threw error
```javascript
// ❌ BEFORE (fails if doc doesn't exist):
await db.collection("users").doc(userId).update({...})

// ✅ AFTER (creates or updates):
await db.collection("users").doc(userId).set({...}, { merge: true })
```

### ✅ Fix #2: Email Handler Order
**Problem:** Session state was updated AFTER API calls, causing race conditions
```javascript
// ✅ CORRECTED ORDER:
1. Update session immediately: awaitingEmail = false
2. Save email to Firestore
3. Send confirmation messages
4. Generate invite link
5. Show privacy policy
6. Move to next step
```

### ✅ Fix #3: Premature Onboarding Completion
**Problem:** `onboardingComplete` was set after email, before privacy acceptance
```javascript
// ❌ BEFORE (in email handler):
ctx.session.onboardingComplete = true  // TOO EARLY!

// ✅ AFTER (only in privacy handler):
// Email handler sets: onboardingStep = "privacy", onboardingComplete = false
// Privacy handler sets: onboardingComplete = true ✅
```

---

## 📊 Session State Through Flow

```
Step 1 - New User Lands:
{
  onboardingStep: null,
  onboardingComplete: false,
  language: null
}

Step 2 - After Language:
{
  language: "en" | "es",
  onboardingStep: "ageVerification"
}

Step 3 - After Age:
{
  ageVerified: true,
  ageVerifiedAt: Date,
  ageVerificationExpiresAt: Date (7 days),
  onboardingStep: "terms"
}

Step 4 - After Terms:
{
  termsAccepted: true,
  awaitingEmail: true,
  onboardingStep: "email"
}

Step 5 - After Email (FIXED):
{
  email: "user@example.com",
  awaitingEmail: false,
  onboardingStep: "privacy",
  onboardingComplete: false  ← Still false!
}

Step 6 - After Privacy (FINAL):
{
  privacyAccepted: true,
  onboardingComplete: true ✅,  ← NOW complete!
  tier: "Free"
}
```

---

## 🎯 Handler Registration (src/bot/index.js)

```javascript
// Language selection (handles both patterns)
bot.action(/lang_(.+)/, handleLanguageSelection)
bot.action(/language_(.+)/, handleLanguageSelection)

// Age verification
bot.action("confirm_age", handleAgeConfirmation)

// Terms
bot.action("accept_terms", handleTermsAcceptance)
bot.action("decline_terms", handleTermsDecline)

// Email (via message handler)
bot.on("message", async (ctx, next) => {
  if (ctx.session?.awaitingEmail) {
    await handleEmailSubmission(ctx)
    return
  }
  return next()
})

// Privacy
bot.action("accept_privacy", handlePrivacyAcceptance)
bot.action("decline_privacy", handlePrivacyDecline)
```

---

## ✨ Expected User Experience

### New User Flow:
```
/start
  ↓
📧 1. Select language (English/Español)
  ↓
🔞 2. Confirm age (18+)
  ↓
📜 3. Accept terms & conditions
  ↓
✉️ 4. Enter email address
  ↓
🎉 5. Receive FREE channel invite link
  ↓
🕶️ 6. Accept privacy policy
  ↓
✅ 7. See MAIN MENU (subscription, profile, nearby, support)
```

### Returning User (Onboarding Expired):
```
/start
  ↓
🔞 Age verification reminder (7-day expiration)
  ↓
✅ Confirm age
  ↓
✅ Sent to MAIN MENU
```

### Returning User (Active):
```
/start
  ↓
✅ Straight to MAIN MENU
```

---

## 🚨 Errors Fixed

| Error | Cause | Fix |
|-------|-------|-----|
| Firestore crash after email | `.update()` on non-existent doc | Use `.set()` with `merge: true` |
| Invite link never shows | API call after session state change | Session updated FIRST |
| User stuck in email mode | `awaitingEmail` never cleared | Set to `false` immediately |
| Premature main menu | `onboardingComplete` set early | Only set after privacy |
| Race conditions | Session updates after promises | Reorder to sync first |

---

## 🧪 Testing the Flow

To test:
1. Send `/start` to bot
2. Select language
3. Click "Yes, I'm 18+"
4. Accept terms
5. Enter valid email (test@example.com)
6. ✅ Should see: Email confirmation + Free channel invite link
7. Accept privacy
8. ✅ Should see: Main menu with subscription/profile/nearby/support buttons

---

## 📝 All Handlers Verified

✅ `handleLanguageSelection()` - Sets language, moves to age
✅ `handleAgeConfirmation()` - Verifies age, moves to terms
✅ `handleTermsAcceptance()` - Accepts terms, awaits email
✅ `handleEmailSubmission()` - **FIXED** - Saves email, generates invite, shows privacy
✅ `handlePrivacyAcceptance()` - Marks complete, shows main menu
✅ `handleTermsDecline()` - Blocks flow
✅ `handlePrivacyDecline()` - Blocks flow

---

**Status:** ✅ READY FOR PRODUCTION
