const fs = require('fs');
const path = require('path');
const axios = require('axios'); // You may need to install axios: npm install axios
const FormData = require('form-data'); // You may need to install form-data: npm install form-data

// Path to sample CSV data
const csvPath = path.join(__dirname, 'sample-data', 'employees.csv');

async function testUploadAPI() {
  // Check if the file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`File does not exist: ${csvPath}`);
    return;
  }

  try {
    console.log(`Starting upload test with file: ${csvPath}`);

    // Create form data
    const form = new FormData();
    form.append('csvFile', fs.createReadStream(csvPath));

    // Make API request
    const response = await axios.post('http://localhost:3030/api/upload', form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('Upload successful!');
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // Now get the data information
    if (response.data && response.data.dataId) {
      const dataId = response.data.dataId;
      console.log(`\nFetching data for dataId: ${dataId}`);

      const dataResponse = await axios.get(`http://localhost:3030/api/data/${dataId}`);
      console.log('Data response:', JSON.stringify(dataResponse.data, null, 2));

      // Get sample data
      console.log(`\nFetching sample data for dataId: ${dataId}`);
      const sampleResponse = await axios.get(`http://localhost:3030/api/data/${dataId}/sample`);
      console.log('Sample data received. First row:', JSON.stringify(sampleResponse.data.sample[0], null, 2));
    }
  } catch (error) {
    console.error('Error during API test:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Install axios and form-data if not already installed
const { execSync } = require('child_process');

try {
  // Check if axios is installed
  require.resolve('axios');
} catch (e) {
  console.log('Installing axios...');
  execSync('npm install axios', { stdio: 'inherit' });
}

try {
  // Check if form-data is installed
  require.resolve('form-data');
} catch (e) {
  console.log('Installing form-data...');
  execSync('npm install form-data', { stdio: 'inherit' });
}

// Run the test
testUploadAPI();