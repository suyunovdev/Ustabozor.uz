const fs = require('fs');

async function testUpload() {
    const userId = 'w1';

    // Create a dummy file
    fs.writeFileSync('test-image.txt', 'This is a test image content');

    const formData = new FormData();
    formData.append('name', 'Alisher Upload Test');

    // Read file and append
    const fileContent = fs.readFileSync('test-image.txt');
    const blob = new Blob([fileContent], { type: 'text/plain' });
    formData.append('avatar', blob, 'test-image.txt');

    console.log('Testing upload for user:', userId);

    try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            const updatedUser = await response.json();
            console.log('Upload successful!');
            console.log('Updated User Avatar:', updatedUser.avatar);
        } else {
            console.error('Upload failed with status:', response.status);
            const text = await response.text();
            console.error('Response:', text);
        }
    } catch (error) {
        console.error('Error calling API:', error);
    }
}

testUpload();
