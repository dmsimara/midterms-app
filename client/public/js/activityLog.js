let subMenu = document.getElementById("subMenu");

function toggleMenu() {
    if (subMenu) {
        subMenu.classList.toggle("open-menu");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('#logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const confirmLogout = confirm('Are you sure you want to log out?');
            if (!confirmLogout) {
                return; 
            }

            try {
                const response = await fetch('/api/auth/adminLogout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (response.ok) {
                    console.log('Logout successful');
                    window.location.href = '/'; 
                } else {
                    const errorData = await response.json();
                    console.error('Logout failed:', errorData.message);
                    alert('Failed to logout. Please try again.');
                }
            } catch (error) {
                console.error('Error during logout:', error);
                alert('An error occurred. Please try again later.');
            }
        });
    } else {
        console.error('Logout button not found on the page.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('Current URL:', window.location.href);

    const pathParts = window.location.pathname.split('/');
    const adminId = pathParts[pathParts.length - 1];

    console.log('Extracted adminId:', adminId); 

    if (adminId && adminId !== 'activity-log') {
        fetchActivities(adminId); 
    } else {
        console.error('Admin ID not found or URL is malformed.');
    }
});

const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp); 

    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,  
    };

    return date.toLocaleString('en-US', options);  
};

let currentPage = 1;
let totalPages = 1;

const fetchActivities = async (adminId, page = 1) => {
    try {
        const response = await fetch(`/api/auth/activity-log/${adminId}?page=${page}`);
        const data = await response.json();

        console.log('Fetched activity log:', data); 

        if (data.success) {
            totalPages = data.totalPages;
            renderActivities(data.activities);
            renderPagination();
        } else {
            console.log('No activities found.');
        }
    } catch (error) {
        console.error('Error fetching activity log:', error);
    }
};

const renderActivities = (activities) => {
    const activitiesTableBody = document.querySelector('#activitiesTableBody'); 
    activitiesTableBody.innerHTML = '';

    if (activities.length === 0) {
        activitiesTableBody.innerHTML = '<tr><td colspan="3">No activities found.</td></tr>';
        return;
    }

    activities.forEach(activity => {
        const row = document.createElement('tr');

        const actionTypeCell = document.createElement('td');
        actionTypeCell.textContent = activity.actionType;
        row.appendChild(actionTypeCell);

        const actionDetailsCell = document.createElement('td');
        actionDetailsCell.textContent = activity.actionDetails;
        row.appendChild(actionDetailsCell);

        const timestampCell = document.createElement('td');
        timestampCell.textContent = formatTimestamp(activity.timestamp);  
        row.appendChild(timestampCell);

        activitiesTableBody.appendChild(row);
    });
};

const renderPagination = () => {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => changePage(currentPage - 1));
        paginationContainer.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage;
            pageButton.addEventListener('click', () => changePage(i));
            paginationContainer.appendChild(pageButton);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => changePage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }
};

const changePage = (page) => {
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    const adminId = window.location.pathname.split('/').pop();
    fetchActivities(adminId, page);
};

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname; 

    const pathToButtonId = {
        '/admin/settings/feedback-support': 'feedback-link',
        '/admin/settings/password-reset': 'password-link',
        '/admin/settings/delete-account': 'delete-link',
        '/admin/settings/activity-log': 'activity-link',
        '/admin/settings': 'appearance-link',
    };

    const activeButtonId = Object.keys(pathToButtonId).find(path => currentPath.startsWith(path));
    if (!activeButtonId && currentPath.startsWith('/admin/settings/delete-account')) {
        const activeLink = document.getElementById('delete-link');
        activeLink?.querySelector('.pages-link').classList.add('active');
    } else if (activeButtonId) {
        const activeLink = document.getElementById(pathToButtonId[activeButtonId]);
        activeLink?.querySelector('.pages-link').classList.add('active');
    }
});
