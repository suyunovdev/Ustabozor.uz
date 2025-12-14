// Test get all users
const testGetUsers = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/users');
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Users count:', data.length);
        data.forEach(u => console.log(`- ${u.email} (${u.role})`));
    } catch (error) {
        console.error('Error:', error);
    }
};

testGetUsers();
