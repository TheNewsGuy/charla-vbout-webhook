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

        // Try VBout API with different approaches
        const apiAttempts = [
            // Attempt 1: Standard form data with apikey
            {
                method: 'form',
                url: 'https://api.vbout.com/1/emailmarketing/addcontact',
                data: {
                    apikey: VBOUT_API_KEY,
                    email: email,
                    phone: phone || '',
                    country: country || '',
                    customfield1: visitorId,
                    customfield2: propertyUrl,
                    ...(VBOUT_LIST_ID && { listid: VBOUT_LIST_ID })
                }
            },
            // Attempt 2: JSON with Authorization header
            {
                method: 'json',
                url: 'https://api.vbout.com/1/emailmarketing/addcontact',
                data: {
                    email: email,
                    phone: phone || '',
                    country: country || '',
                    customfield1: visitorId,
                    customfield2: propertyUrl,
                    ...(VBOUT_LIST_ID && { listid: VBOUT_LIST_ID })
                },
                headers: {
                    'Authorization': `Bearer ${VBOUT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            },
            // Attempt 3: Different parameter name
            {
                method: 'form',
                url: 'https://api.vbout.com/1/emailmarketing/addcontact',
                data: {
                    api_key: VBOUT_API_KEY,
                    email: email,
                    phone: phone || '',
                    country: country || '',
                    customfield1: visitorId,
                    customfield2: propertyUrl,
                    ...(VBOUT_LIST_ID && { listid: VBOUT_LIST_ID })
                }
            },
            // Attempt 4: GET method with query parameters
            {
                method: 'get',
                url: 'https://api.vbout.com/1/emailmarketing/addcontact',
                params: {
                    apikey: VBOUT_API_KEY,
                    email: email,
                    phone: phone || '',
                    country: country || '',
                    customfield1: visitorId,
                    customfield2: propertyUrl,
                    ...(VBOUT_LIST_ID && { listid: VBOUT_LIST_ID })
                }
            }
        ];

        let lastError = null;

        for (let i = 0; i < apiAttempts.length; i++) {
            const attempt = apiAttempts[i];
            console.log(`Trying VBout API attempt ${i + 1}: ${attempt.method} method`);

            try {
                let response;

                if (attempt.method === 'form') {
                    // Form-encoded data
                    const params = new URLSearchParams();
                    Object.keys(attempt.data).forEach(key => {
                        if (attempt.data[key]) {
                            params.append(key, attempt.data[key]);
                        }
                    });

                    response = await axios.post(attempt.url, params, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            ...attempt.headers
                        },
                        timeout: 15000
                    });

                } else if (attempt.method === 'json') {
                    // JSON data
                    response = await axios.post(attempt.url, attempt.data, {
                        headers: attempt.headers,
                        timeout: 15000
                    });

                } else if (attempt.method === 'get') {
                    // GET request with query parameters
                    response = await axios.get(attempt.url, {
                        params: attempt.params,
                        timeout: 15000
                    });
                }

                console.log(`Attempt ${i + 1} - VBout API response:`, response.data);

                // Check if successful
                if (response.data?.response?.status === 'success' || 
                    response.data?.status === 'success' ||
                    response.status === 200) {
                    
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Contact created successfully in VBout',
                            method_used: `${attempt.method} - attempt ${i + 1}`,
                            contact_id: response.data?.response?.data?.id || response.data?.data?.id || null,
                            email: email,
                            vbout_response: response.data
                        })
                    };
                }

            } catch (error) {
                console.log(`Attempt ${i + 1} failed:`, error.response?.data || error.message);
                lastError = error;
                continue; // Try next method
            }
        }

        // All attempts failed
        throw lastError || new Error('All API attempts failed');

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
