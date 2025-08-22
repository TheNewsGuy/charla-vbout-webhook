// netlify/functions/charla-webhook.js
const axios = require('axios');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the request body
        const body = JSON.parse(event.body);
        
        console.log('Received webhook from Charla:', JSON.stringify(body, null, 2));
        
        // Verify this is a prechat form submission
        if (body.event !== 'prechat:formsubmission') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid event type' })
            };
        }

        // Get VBout API configuration from environment variables
        const VBOUT_API_KEY = process.env.VBOUT_API_KEY;
        const VBOUT_LIST_ID = process.env.VBOUT_LIST_ID; // Optional
        
        if (!VBOUT_API_KEY) {
            throw new Error('VBOUT_API_KEY environment variable is required');
        }

        // Extract form fields
        const fields = body.fields;
        const visitorId = body.visitor_id;
        const propertyUrl = body.property_url;
        
        // Helper function to find field value by name (case-insensitive)
        const getFieldValue = (fieldName) => {
            const field = fields.find(f => 
                f.name.toLowerCase() === fieldName.toLowerCase()
            );
            return field ? field.value : '';
        };

        // Extract contact information
        const email = getFieldValue('Email');
        const phone = getFieldValue('Phone Number');
        const country = getFieldValue('Country');

        // Validate required fields
        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Prepare VBout contact data
        const vboutContactData = {
            key: VBOUT_API_KEY,
            email: email,
            phone: phone || '',
            country: country || '',
            // Store additional info in custom fields
            custom1: visitorId, // Charla visitor ID
            custom2: propertyUrl, // Website URL where form was submitted
            // Add more custom fields as needed based on your VBout setup
        };

        //
