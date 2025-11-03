import { NextResponse } from 'next/server'

// Simple SMS sending via Twilio or other service
// For now, logs to console and could be extended with Twilio/Vonage/etc.
export async function POST(req: Request) {
  try {
    const { to, message } = await req.json()

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 })
    }

    // TODO: Integrate with Twilio, Vonage, or other SMS service
    // For now, just log it (in production, you'd send via actual SMS service)
    console.log('📱 SMS would be sent:', {
      to,
      message
    })

    // If you have Twilio set up:
    // const twilio = require('twilio')
    // const client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // )
    // await client.messages.create({
    //   body: message,
    //   to: to,
    //   from: process.env.TWILIO_PHONE_NUMBER
    // })

    return NextResponse.json({ success: true, message: 'SMS sent (logged)' })
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 })
  }
}

