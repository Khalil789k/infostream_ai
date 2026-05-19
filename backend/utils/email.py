import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str, mode: str = "verification") -> bool:
    """
    Send OTP verification or password reset email.
    Falls back to standard console logging if SMTP settings are missing.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    if smtp_pass:
        smtp_pass = smtp_pass.replace(" ", "").strip()

    subject = "Verify your email - Info Stream AI" if mode == "verification" else "Reset your password - Info Stream AI"
    
    # Premium HTML Email template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 2px solid #111111; }}
            .header {{ background: linear-gradient(135deg, #111111, #333333); color: #ffffff; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }}
            .content {{ padding: 40px; text-align: center; }}
            .content p {{ font-size: 16px; line-height: 1.6; color: #555555; margin-bottom: 24px; }}
            .otp-box {{ background-color: #f8f9fa; border: 2px dashed #111111; border-radius: 12px; display: inline-block; padding: 15px 40px; margin: 10px 0 30px 0; }}
            .otp-code {{ font-size: 36px; font-weight: 800; color: #111111; letter-spacing: 5px; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #999999; border-t: 1px solid #f1f1f1; background-color: #fafafa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Info Stream AI</h1>
            </div>
            <div class="content">
                <h2>{subject}</h2>
                <p>Thank you for using Info Stream AI. Use the secure 6-digit one-time password (OTP) code below to complete your action. This code is valid for 15 minutes.</p>
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                </div>
                <p>If you did not request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                &copy; 2026 Info Stream AI. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    # Fallback check
    if not smtp_host or not smtp_user or not smtp_pass:
        logger.info(f"\n=======================================================\n"
                    f"[SIMULATED EMAIL SENT] to: {to_email}\n"
                    f"Subject: {subject}\n"
                    f"OTP Code: {otp}\n"
                    f"=======================================================\n")
        return True

    # 1. Try to send via Brevo Transactional Web API (100% Free, NO DOMAIN REQUIRED, works on Hugging Face!)
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if brevo_api_key:
        try:
            import requests
            headers = {
                "api-key": brevo_api_key,
                "Content-Type": "application/json"
            }
            
            # Use configured SMTP_USER/SMTP_FROM or fallback to standard verified Gmail sender
            sender_email = os.getenv("SMTP_USER", "khalil789k@gmail.com")
            sender_name = "Info Stream AI"
            smtp_from = os.getenv("SMTP_FROM")
            if smtp_from and "<" in smtp_from:
                parts = smtp_from.split("<")
                sender_name = parts[0].strip()
                sender_email = parts[1].replace(">", "").strip()
            
            body = {
                "sender": {
                    "name": sender_name,
                    "email": sender_email
                },
                "to": [
                    {
                        "email": to_email
                    }
                ],
                "subject": subject,
                "htmlContent": html_content
            }
            
            response = requests.post("https://api.brevo.com/v3/smtp/email", json=body, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                logger.info(f"Successfully sent transaction email via Brevo Web API to {to_email}")
                return True
            else:
                logger.warning(f"[Brevo Fallback] API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error sending email via Brevo Web API: {e}")

    # 2. Try to send via Resend Transactional Web API (Bypasses Hugging Face SMTP port blocks!)
    resend_api_key = os.getenv("RESEND_API_KEY")
    if resend_api_key:
        try:
            import requests
            
            # Format the "from" field specifically for Resend
            # Public domains like @gmail.com must use Resend's onboarding@resend.dev sandbox domain
            resend_from = "onboarding@resend.dev"
            smtp_from = os.getenv("SMTP_FROM")
            if smtp_from:
                smtp_from_lower = smtp_from.lower()
                if any(x in smtp_from_lower for x in ["@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com"]):
                    if "<" in smtp_from:
                        display_name = smtp_from.split("<")[0].strip()
                        resend_from = f"{display_name} <onboarding@resend.dev>"
                    else:
                        resend_from = "onboarding@resend.dev"
                else:
                    resend_from = smtp_from

            headers = {
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "from": resend_from,
                "to": to_email,
                "subject": subject,
                "html": html_content
            }
            response = requests.post("https://api.resend.com/emails", json=body, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                logger.info(f"Successfully sent transaction email via Resend Web API to {to_email}")
                return True
            else:
                logger.warning(f"[Resend Fallback] API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error sending email via Resend Web API: {e}")

    # 3. Simulated console fallback if Web APIs fail or are unconfigured
    logger.info(f"\n=======================================================\n"
                f"[FALLBACK SIMULATED OTP] to: {to_email}\n"
                f"Subject: {subject}\n"
                f"OTP Code: {otp}\n"
                f"=======================================================\n")
    return True
