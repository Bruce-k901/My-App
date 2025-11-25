import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error(
            "STRIPE_SECRET_KEY is missing. Please set it in your environment variables.",
        );
    }
    
    if (!stripeInstance) {
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2024-11-20.acacia",
            appInfo: {
                name: "My App",
                version: "0.1.0",
            },
            typescript: true,
        });
    }
    
    return stripeInstance;
};
