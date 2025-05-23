/**
 * This is a potential fix for the CSV upload issue.
 * It adds more robust error handling and debugging to the handleFileUpload function.
 */

// Modify the handleFileUpload function to include better debugging and error handling
async function handleFileUpload(event) {
  event.preventDefault();
  console.debug('File upload form submitted');
  
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a CSV file');
    return;
  }
  
  console.debug(`Uploading file: ${file.name}, size: ${file.size} bytes`);
  
  // Show spinner
  const uploadSpinner = document.getElementById('uploadSpinner');
  if (uploadSpinner) {
    uploadSpinner.style.display = 'inline-block';
  } else {
    console.error('Upload spinner element not found!');
  }
  
  const formData = new FormData();
  formData.append('csvFile', file);
  
  try {
    // Log request details for debugging
    console.log('Sending upload request to /api/upload');
    console.log('File being uploaded:', file.name, file.type, file.size);
    
    // Implement timeout and retry logic
    let response;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
        
        response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (fetchError) {
        retries++;
        console.error(`Fetch attempt ${retries} failed:`, fetchError);
        
        if (fetchError.name === 'AbortError') {
          console.error('Request timed out');
        }
        
        if (retries > maxRetries) {
          throw fetchError; // Give up after max retries
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * retries));
      }
    }
    
    // Check for server response
    if (!response) {
      throw new Error('No response received from server');
    }
    
    console.log('Server response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Failed to parse error response as JSON
      }
      throw new Error(errorMessage);
    }
    
    // Parse response carefully
    let result;
    try {
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      
      // Try to parse as JSON
      try {
        result = JSON.parse(text);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Invalid response format from server');
      }
    } catch (textError) {
      console.error('Failed to read response text:', textError);
      throw new Error('Failed to read server response');
    }
    
    // Successfully uploaded and processed
    console.debug('Upload successful, received dataId:', result.dataId);
    
    // Update the URL with the dataId for easier sharing and state recovery
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('data', result.dataId);
      window.history.pushState({dataId: result.dataId}, '', url.toString());
      
      // Store in localStorage for recovery
      localStorage.setItem('currentDataId', result.dataId);
      
      // Load the new dataset
      loadDataset(result.dataId);
      
      // Refresh datasets list
      loadDatasets();
      
      // Reset file input
      fileInput.value = '';
    } catch (stateError) {
      console.error('Error updating application state:', stateError);
      alert('Your file was processed successfully, but there was an error updating the UI. Please refresh the page and try again.');
    }
  } catch (error) {
    console.error('Upload failed:', error);
    alert(`Upload failed: ${error.message}`);
  } finally {
    // Hide spinner
    if (uploadSpinner) {
      uploadSpinner.style.display = 'none';
    }
  }
}

// This function overrides the original handleFileUpload function
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    // Override the original handleFileUpload if it exists
    if (typeof window.handleFileUpload === 'function') {
      console.log('Overriding handleFileUpload function with fixed version');
      window.handleFileUpload = handleFileUpload;
    } else {
      console.warn('Cannot find window.handleFileUpload function to override');
    }
    
    // Additional check for upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      console.log('Adding direct event listener to upload form');
      uploadForm.addEventListener('submit', handleFileUpload);
    }
  }, 1000); // Wait for page to fully load
});