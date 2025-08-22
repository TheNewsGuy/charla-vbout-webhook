# Charla to VBout Webhook Integration

This Netlify function receives webhook data from Charla prechat forms and creates contacts in VBout CRM.

## Webhook URL
Your webhook URL will be: `https://your-site-name.netlify.app/.netlify/functions/charla-webhook`

## Environment Variables Required
- `VBOUT_API_KEY`: Your VBout API key
- `VBOUT_LIST_ID`: (Optional) Specific VBout list ID

## Setup
1. Deploy to Netlify
2. Configure environment variables
3. Add webhook URL to Charla settings
4. Test integration
