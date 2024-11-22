// Select elements
const editInfoButton = document.querySelector('.edit-info-btn'); // The "Edit Info" button
const editModal = document.getElementById('editModal'); // The modal
const closeButton = document.querySelector('.close-modal'); // Close button in modal
const editForm = document.getElementById('editForm'); // The form in the modal

// Show the modal when "Edit Info" is clicked
editInfoButton.addEventListener('click', () => {
    editModal.classList.remove('hidden');
});

// Close the modal when "×" is clicked
closeButton.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

// Handle form submission
editForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form behavior

    // Collect updated form data
    const updatedData = {
        tenantId: document.getElementById('tenantId').value,
        name: document.getElementById('tenantName').value,
        contact: document.getElementById('tenantContact').value,
        email: document.getElementById('tenantEmail').value,
    };

    try {
        // Send data to backend
        const response = await fetch('/updateTenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });

        if (response.ok) {
            alert('Tenant info updated successfully!');
            editModal.classList.add('hidden'); // Close modal
        } else {
            alert('Failed to update tenant info.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});

// Logout button functionality
document.querySelector('.logout-button').addEventListener('click', () => {
    fetch('/logout', { method: 'GET' }) // Call backend logout endpoint
        .then(() => {
            sessionStorage.clear(); // Clear any client-side storage
            window.location.href = '/login'; // Redirect to login page
        });
});

// Modal functionality (optional)
const modal = document.getElementById('editModal');
const closeModalButton = document.querySelector('.close-modal');

closeModalButton.addEventListener('click', () => {
    modal.classList.add('hidden');
});

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logoutButton");

    logoutButton.addEventListener("click", async () => {
        const isConfirmed = confirm("Are you sure you want to log out?");
        
        if (!isConfirmed) {
            return;
        }
        
        try {
            const response = await fetch("/api/auth/tenantLogout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message); 
                window.location.href = "/"; 
            } else {
                alert(data.message || "Logout failed. Please try again.");
            }
        } catch (error) {
            alert("An error occurred during logout. Please try again later.");
            console.error("Error:", error);
        }
    });
});