async function testUpdateUser() {
    const userId = 'w1'; // Alisher
    const updateData = {
        name: 'Alisher Updated',
        surname: 'Karimov Updated',
        hourlyRate: 55000
    };

    console.log('Testing update for user:', userId);
    console.log('Data to update:', updateData);

    try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const updatedUser = await response.json();
            console.log('Update successful!');
            console.log('Updated User:', updatedUser);
        } else {
            console.error('Update failed with status:', response.status);
            const text = await response.text();
            console.error('Response:', text);
        }
    } catch (error) {
        console.error('Error calling API:', error);
    }
}

testUpdateUser();
