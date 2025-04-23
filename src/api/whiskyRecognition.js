import axios from 'axios';

// Update API endpoint to point to backend on port 8888
const API_ENDPOINT = 'http://localhost:8888/api/recognize';

export const recognizeWhiskyLabel = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await axios.post(API_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    // Enhanced error logging for debugging
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Backend responded with error:', error.response.status, error.response.data);
      alert(`Backend error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      alert('No response received from backend.');
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
      alert(`Request setup error: ${error.message}`);
    }
    throw new Error('Failed to process image. Please try again.');
  }
};