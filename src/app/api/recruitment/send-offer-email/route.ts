import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/send-email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      candidateEmail,
      candidateName,
      jobTitle,
      companyId,
      offerUrl,
      startDate,
      payRate,
      payFrequency,
      contractType,
      contractHours,
      applicationId,
      confirmationToken,
      siteName,
      siteAddress,
      department,
    } = body

    if (!candidateEmail || !candidateName || !jobTitle || !offerUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const companyName = company?.name || 'Our Company'
    const firstName = candidateName.split(' ')[0]

    // Format pay text
    const payText = payRate
      ? `£${Number(payRate).toFixed(2)} ${payFrequency === 'hourly' ? 'per hour' : 'per year'}`
      : 'Competitive salary'

    // Format start date
    const formattedStartDate = startDate
      ? new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : ''

    // Format contract type
    const formattedContractType = contractType
      ? contractType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      : ''

    // Format hours
    const formattedHours = contractHours ? `${contractHours} hours/week` : ''

    // Format expiry date (7 days from now)
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')

    // Hero subtitle
    const heroSubtitle = siteName ? `${companyName} — ${siteName}` : companyName

    // Department tag
    const departmentTag = department || ''

    // Pay type tag
    const payTypeTag = payFrequency === 'hourly' ? 'Hourly' : 'Salaried'

    // SVG icons as data URIs (duotone style in #b0607a)
    const buildingIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 256 256'%3E%3Crect x='32' y='48' width='192' height='176' rx='8' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M232,224H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,56H192V224H160V184a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v40H64Zm80,168H112V192h32ZM88,104a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,104Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,104ZM88,144a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,144Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,144Z' fill='%23b0607a'/%3E%3C/svg%3E" width="32" height="32" alt="" style="display:block;margin:0 auto;" />`

    const calendarIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Crect x='40' y='40' width='176' height='176' rx='8' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V80H208Z' fill='%23b0607a'/%3E%3C/svg%3E" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;" />`

    const moneyIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Ccircle cx='128' cy='128' r='80' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-112H136V88a8,8,0,0,0-16,0v16h-8a24,24,0,0,0,0,48h8v16H104a8,8,0,0,0,0,16h16v8a8,8,0,0,0,16,0v-8h8a24,24,0,0,0,0-48h-8V120h8a8,8,0,0,0,0-16Zm-32,32h-8a8,8,0,0,1,0-16h8Zm32,32a8,8,0,0,1-8,8h-8V152h8A8,8,0,0,1,144,168Z' fill='%23b0607a'/%3E%3C/svg%3E" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;" />`

    const briefcaseIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Crect x='32' y='64' width='192' height='144' rx='8' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,200H40V72H216Z' fill='%23b0607a'/%3E%3C/svg%3E" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;" />`

    const clockIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Ccircle cx='128' cy='128' r='88' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z' fill='%23b0607a'/%3E%3C/svg%3E" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;" />`

    const mapPinIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Ccircle cx='128' cy='104' r='48' fill='%23b0607a' opacity='0.2'/%3E%3Cpath d='M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.36,134.39a8,8,0,0,0,9.28,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z' fill='%23b0607a'/%3E%3C/svg%3E" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;" />`

    const checkIcon = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 256 256'%3E%3Ccircle cx='128' cy='128' r='88' fill='%23ffffff' opacity='0.2'/%3E%3Cpath d='M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51Z' fill='%23ffffff'/%3E%3C/svg%3E" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;" />`

    // Location row for email (only if siteName provided)
    const locationRow = siteName ? `
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:top; padding-right:10px;">
                          ${mapPinIcon}
                        </td>
                        <td>
                          <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:13px; color:#b0607a; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Location</div>
                          <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:15px; color:#2D2D2D; font-weight:600;">${siteName}</div>
                          ${siteAddress ? `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:13px; color:#7A7A7A; margin-top:2px;">${siteAddress}</div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''

    const htmlContent = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Job Offer - ${companyName}</title>
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; }
    td { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  </style>
  <![endif]-->
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 0; }
    @media only screen and (max-width: 620px) {
      .detail-grid td { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#FAF5F6; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FAF5F6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 4px rgba(176,96,122,0.08);">

          <!-- Hero Section -->
          <tr>
            <td style="background:linear-gradient(135deg, #FDF2F4 0%, #F9E4E9 50%, #F3D5DC 100%); padding:40px 32px; text-align:center;">
              <!-- Company icon circle -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="width:64px; height:64px; background-color:#FFFFFF; border-radius:32px; text-align:center; vertical-align:middle; box-shadow:0 2px 8px rgba(176,96,122,0.15);">
                    ${buildingIcon}
                  </td>
                </tr>
              </table>
              <!-- Job Offer badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:16px;">
                <tr>
                  <td style="background-color:rgba(176,96,122,0.15); padding:4px 14px; border-radius:20px;">
                    <span style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; font-weight:700; color:#b0607a; text-transform:uppercase; letter-spacing:1px;">Job Offer</span>
                  </td>
                </tr>
              </table>
              <!-- Congratulations -->
              <h1 style="margin:16px 0 6px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:26px; font-weight:700; color:#2D2D2D; line-height:1.2;">
                Congratulations, ${firstName}!
              </h1>
              <p style="margin:0 0 4px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:15px; color:#7A7A7A; font-weight:500;">
                ${heroSubtitle}
              </p>
              <p style="margin:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:13px; color:#A0A0A0;">
                Review your offer details below
              </p>
            </td>
          </tr>

          <!-- Offer Details Section -->
          <tr>
            <td style="padding:28px 24px 0;">
              <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; font-weight:700; color:#b0607a; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;">
                YOUR OFFER DETAILS
              </div>
            </td>
          </tr>

          <!-- Position + Tags -->
          <tr>
            <td style="padding:0 24px 16px;">
              <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:20px; font-weight:700; color:#2D2D2D; margin-bottom:8px;">
                ${jobTitle}
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${departmentTag ? `<td style="padding-right:6px;">
                    <span style="display:inline-block; background-color:#F3E8EB; color:#b0607a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; font-weight:600; padding:3px 10px; border-radius:12px;">${departmentTag}</span>
                  </td>` : ''}
                  <td>
                    <span style="display:inline-block; background-color:#F3E8EB; color:#b0607a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; font-weight:600; padding:3px 10px; border-radius:12px;">${payTypeTag}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Location tile -->
          ${locationRow}

          <!-- 2x2 Detail Grid -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="detail-grid">
                <tr>
                  <!-- Start Date -->
                  <td width="50%" style="padding:0 6px 12px 0; vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:top; padding-right:8px;">
                                ${calendarIcon}
                              </td>
                              <td>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; color:#A0A0A0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Start Date</div>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:14px; color:#2D2D2D; font-weight:600;">${formattedStartDate || 'TBC'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Pay Rate -->
                  <td width="50%" style="padding:0 0 12px 6px; vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:top; padding-right:8px;">
                                ${moneyIcon}
                              </td>
                              <td>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; color:#A0A0A0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Pay Rate</div>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:14px; color:#b0607a; font-weight:700;">${payText}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <!-- Contract Type -->
                  <td width="50%" style="padding:0 6px 0 0; vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:top; padding-right:8px;">
                                ${briefcaseIcon}
                              </td>
                              <td>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; color:#A0A0A0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Contract</div>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:14px; color:#2D2D2D; font-weight:600;">${formattedContractType || 'TBC'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Hours -->
                  <td width="50%" style="padding:0 0 0 6px; vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="vertical-align:top; padding-right:8px;">
                                ${clockIcon}
                              </td>
                              <td>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; color:#A0A0A0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Hours</div>
                                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:14px; color:#2D2D2D; font-weight:600;">${formattedHours || 'TBC'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${offerUrl ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding:8px 24px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="background-color:#b0607a; border-radius:12px;">
                    <a href="${offerUrl}" target="_blank" style="display:block; padding:16px 32px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; text-align:center;">
                      ${checkIcon}&nbsp;&nbsp;Accept Job Offer
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:12px; color:#A0A0A0;">
                Offer expires on ${expiryDate}
              </p>
            </td>
          </tr>
          ` : `
          <!-- No URL fallback -->
          <tr>
            <td style="padding:8px 24px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FDF8F9; border:1px solid rgba(176,96,122,0.15); border-radius:12px;">
                <tr>
                  <td style="padding:20px; text-align:center;">
                    <p style="margin:0 0 8px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:15px; color:#2D2D2D; font-weight:600;">Please Respond</p>
                    <p style="margin:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:13px; color:#7A7A7A;">Reply to this email to accept or discuss terms</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `}

          <!-- Time Sensitive Warning -->
          <tr>
            <td style="padding:0 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF8F0; border-left:3px solid #E8A84C; border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:12px; font-weight:700; color:#C07B28; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Time Sensitive</div>
                    <p style="margin:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:13px; color:#C07B28; line-height:1.5;">
                      This offer is valid for <strong>7 days</strong> from the date of this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Powered by Opsly Footer -->
          <tr>
            <td style="padding:20px 24px 28px; border-top:1px solid rgba(176,96,122,0.08);">
              <!-- Bar mark -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:10px;">
                <tr>
                  <td style="width:4px; height:16px; background-color:#1B2624; border-radius:2px;"></td>
                  <td style="width:2px;"></td>
                  <td style="width:4px; height:13px; background-color:#8B2E3E; border-radius:2px; vertical-align:bottom;"></td>
                  <td style="width:2px;"></td>
                  <td style="width:4px; height:15px; background-color:#D9868C; border-radius:2px; vertical-align:bottom;"></td>
                  <td style="width:2px;"></td>
                  <td style="width:4px; height:14px; background-color:#5D8AA8; border-radius:2px; vertical-align:bottom;"></td>
                  <td style="width:2px;"></td>
                  <td style="width:4px; height:16px; background-color:#87B0D6; border-radius:2px; vertical-align:bottom;"></td>
                  <td style="width:2px;"></td>
                  <td style="width:4px; height:15px; background-color:#9AC297; border-radius:2px; vertical-align:bottom;"></td>
                </tr>
              </table>
              <p style="margin:0 0 4px; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:12px; color:#A0A0A0;">
                Powered by <strong style="color:#7A7A7A;">opsly</strong>
              </p>
              <p style="margin:0; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; font-size:11px; color:#A0A0A0;">
                ${companyName} &middot; Recruitment
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card -->
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Send email via Resend directly (avoid self-calling API which fails on Vercel)
    const emailResult = await sendEmail({
      to: candidateEmail,
      subject: `Job Offer: ${jobTitle} at ${companyName}`,
      html: htmlContent,
    })

    if (emailResult.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        error: emailResult.error,
        offerUrl,
      }, { status: 200 })
    }

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    return NextResponse.json({
      success: true,
      message: 'Offer email sent successfully',
    })
  } catch (error: any) {
    console.error('Send offer email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send offer email' },
      { status: 500 }
    )
  }
}
