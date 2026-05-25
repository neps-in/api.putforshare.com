# Django-Anymail AWS SES Configuration Guide

## Overview

This guide covers setting up **django-anymail** with **AWS SES (Simple Email Service)** for the pre-owned gadgets marketplace. Django-anymail provides a clean, unified interface for sending transactional emails through AWS SES.

---

## Why Django-Anymail + AWS SES?

✅ **Cost-Effective:** 62,000 free emails/month when sending from EC2  
✅ **Reliable:** 99.9% uptime SLA from AWS  
✅ **Easy Integration:** Native Django email backend  
✅ **Tracking:** Built-in support for opens, clicks, bounces  
✅ **Scalable:** Handles millions of emails per day  
✅ **India-Optimized:** Use Mumbai (ap-south-1) region for low latency  

---

## Step 1: AWS SES Setup

### 1.1 Create AWS Account
If you don't have one: https://aws.amazon.com/

### 1.2 Verify Email Address or Domain

**Option A: Verify Single Email (Quick Start)**
1. Go to AWS Console → SES → Verified Identities
2. Click "Create Identity"
3. Choose "Email address"
4. Enter: `noreply@yourdomain.com`
5. Click verification link in email from AWS

**Option B: Verify Domain (Recommended for Production)**
1. Go to AWS Console → SES → Verified Identities
2. Click "Create Identity"
3. Choose "Domain"
4. Enter your domain: `yourdomain.com`
5. Add DNS records (TXT, CNAME, MX) to your domain registrar
6. Wait for verification (usually 15 mins - 24 hours)

### 1.3 Request Production Access

**Important:** AWS SES starts in **Sandbox Mode** (can only send to verified emails).

To send to any email address:
1. Go to AWS Console → SES → Account Dashboard
2. Click "Request production access"
3. Fill form:
   - **Mail Type:** Transactional
   - **Use Case:** E-commerce marketplace transactional emails (signup, password reset, order confirmations)
   - **Expected Volume:** 1,000 emails/month initially
   - **Compliance:** Confirm you won't send spam
4. Submit request
5. Wait for approval (usually 24-48 hours)

### 1.4 Create IAM User for SES

For security, don't use root AWS credentials:

1. Go to AWS Console → IAM → Users
2. Click "Create User"
3. Username: `ses-marketplace-sender`
4. Click "Next"
5. Attach policy: `AmazonSESFullAccess` (or create custom policy with only SendEmail permission)
6. Click "Create User"
7. Go to user → Security Credentials → Create Access Key
8. Choose "Application running outside AWS"
9. **Save credentials securely:**
   - Access Key ID: `AKIA...`
   - Secret Access Key: `wJalr...`

---

## Step 2: Install Django-Anymail

### 2.1 Install Package

```bash
pip install django-anymail[amazon-ses] --break-system-packages
```

The `[amazon-ses]` extra includes the boto3 library needed for AWS SES.

### 2.2 Verify Installation

```bash
python -c "import anymail; print(anymail.__version__)"
```

Should output version number (e.g., `10.2`)

---

## Step 3: Django Configuration

### 3.1 Update settings.py

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'anymail',  # Add this
    
    # Your apps
    'accounts',
    'listings',
    'transactions',
]
```

Add email configuration (at end of settings.py):

```python
# Email Configuration (Django-Anymail + AWS SES)
ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        "aws_access_key_id": os.environ.get('AWS_SES_ACCESS_KEY_ID'),
        "aws_secret_access_key": os.environ.get('AWS_SES_SECRET_ACCESS_KEY'),
        "region_name": "ap-south-1",  # Mumbai region for India
    },
}

EMAIL_BACKEND = 'anymail.backends.amazon_ses.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'  # Must be verified in SES
SERVER_EMAIL = 'admin@yourdomain.com'  # For error emails
```

### 3.2 Environment Variables

Create `.env` file (never commit this!):

```bash
# AWS SES Credentials
AWS_SES_ACCESS_KEY_ID=AKIA...your_key...
AWS_SES_SECRET_ACCESS_KEY=wJalr...your_secret...

# Email Settings
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
SERVER_EMAIL=admin@yourdomain.com
```

Load in settings.py using `python-decouple` or `django-environ`:

```python
from decouple import config

ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        "aws_access_key_id": config('AWS_SES_ACCESS_KEY_ID'),
        "aws_secret_access_key": config('AWS_SES_SECRET_ACCESS_KEY'),
        "region_name": "ap-south-1",
    },
}
```

---

## Step 4: Create Email Templates

### 4.1 Directory Structure

```
your_project/
├── templates/
│   └── emails/
│       ├── welcome.html
│       ├── welcome.txt
│       ├── verification.html
│       ├── verification.txt
│       ├── password_reset.html
│       ├── password_reset.txt
│       ├── payment_success.html
│       ├── payment_success.txt
│       ├── payment_released.html
│       └── payment_released.txt
```

### 4.2 Example Template: Email Verification

**templates/emails/verification.html:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
            background-color: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Verify Your Email</h2>
        <p>Hi {{ user.first_name|default:"there" }},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <p>
            <a href="{{ verification_url }}" class="button">Verify Email</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>{{ verification_url }}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The Marketplace Team</p>
    </div>
</body>
</html>
```

**templates/emails/verification.txt:** (Plain text fallback)
```
Hi {{ user.first_name|default:"there" }},

Thanks for signing up! Please verify your email address by clicking the link below:

{{ verification_url }}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The Marketplace Team
```

---

## Step 5: Send Emails in Django

### 5.1 Basic Email Sending

```python
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def send_verification_email(user, verification_url):
    subject = 'Verify Your Email'
    
    # Render HTML email
    html_message = render_to_string('emails/verification.html', {
        'user': user,
        'verification_url': verification_url,
    })
    
    # Plain text fallback
    plain_message = render_to_string('emails/verification.txt', {
        'user': user,
        'verification_url': verification_url,
    })
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=None,  # Uses DEFAULT_FROM_EMAIL
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
```

### 5.2 Using Anymail Features

For advanced features (tracking, metadata, tags):

```python
from anymail.message import AnymailMessage

def send_transaction_email(buyer, seller, transaction):
    msg = AnymailMessage(
        subject='Payment Received - In Escrow',
        body='Your payment has been received...',
        from_email='noreply@yourdomain.com',
        to=[buyer.email],
        tags=['transaction', 'escrow'],  # For filtering in SES dashboard
        metadata={'transaction_id': transaction.id},  # Track with events
    )
    
    # Add HTML version
    msg.attach_alternative(
        '<html><body><h1>Payment Received</h1>...</body></html>',
        'text/html'
    )
    
    msg.send()
```

### 5.3 Async Email Sending (Recommended)

Don't block HTTP requests waiting for email to send:

**Option A: Django Background Tasks (Simple)**
```bash
pip install django-background-tasks --break-system-packages
```

```python
from background_task import background

@background(schedule=0)
def send_email_async(user_id, verification_url):
    user = User.objects.get(id=user_id)
    send_verification_email(user, verification_url)

# In your view:
send_email_async(user.id, verification_url)
```

**Option B: Celery (Production)**
```python
from celery import shared_task

@shared_task
def send_verification_email_task(user_id, verification_url):
    user = User.objects.get(id=user_id)
    send_verification_email(user, verification_url)

# In your view:
send_verification_email_task.delay(user.id, verification_url)
```

---

## Step 6: Testing

### 6.1 Test in Sandbox Mode

While SES is in sandbox mode, you can only send to verified emails:

1. Verify your personal email in SES
2. Send test email to yourself
3. Check spam folder if not received

### 6.2 Use Anymail Test Backend

For local development without actually sending emails:

```python
# settings_local.py or settings.py (development)
if DEBUG:
    EMAIL_BACKEND = 'anymail.backends.test.EmailBackend'
    ANYMAIL = {}
```

Check sent emails in test mode:
```python
from django.core.mail import send_mail
from anymail.backends.test import TestEmailBackend

send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])

# Access sent messages
print(TestEmailBackend.messages)
```

### 6.3 Django Shell Testing

```bash
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Test Email',
    'This is a test message.',
    'noreply@yourdomain.com',
    ['your-email@example.com'],
    fail_silently=False,
)

# Check for errors
# If successful, check your email inbox
```

---

## Step 7: Monitoring & Troubleshooting

### 7.1 AWS SES Dashboard

Monitor email sending:
1. Go to AWS Console → SES → Account Dashboard
2. View:
   - Sends (last 24 hours)
   - Bounces
   - Complaints
   - Reputation metrics

### 7.2 Common Issues

**Issue: "Email address is not verified"**
- Solution: Verify sender email in SES console
- Or: Request production access to send to unverified emails

**Issue: "AccessDenied" error**
- Solution: Check IAM user has `ses:SendEmail` permission
- Verify AWS credentials in `.env` file

**Issue: Emails go to spam**
- Solution: Add SPF, DKIM, DMARC records to your domain DNS
- AWS provides these in SES → Verified Identities → Domain → DKIM

**Issue: Slow email delivery**
- Solution: Use async sending (Celery or background tasks)
- Check SES region (use ap-south-1 for India)

### 7.3 SES Event Tracking

Track bounces, complaints, opens, clicks:

```python
# settings.py
ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        # ... existing config ...
    },
    "SEND_DEFAULTS": {
        "track_clicks": True,
        "track_opens": True,
    },
}
```

Set up SNS notifications in AWS SES for bounce/complaint handling.

---

## Step 8: Production Checklist

Before launch:

- [ ] Domain verified in AWS SES
- [ ] Production access approved by AWS
- [ ] SPF, DKIM, DMARC DNS records added
- [ ] IAM user created with minimal permissions (only SES)
- [ ] Environment variables secured (not in code)
- [ ] Email templates tested (HTML + plain text)
- [ ] Unsubscribe links added (if sending marketing emails)
- [ ] Bounce/complaint handling configured
- [ ] Email sending is async (Celery or background tasks)
- [ ] Monitoring set up (AWS CloudWatch alerts)

---

## Cost Estimation

**AWS SES Pricing (ap-south-1 region):**

| Scenario | Monthly Emails | Cost |
|----------|----------------|------|
| Sending from EC2 | 0 - 62,000 | **FREE** |
| Sending from EC2 | 100,000 | ~₹300 ($0.10 per 1,000 beyond 62k) |
| Not from EC2 | 10,000 | ~₹80 ($0.10 per 1,000) |
| Not from EC2 | 100,000 | ~₹800 |

**Recommendation:** Host Django on AWS EC2 to maximize free tier.

**V1 Estimate:**
- Signups: 100/month × 1 email = 100
- Transactions: 100/month × 3 emails (buyer confirmation, seller notification, payment released) = 300
- Password resets: 20/month × 1 email = 20
- **Total: ~420 emails/month = FREE tier**

---

## Email Types for Marketplace

### Transactional Emails (Required)

1. **Welcome Email** - On signup
2. **Email Verification** - With link to verify
3. **Password Reset** - With reset link
4. **Payment Confirmation** - Buyer: payment received, in escrow
5. **Seller Notification** - Seller: item sold, buyer contact info
6. **Payment Released** - Seller: payment transferred to bank
7. **Dispute Notification** - Admin: new dispute raised
8. **Dispute Resolution** - Buyer/Seller: dispute resolved

### Optional (Future)

9. **Listing Approved** - Seller: listing is live
10. **Price Drop Alert** - Buyer: item they viewed dropped in price
11. **Weekly Digest** - New listings in favorite categories

---

## Sample Email Sending Functions

```python
# utils/emails.py

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

def send_templated_email(subject, template_name, context, recipient_list):
    """
    Send email using HTML and plain text templates
    """
    html_message = render_to_string(f'emails/{template_name}.html', context)
    plain_message = render_to_string(f'emails/{template_name}.txt', context)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        html_message=html_message,
        fail_silently=False,
    )

def send_verification_email(user, verification_url):
    send_templated_email(
        subject='Verify Your Email',
        template_name='verification',
        context={'user': user, 'verification_url': verification_url},
        recipient_list=[user.email],
    )

def send_payment_confirmation(transaction):
    send_templated_email(
        subject='Payment Received - In Escrow',
        template_name='payment_success',
        context={'transaction': transaction, 'buyer': transaction.buyer},
        recipient_list=[transaction.buyer.email],
    )

def send_payment_released(transaction):
    send_templated_email(
        subject='Payment Released to Your Account',
        template_name='payment_released',
        context={'transaction': transaction, 'seller': transaction.seller},
        recipient_list=[transaction.seller.email],
    )
```

---

## Resources

- **Django-Anymail Docs:** https://anymail.dev/
- **AWS SES Docs:** https://docs.aws.amazon.com/ses/
- **SES Pricing:** https://aws.amazon.com/ses/pricing/
- **Django Email Docs:** https://docs.djangoproject.com/en/stable/topics/email/

---

## Support

If you encounter issues:
1. Check AWS SES logs in CloudWatch
2. Enable Django email logging: `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'` for local testing
3. Review django-anymail GitHub issues: https://github.com/anymail/django-anymail/issues

---

**Last Updated:** February 2026  
**Version:** 1.0 - AWS SES Configuration Guide
