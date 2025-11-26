// =======================================
// PAYMENT CONFIRMATION SYSTEM - DRAFT
// =======================================

// 1. BROADCAST MESSAGE DRAFT
const broadcastMessage = {
  text: `🔥 **Upgrade Your PNPtv Experience!**

Ready to unlock exclusive premium content with Santino and access all VIP features?

💎 **Choose your plan and activate instantly!**

Click below to confirm your payment and get premium access:`,
  
  buttons: [
    [
      {
        text: "💰 I Made My Payment",
        callback_data: "payment_confirmation_start"
      }
    ],
    [
      {
        text: "💎 View All Plans",
        callback_data: "show_all_plans"
      }
    ]
  ]
};

// 2. PLAN SELECTION MENU
const planSelectionMenu = {
  text: `💎 **Select Your Plan**

Choose the plan you paid for:`,
  
  buttons: [
    [
      {
        text: "🔥 Trial Week - $14.99",
        callback_data: "payment_confirm_trial-week"
      }
    ],
    [
      {
        text: "⭐ PNP Member - $24.99",
        callback_data: "payment_confirm_pnp-member"
      }
    ],
    [
      {
        text: "💎 Crystal Member - $49.99",
        callback_data: "payment_confirm_crystal-member"
      }
    ],
    [
      {
        text: "👑 Diamond Member - $99.99", 
        callback_data: "payment_confirm_diamond-member"
      }
    ],
    [
      {
        text: "🌟 Lifetime Pass - $249.99",
        callback_data: "payment_confirm_lifetime-pass"
      }
    ],
    [
      {
        text: "← Back",
        callback_data: "back_to_main"
      }
    ]
  ]
};

// 3. PAYMENT RECEIPT REQUEST MESSAGE
const paymentReceiptRequest = (planInfo) => ({
  text: `💰 **Payment Registered**

Thank you for confirming your payment. We're verifying the transaction and will activate your membership shortly.

💰 **Amount:** $${planInfo.price} USD (${planInfo.priceInCOP.toLocaleString()} COP)
🔖 **Reference:** COP${Date.now()}${Math.floor(Math.random() * 10000)}
💎 **Plan:** ${planInfo.displayName}

⏳ **Estimated verification time:** 5-15 minutes

We'll notify you when your membership is active.

📸 **Please attach your payment receipt/proof for faster processing:**`,
  
  buttons: [
    [
      {
        text: "📞 Contact Admin @pnptvadmin", 
        url: "https://t.me/pnptvadmin"
      }
    ],
    [
      {
        text: "← Back to Menu",
        callback_data: "back_to_main"
      }
    ]
  ]
});

// 4. HIDDEN ADMIN COMMAND FOR CHANNELS/GROUPS
const hiddenPaymentButton = {
  command: "/sendpaymentbutton", // Hidden admin command
  description: "Send payment confirmation button to channel/group",
  
  message: {
    text: `💎 **Ready to upgrade your PNPtv experience?**

Join our premium community and unlock exclusive content!

👇 Click below if you've made a payment:`,
    
    buttons: [
      [
        {
          text: "💰 I Made My Payment",
          callback_data: "payment_confirmation_start"
        }
      ]
    ]
  }
};

// 5. IMPLEMENTATION NOTES
const implementationNotes = `
IMPLEMENTATION CHECKLIST:

✅ Add new callback handlers in bot/index.js:
   - payment_confirmation_start
   - payment_confirm_[plan-id]
   - show_all_plans

✅ Add payment confirmation functions in handlers/admin.js:
   - handlePaymentConfirmationStart()
   - handlePaymentPlanSelection()
   - showAllPlansForPayment()

✅ Add session state management:
   - ctx.session.waitingForPaymentProof = planId
   - ctx.session.paymentConfirmation = { plan, timestamp }

✅ Add photo/document handlers for payment receipts

✅ Add hidden admin command for channels:
   - /sendpaymentbutton (admin only)
   - Can be used in groups/channels

✅ Update localization files:
   - Add payment confirmation messages
   - Add error messages
   - Add success messages

✅ Add admin notification system:
   - Send payment proof to @pnptvadmin
   - Include user info and plan details
`;

module.exports = {
  broadcastMessage,
  planSelectionMenu,
  paymentReceiptRequest,
  hiddenPaymentButton,
  implementationNotes
};