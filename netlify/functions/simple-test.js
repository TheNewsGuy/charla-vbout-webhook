const axios = require('axios');

exports.handler = async (event, context) => {
    try {
        const VBOUT_API_KEY = process.env.VBOUT_API_KEY;
        
        // VBout API typically uses this format based on their documentation
        const authMethods = [
            // Method 1: API key in query parameter
            {
                name: 'Query Parameter apikey',
                url: `https://api.vbout.com/1/user/me?apikey=${VBOUT_API_KEY}`
            },
            // Method 2: API key in query parameter as 'key'
            {
                name: 'Query Parameter key',
                url: `https://api.vbout.com/1/user/me?key=${VBOUT_API_KEY}`
            },
            // Method 3: Authorization header
            {
                name: 'Authorization Header',
                url: 'https://api.vbout.com/1/user/me',
                headers: {
                    'Authorization': `Bearer ${VBOUT_API_KEY}`
                }
            },
            // Method 4: X-API-Key header
            {
                name: 'X-API-Key Header',
                url: 'https://api.vbout.com/1/user/me',
                headers: {
                    'X-API-Key': VBOUT_API_KEY
                }
            },
            // Method 5: POST with form data
            {
                name: 'POST Form Data',
                method: 'POST',
                url: 'https://api.vbout.com/1/user/me',
                data: `apikey=${VBOUT_API_KEY}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        ];
        
        const results = [];
        
        for (const method of authMethods) {
            try {
                console.log(`Testing: ${method.name}`);
                
                let response;
                if (method.method === 'POST') {
                    response = await axios.post(method.url, method.data, {
                        headers: method.headers,
                        timeout: 10000,
                        validateStatus: (status) => status < 500
                    });
                } else {
                    response = await axios.get(method.url, {
                        headers: method.headers,
                        timeout: 10000,
                        validateStatus: (status) => status < 500
                    });
                }
                
                console.log(`${method.name} - Status: ${response.status}`);
                console.log(`${method.name} - Response:`, response.data);
                
                results.push({
                    method: method.name,
                    status: response.status,
                    success: response.status === 200,
                    response: response.data
                });
                
                // If this method worked, let's test adding a contact
                if (response.status === 200) {
                    console.log(`SUCCESS! ${method.name} worked. Testing contact creation...`);
                    
                    try {
                        let contactResponse;
                        
                        if (method.method === 'POST') {
                            const contactData = `apikey=${VBOUT_API_KEY}&email=test@example.com&phone=1234567890`;
                            contactResponse = await axios.post(
                                'https://api.vbout.com/1/emailmarketing/addcontact',
                                contactData,
                                {
                                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                    timeout: 10000,
                                    validateStatus: (status) => status < 500
                                }
                            );
                        } else if (method.headers) {
                            contactResponse = await axios.post(
                                'https://api.vbout.com/1/emailmarketing/addcontact',
                                { email: 'test@example.com', phone: '1234567890' },
                                {
                                    headers: { ...method.headers, 'Content-Type': 'application/json' },
                                    timeout: 10000,
                                    validateStatus: (status) => status < 500
                                }
                            );
                        } else {
                            const contactUrl = method.url.replace('/user/me', '/emailmarketing/addcontact') + '&email=test@example.com&phone=1234567890';
                            contactResponse = await axios.get(contactUrl, {
                                timeout: 10000,
                                validateStatus: (status) => status < 500
                            });
                        }
                        
                        console.log(`Contact creation test - Status: ${contactResponse.status}`);
                        console.log(`Contact creation test - Response:`, contactResponse.data);
                        
                        results.push({
                            method: `${method.name} - Contact Creation`,
                            status: contactResponse.status,
                            success: contactResponse.status === 200,
                            response: contactResponse.data
                        });
                        
                    } catch (contactError) {
                        console.log(`Contact creation failed:`, contactError.response?.data || contactError.message);
                    }
                    
                    break; // Stop testing once we find a working method
                }
                
            } catch (error) {
                console.log(`${method.name} failed:`, error.response?.data || error.message);
                results.push({
                    method: method.name,
                    status: error.response?.status || 0,
                    success: false,
                    error: error.response?.data || error.message
                });
            }
        }
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                test_completed: true,
                api_key_length: VBOUT_API_KEY.length,
                results: results,
                working_methods: results.filter(r => r.success)
            }, null, 2)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                details: 'Failed to run authentication tests'
            })
        };
    }
};
