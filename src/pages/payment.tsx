"use client";

import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { getAddress } from "viem";

export default function PaymentPage() {
  const [params, setParams] = useState({
    planId: "",
    userId: "",
    amount: "0"
  });

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      planId: urlParams.get("plan") || "",
      userId: urlParams.get("user") || "",
      amount: urlParams.get("amount") || "0"
    });
  }, []);

  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;

  if (!TREASURY_ADDRESS) {
    return <div>Configuration error: Missing treasury address</div>;
  }

  if (!params.planId || !params.userId || !params.amount) {
    return <div>Invalid payment parameters</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Complete Your Payment</h1>
        
        <DaimoPayButton
          appId={process.env.NEXT_PUBLIC_DAIMO_APP_ID || ""}
          toChain={baseUSDC.chainId}
          toAddress={getAddress(TREASURY_ADDRESS)}
          toUnits={params.amount}
          toToken={getAddress(baseUSDC.token)}
          intent="Subscription"
          metadata={{
            userId: params.userId,
            planId: params.planId,
          }}
          onPaymentStarted={async (e) => {
            try {
              // Save payment intent
              const response = await fetch("/api/payment-intents", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paymentId: e.paymentId,
                  userId: params.userId,
                  planId: params.planId,
                  amount: params.amount
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to save payment intent");
              }
            } catch (error) {
              console.error("Error saving payment intent:", error);
            }
          }}
          preferredChains={[baseUSDC.chainId]}
          preferredTokens={[{
            chain: baseUSDC.chainId,
            address: getAddress(baseUSDC.token)
          }]}
        />
      </div>
    </div>
  );
}