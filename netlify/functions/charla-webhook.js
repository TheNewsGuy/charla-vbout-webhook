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
        const VBOUT_LIST_ID = process.env.VBOUT_LIST_ID;
        
        if (!VBOUT_API_KEY) {
            throw new Error('VBOUT_API_KEY environment variable is required');
        }

        // Extract form fields
        const fields = body.fields;
        const visitorId = body.visitor_id;
        const propertyUrl = body.property_url;
        
        // Helper function to find field value by name
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

        // Prepare VBout contact data using correct parameter names
        const vboutContactData = {
            apikey: VBOUT_API_KEY,  // VBout uses 'apikey' parameter
            email: email,
            phone: phone || '',
            country: country || '',
            // Store additional info in custom fields
            customfield1: visitorId, // Charla visitor ID
            customfield2: propertyUrl, // Website URL where form was submitted
        };

        // Add to specific list if configured
        if (VBOUT_LIST_ID) {
            vboutContactData.listid = VBOUT_LIST_ID;
        }

        // Convert data to URL-encoded format (VBout expects form data, not JSON)
        const params = new URLSearchParams();
        Object.keys(vboutContactData).forEach(key => {
            if (vboutContactData[key]) {
                params.append(key, vboutContactData[key]);
            }
        });

        console.log('Sending data to VBout:', {
            ...vboutContactData,
            apikey: '[REDACTED]' // Don't log the API key
        });

        // Send data to VBout API with correct format
        const vboutResponse = await axios.post(
            'https://api.vbout.com/1/emailmarketing/addcontact',
            params,
            {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Charla-VBout-Integration/1.0'
                },
                timeout: 15000
            }
        );

        console.log('VBout API response status:', vboutResponse.status);
        console.log('VBout API response data:', vboutResponse.data);

        // Check if VBout request was successful
        if (vboutResponse.data?.response?.status === 'success') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Contact created successfully in VBout',
                    contact_id: vboutResponse.data.response.data?.id || null,
                    email: email
                })
            };
        } else {
            console.error('VBout API error:', vboutResponse.data);
            throw new Error(`VBout API error: ${JSON.stringify(vboutResponse.data)}`);
        }

    } catch (error) {
        console.error('Error processing webhook:', error.message);
        
        if (error.response) {
            console.error('HTTP Error Status:', error.response.status);
            console.error('HTTP Error Data:', error.response.data);
        }
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to create contact in VBout',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
