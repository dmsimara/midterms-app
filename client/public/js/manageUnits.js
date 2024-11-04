let subMenu = document.getElementById("subMenu");

function toggleMenu() {
    subMenu.classList.toggle("open-menu");
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logoutButton");

    logoutButton.addEventListener("click", async () => {
        const isConfirmed = confirm("Are you sure you want to log out?");
        
        if (!isConfirmed) {
            return;
        }
        
        try {
            const response = await fetch("/api/auth/adminLogout", {
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

function deleteUnit(roomId) {
    const confirmation = confirm("Are you sure you want to delete this room?");
    if (confirmation) {
        fetch(`/api/auth/deleteUnit/${roomId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                alert('Room successfully deleted');
                location.reload(); 
            } else {
                alert('Error deleting room');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the room.');
        });
    } else {
        alert('Deletion canceled.');
    }
}