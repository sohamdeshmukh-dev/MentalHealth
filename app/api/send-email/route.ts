import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { score, userEmail } = body; // We still accept userEmail so the frontend doesn't break!

    const data = await resend.emails.send({
      from: 'Aura Atlas <onboarding@resend.dev>', 
      
      // ⚠️ THE HACKATHON OVERRIDE: 
      // Always send to your real phone, regardless of who is logged into the app!
      to: ['balajipratik8@gmail.com'], 
      
      subject: 'Your Daily Aura Check-In is Complete! ✨',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 10px; border: 1px solid #eaeaea;">
          <h2 style="color: #0d9488;">Aura Atlas Check-In</h2>
          <p>Great job tracking your mood today!</p>
          <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #115e59; font-size: 16px;">
              Your logged Smile Score: <strong style="font-size: 24px;">${score}</strong>
            </p>
          </div>
          <p style="color: #555;">Keep up the great work building your mental health streak on campus. We'll see you tomorrow!</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            (Sent to account: ${userEmail})
          </p>
        </div>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
