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

        // Build the URL with correct authentication parameter
        let vboutUrl = `https://api.vbout.com/1/emailmarketing/addcontact?key=${VBOUT_API_KEY}&email=${encodeURIComponent(email)}`;
        
        // Add optional fields
        if (phone) {
            vboutUrl += `&phone=${encodeURIComponent(phone)}`;
        }
        if (country) {
            vboutUrl += `&country=${encodeURIComponent(country)}`;
        }
        if (visitorId) {
            vboutUrl += `&customfield1=${encodeURIComponent(visitorId)}`;
        }
        if (propertyUrl) {
            vboutUrl += `&customfield2=${encodeURIComponent(propertyUrl)}`;
        }
        if (VBOUT_LIST_ID) {
            vboutUrl += `&listid=${VBOUT_LIST_ID}`;
        }

        console.log('Calling VBout URL:', vboutUrl.replace(VBOUT_API_KEY, '[REDACTED]'));

        // Make the API call using GET method with query parameters
        const vboutResponse = await axios.get(vboutUrl, {
            timeout: 15000,
            validateStatus: (status) => status < 500 // Accept any status to see the response
        });

        console.log('VBout API response status:', vboutResponse.status);
        console.log('VBout API response data:', JSON.stringify(vboutResponse.data, null, 2));

        // Check if VBout request was successful
        if (vboutResponse.status === 200 && 
            (vboutResponse.data?.response?.header?.status === 'success' || 
             vboutResponse.data?.response?.status === 'success')) {
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Contact created successfully in VBout',
                    contact_id: vboutResponse.data?.response?.data?.id || null,
                    email: email,
                    vbout_response: vboutResponse.data
                })
            };
        } else {
            // VBout returned an error, but let's see what it says
            console.error('VBout API error response:', vboutResponse.data);
            
            return {
                statusCode: 200, // Return 200 to Charla but include error details
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'VBout API call completed but returned an error',
                    vbout_status: vboutResponse.status,
                    vbout_response: vboutResponse.data,
                    email: email
                })
            };
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
                error: 'Failed to process webhook',
                details: error.message,
                vbout_error: error.response?.data,
                timestamp: new Date().toISOString()
            })
        };
    }
};
