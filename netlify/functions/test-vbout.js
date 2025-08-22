const axios = require('axios');

exports.handler = async (event, context) => {
    // Test endpoint for VBout API
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const VBOUT_API_KEY = process.env.VBOUT_API_KEY;
        
        console.log('Testing VBout API with key:', VBOUT_API_KEY ? 'Key provided' : 'No key');
        
        // Test 1: Try to get account info (simpler API call)
        const params1 = new URLSearchParams();
        params1.append('apikey', VBOUT_API_KEY);
        
        console.log('Trying VBout account info API...');
        
        try {
            const accountResponse = await axios.post(
                'https://api.vbout.com/1/user/me',
                params1,
                {
                    headers: { 
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );
            
            console.log('Account API Response:', accountResponse.data);
            
        } catch (accountError) {
            console.log('Account API Error:', accountError.response?.data || accountError.message);
        }
        
        // Test 2: Try different parameter name variations
        const testVariations = [
            { key: 'apikey', value: VBOUT_API_KEY },
            { key: 'api_key', value: VBOUT_API_KEY },
            { key: 'key', value: VBOUT_API_KEY },
            { key: 'token', value: VBOUT_API_KEY }
        ];
        
        for (const variation of testVariations) {
            try {
                console.log(`Testing with parameter: ${variation.key}`);
                
                const params = new URLSearchParams();
                params.append(variation.key, variation.value);
                params.append('email', 'test@example.com');
                
                const response = await axios.post(
                    'https://api.vbout.com/1/emailmarketing/addcontact',
                    params,
                    {
                        headers: { 
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        timeout: 10000
                    }
                );
                
                console.log(`Success with ${variation.key}:`, response.data);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        working_parameter: variation.key,
                        response: response.data
                    })
                };
                
            } catch (error) {
                console.log(`Failed with ${variation.key}:`, error.response?.data || error.message);
            }
        }
        
        // Test 3: Try GET method instead of POST
        try {
            console.log('Trying GET method...');
            const getResponse = await axios.get(
                `https://api.vbout.com/1/emailmarketing/addcontact?apikey=${VBOUT_API_KEY}&email=test@example.com`,
                { timeout: 10000 }
            );
            
            console.log('GET method response:', getResponse.data);
            
        } catch (getError) {
            console.log('GET method error:', getError.response?.data || getError.message);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: false,
                message: 'All tests failed - check logs for details',
                api_key_provided: !!VBOUT_API_KEY,
                api_key_length: VBOUT_API_KEY ? VBOUT_API_KEY.length : 0
            })
        };
        
    } catch (error) {
        console.error('Test function error:', error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Test function failed',
                details: error.message
            })
        };
    }
};
