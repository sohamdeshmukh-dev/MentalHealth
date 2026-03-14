import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userEmail } = body;

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', // ✨ This tells Stripe to keep them on your site!
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          // ⚠️ Don't forget to put your actual Price ID here from the Stripe Dashboard!
          price: 'price_1TAeylP8OgCpKF6A4cak4hPZ', 
          quantity: 1,
        },
      ],
      // Stripe will seamlessly reload your profile page with a success message
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
    });

    // We return the secret key so your frontend can render the embedded form
    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error: any) {
    console.error('Stripe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
