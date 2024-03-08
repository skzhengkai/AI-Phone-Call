let totalCallsChart;
let totalMessagesChart;
let averageCallDurationChart;

async function fetchCalls(searchTerm = '') {
  try {
    const response = await fetch('/calls');
    let calls = await response.json();

    // Filter calls based on the search term
    if (searchTerm) {
      calls = calls.filter(call => call.callSid.includes(searchTerm));
    }

    renderCalls(calls);
    return calls; // Return the calls data for further processing
  } catch (error) {
    console.error('Error fetching calls:', error);
    return []; // Return an empty array in case of an error
  }
}

function renderCalls(calls) {
  const list = document.getElementById('calls-list');
  const existingCallRows = list.querySelectorAll('.call-row');
  existingCallRows.forEach(row => row.remove());
  
  calls.sort((a, b) => new Date(b.startTimestamp) - new Date(a.startTimestamp)); // Sort by date descending

  calls.forEach(call => {
    const startTime = new Date(call.startTimestamp);
    const endTime = new Date(call.endTimestamp);
    const duration = (endTime - startTime) / 1000; // Duration in seconds
    let durationFormatted;

    if (duration) {
      durationFormatted = formatDuration(duration);
    } else {
      durationFormatted = "Ongoing";
    }
    
    const row = document.createElement('div');
    row.className = 'call-row';
    row.innerHTML = `
      <div>${call.callSid.substring(0, 5)}... <span class="copy-icon">📋</span></div>
      <div>${formatDate(startTime)}</div>
      <div>John Doe</div>
      <div class="status-indicator ${call.isActive ? 'active' : 'ended'}">${call.isActive ? 'Active' : 'Ended'}</div>
      <div>${durationFormatted}</div>
    `;
    list.appendChild(row);
  });
}

// Helper function to format duration
function formatDuration(duration) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to format date to 'Apr 11, 4:39pm PST'
function formatDate(date) {
  const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short' };
  return date.toLocaleString('en-US', options);
}

function viewCallDetails(call) {
  // Clear the list
  const list = document.getElementById('calls-list');
  list.innerHTML = '';

  // Display each message in the call
  call.messages.forEach(message => {
    const msgElement = document.createElement('div');
    msgElement.textContent = `${message.role}: ${message.content}`;
    list.appendChild(msgElement);
  });
}

// Show modal with call details
function showModal(call) {
  const modal = document.getElementById('call-details-modal');
  const details = document.getElementById('call-details');
  const closeButton = document.querySelector('.close-button');

  // Populate modal with call details
  details.innerHTML = '';
  call.messages.forEach(message => {
    const msgElement = document.createElement('div');
    msgElement.innerHTML = `<strong>${message.role}:</strong> ${message.content}`;
    details.appendChild(msgElement);
  });

  // Show the modal
  modal.style.display = 'block';

  // Close the modal
  closeButton.onclick = () => {
    modal.style.display = 'none';
  };
}

// Close modal if clicked outside of it
window.onclick = event => {
  const modal = document.getElementById('call-details-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

// public/scripts/dashboard.js - Add this function
async function fetchStats() {
  try {
    const response = await fetch('/stats');
    const stats = await response.json();

    document.getElementById('total-calls').textContent = stats.totalCalls;
    document.getElementById('total-messages').textContent = stats.totalMessages;
    document.getElementById('average-call-duration').textContent = stats.averageCallDuration;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Function to render the total calls over time bar chart
function renderTotalCallsChart(calls) {
  const ctx = document.getElementById('total-calls-chart').getContext('2d');
  const callsPerDay = getCallsPerDay(calls);

  // Check if the chart instance already exists
  if (totalCallsChart) {
    // Update the chart data
    totalCallsChart.data.labels = Object.keys(callsPerDay);
    totalCallsChart.data.datasets[0].data = Object.values(callsPerDay);
    totalCallsChart.update();
  } else {
    // Create the chart instance if it doesn't exist
    // For the total calls chart
    totalCallsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(callsPerDay),
        datasets: [{
          label: 'Total Calls',
          data: Object.values(callsPerDay),
          backgroundColor: 'rgba(32, 201, 151, 0.5)',
          borderColor: 'rgba(32, 201, 151, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true, // Make sure the chart is responsive
        maintainAspectRatio: true, // Allow the chart to compress vertically
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Total Calls Over Time'
          }
        }
      }
    });
  }
}

// Function to calculate calls per day from the calls data
function getCallsPerDay(calls) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let callsPerDay = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});

  calls.forEach(call => {
    const day = daysOfWeek[new Date(call.startTimestamp).getDay()];
    callsPerDay[day]++;
  });

  return callsPerDay;
}

// Function to render the total messages over time bar chart
function renderTotalMessagesChart(calls) {
  const ctx = document.getElementById('total-messages-chart').getContext('2d');
  const messagesPerDay = getMessagesPerDay(calls);

  // Check if the chart instance already exists
  if (totalMessagesChart) {
    // Update the chart data
    totalMessagesChart.data.labels = Object.keys(messagesPerDay);
    totalMessagesChart.data.datasets[0].data = Object.values(messagesPerDay);
    totalMessagesChart.update();
  } else {
    totalMessagesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(messagesPerDay),
      datasets: [{
        label: 'Total Messages',
        data: Object.values(messagesPerDay),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Total Messages Over Time'
        }
      }
    }
  });
  }
}

// Function to calculate messages per day from the calls data
function getMessagesPerDay(calls) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let messagesPerDay = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});

  calls.forEach(call => {
    const day = daysOfWeek[new Date(call.startTimestamp).getDay()];
    messagesPerDay[day] += call.messages.length; // Assuming call.messages is an array of messages
  });

  return messagesPerDay;
}

// Function to render the call duration pie chart
function renderCallDurationChart(calls) {
  const ctx = document.getElementById('call-duration-chart').getContext('2d');
  const callDurationData = getCallDurationData(calls);

  if (averageCallDurationChart) {
    // Update the chart data
    averageCallDurationChart.data.datasets[0].data = callDurationData;
    averageCallDurationChart.update();
  } else {
    averageCallDurationChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['0-5 minutes', '5-10 minutes', '10-20 minutes', '20+ minutes'],
      datasets: [{
        label: 'Call Duration',
        data: callDurationData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)'
        ],
        borderColor: [
          'rgba(255,99,132,1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Call Duration Distribution'
        }
      }
    }
  });
  }
}

// Function to calculate call duration data for the pie chart
function getCallDurationData(calls) {
  // Initialize counters for each duration range
  let durationCounts = [0, 0, 0, 0]; // Corresponds to the labels in the pie chart

  calls.forEach(call => {
    if (call.endTimestamp) {
      const durationMinutes = (new Date(call.endTimestamp) - new Date(call.startTimestamp)) / (1000 * 60);
      if (durationMinutes <= 5) {
        durationCounts[0]++;
      } else if (durationMinutes <= 10) {
        durationCounts[1]++;
      } else if (durationMinutes <= 20) {
        durationCounts[2]++;
      } else {
        durationCounts[3]++;
      }
    }
  });

  return durationCounts;
}

// Modify setupSearch function to handle search input
function setupSearch() {
  const searchInput = document.getElementById('search-input');

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    fetchCalls().then(calls => {
      const filteredCalls = calls.filter(call => call.callSid.toLowerCase().includes(searchTerm));
      renderCalls(filteredCalls);
    });
  });
}

// Modify the existing window.onload or document.addEventListener("DOMContentLoaded", ...)
window.onload = () => {
  setupSearch();

  // Function to fetch calls and stats
  const fetchAndUpdateUI = () => {
    fetchCalls().then(calls => {
      fetchStats(); // Fetch stats
      renderTotalCallsChart(calls);
      renderTotalMessagesChart(calls);
      renderCallDurationChart(calls);
    }).catch(error => {
      console.error('Error processing calls data:', error);
    });
  };

  // Initial fetch and UI update
  fetchAndUpdateUI();

  // Set interval to fetch and update UI every 2 seconds
  setInterval(fetchAndUpdateUI, 2000);
};