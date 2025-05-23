// This script can be included in the HTML page to add debugging to the upload functionality

(function() {
  // Monitor XMLHttpRequest to debug network requests
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    console.log(`XHR Request: ${this._method || 'GET'} ${this._url}`);
    console.log('Request body:', body);
    
    this.addEventListener('loadend', function() {
      console.log(`XHR Response: ${this.status} ${this._url}`);
      if (this.status >= 200 && this.status < 300) {
        console.log('Response data:', this.responseText);
      } else {
        console.error('Response error:', this.responseText);
      }
    });
    
    return originalXhrSend.apply(this, arguments);
  };
  
  // Patch fetch API for debugging
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    console.log(`Fetch Request: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      console.log('Request body:', options.body);
    }
    
    return originalFetch.apply(this, arguments)
      .then(response => {
        console.log(`Fetch Response: ${response.status} ${url}`);
        // Clone response so we can read it and still pass it on
        const clonedResponse = response.clone();
        
        // Try to read and log the response body
        clonedResponse.text().then(text => {
          if (response.status >= 200 && response.status < 300) {
            console.log('Response data:', text);
          } else {
            console.error('Response error:', text);
          }
        }).catch(err => {
          console.error('Error reading response:', err);
        });
        
        return response;
      })
      .catch(error => {
        console.error('Fetch error:', error);
        throw error;
      });
  };
  
  // Debug form submissions
  document.addEventListener('DOMContentLoaded', function() {
    // Find and add debug logging to the upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      console.log('Debug: Found upload form, adding event listener');
      
      // Override the form submission
      uploadForm.addEventListener('submit', function(event) {
        console.log('Upload form submitted');
        
        // Check if it has files
        const fileInput = document.getElementById('csvFile');
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          console.log(`File selected: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
        } else {
          console.warn('No file selected for upload');
        }
        
        // Don't interfere with the normal handler
      }, true); // Use capturing phase to log before the main handler
    } else {
      console.warn('Debug: Upload form not found on initial load');
      
      // Check for the form again after a short delay in case it's added dynamically
      setTimeout(function() {
        const delayedUploadForm = document.getElementById('uploadForm');
        if (delayedUploadForm) {
          console.log('Debug: Found upload form after delay');
        } else {
          console.warn('Debug: Upload form not found even after delay');
        }
      }, 1000);
    }
  });
  
  // Debug handleFileUpload function calls
  if (window.handleFileUpload) {
    const originalHandleFileUpload = window.handleFileUpload;
    window.handleFileUpload = function(event) {
      console.log('Debug: handleFileUpload called', event);
      return originalHandleFileUpload.apply(this, arguments);
    };
    console.log('Debug: Patched handleFileUpload function');
  } else {
    console.warn('Debug: handleFileUpload function not found in global scope');
    
    // Try to find it when it becomes available
    let attempts = 0;
    const checkInterval = setInterval(function() {
      if (window.handleFileUpload) {
        const originalHandleFileUpload = window.handleFileUpload;
        window.handleFileUpload = function(event) {
          console.log('Debug: handleFileUpload called', event);
          return originalHandleFileUpload.apply(this, arguments);
        };
        console.log('Debug: Patched handleFileUpload function');
        clearInterval(checkInterval);
      } else if (++attempts > 10) {
        console.warn('Debug: handleFileUpload function not found after multiple attempts');
        clearInterval(checkInterval);
      }
    }, 1000);
  }
  
  // Log all JavaScript errors
  window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error?.message);
    console.error('Error details:', event.error?.stack);
  });
  
  console.log('Frontend debugging instrumentation added');
})();