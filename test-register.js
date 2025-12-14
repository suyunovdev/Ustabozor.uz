// Test registration API
const testRegister = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                surname: 'User',
                email: 'test' + Date.now() + '@example.com',
                phone: '901234567',
                password: 'test123',
                role: 'CUSTOMER'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
};

testRegister();
