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

        // Prepare VBout contact data
        const vboutContactData = {
            key: VBOUT_API_KEY,
            email: email,
            phone: phone || '',
            country: country || '',
            custom1: visitorId,
            custom2: propertyUrl
        };

        // Add to specific list if configured
        if (VBOUT_LIST_ID) {
            vboutContactData.listid = VBOUT_LIST_ID;
        }

        console.log('Sending data to VBout:', {
            ...vboutContactData,
            key: '[REDACTED]'
        });

        // Send data to VBout API
        const vboutResponse = await axios.post(
            'https://api.vbout.com/1/emailmarketing/addcontact.json',
            vboutContactData,
            {
                headers: { 
                    'Content-Type': 'application/json',
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
