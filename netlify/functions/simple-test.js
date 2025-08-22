const axios = require('axios');

exports.handler = async (event, context) => {
    try {
        const VBOUT_API_KEY = process.env.VBOUT_API_KEY;
        
        console.log('API Key from environment:', VBOUT_API_KEY ? `${VBOUT_API_KEY.substring(0, 10)}...` : 'NOT SET');
        console.log('API Key length:', VBOUT_API_KEY ? VBOUT_API_KEY.length : 0);
        
        // Test the simplest possible VBout API call
        const testUrl = `https://api.vbout.com/1/user/me?apikey=${VBOUT_API_KEY}`;
        
        console.log('Testing URL:', testUrl.replace(VBOUT_API_KEY, '[REDACTED]'));
        
        const response = await axios.get(testUrl, {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500; // Accept any status under 500 to see the response
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test_result: 'completed',
                api_key_set: !!VBOUT_API_KEY,
                api_key_length: VBOUT_API_KEY ? VBOUT_API_KEY.length : 0,
                response_status: response.status,
                response_data: response.data
            })
        };
        
    } catch (error) {
        console.error('Test error:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test_result: 'failed',
                error: error.message,
                error_response: error.response?.data
            })
        };
    }
};
