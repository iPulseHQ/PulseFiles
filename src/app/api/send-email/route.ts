import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { to, fileName, shareUrl, expirationDate } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'share@openfiles.app',
      to: [to],
      subject: `File ready: ${fileName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
          <h2>Your file is ready</h2>
          
          <p><strong>${fileName}</strong></p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; 
                      display: inline-block;">Download File</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Link expires: ${expirationDate}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}