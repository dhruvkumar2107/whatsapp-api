# Meta WhatsApp Setup Guide

## Quick Setup (10 minutes)

### Step 1: Create Meta Developer Account

1. Go to **https://developers.facebook.com**
2. Click **Log In** → Use your Facebook account
3. If new, click **Create Account** and follow steps

### Step 2: Create App

1. Go to **https://developers.facebook.com/apps**
2. Click **Create App**
3. Select **Business** type → Click **Next**
4. Enter app name: `WhaatoPro`
5. Enter contact email → Click **Create App**

### Step 3: Add WhatsApp Product

1. In your app dashboard, find **Add Products**
2. Find **WhatsApp** → Click **Set Up**
3. Select your Meta Business Account → Click **Continue**

### Step 4: Copy These Values

After setup, go to **WhatsApp > Getting Started** and copy:

| Value | Where in .env |
|-------|---------------|
| **App ID** (from app settings) | `META_APP_ID` |
| **App Secret** (from app settings) | `META_APP_SECRET` |
| **Temporary Access Token** | `META_ACCESS_TOKEN` |

Also note:
- **Phone Number ID** (shown on Getting Started page)
- **WhatsApp Business Account ID** (shown on Getting Started page)

### Step 5: Update .env

Open `.env` and fill in:

```
WHATSAPP_PROVIDER="meta"
META_APP_ID="paste_app_id_here"
META_APP_SECRET="paste_app_secret_here"
META_ACCESS_TOKEN="paste_access_token_here"
```

### Step 6: Make Access Token Permanent

Temporary tokens expire in 24 hours. To get a permanent token:

1. Go to **Business Manager**: https://business.facebook.com/settings
2. Go to **System Users** → Click **Add**
3. Name: `WhaatoPro Bot`
4. Role: **Admin**
5. Click **Generate Token**
6. Select your app
7. Check permission: `whatsapp_business_messaging`
8. Click **Generate Token**
9. Copy this token → Use as `META_ACCESS_TOKEN`

### Step 7: Configure Webhook

1. In Meta Developer Dashboard → WhatsApp → Configuration
2. Under **Webhook**, click **Edit**
3. Enter:
   - **Callback URL**: `https://your-domain.com/api/webhooks/meta`
   - **Verify Token**: `313aadb3b2c39183fd0cf84b6660df93` (already in your .env)
4. Click **Verify and Save**
5. Subscribe to: `messages` and `message_template_status_update`

### Step 8: Test

1. Start your app: `npm run dev`
2. Go to `/whatsapp`
3. Click **Connect WhatsApp**
4. Complete the OAuth flow
5. Send a test message from your phone to the connected number

---

## Troubleshooting

**"Invalid access token"**
- Token expired → Generate a new permanent token

**"Webhook verification failed"**
- Check `META_WEBHOOK_VERIFY_TOKEN` matches what you entered in Meta
- Ensure your domain has HTTPS

**"Cannot send messages"**
- Phone number must be verified
- Recipient must have sent you a message first (24h window)

**"App not approved"**
- For testing: Add test users in App Dashboard → Roles
- For production: Submit app for Meta review
