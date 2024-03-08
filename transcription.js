const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class Transcriber {
    constructor() {
        // You can load environment variables here if needed
        // or perform any setup operations for your transcriber.
    }

    async transcribeAudio(filePath) {
        const formData = new FormData();

        // Append the file and model to the form data
        formData.append('file', fs.createReadStream(filePath));
        formData.append('model', 'whisper-1');

        try {
          const response = await axios.post('https://api.webraft.in/v1/audio/transcriptions', formData, {
            headers: {
              'Authorization': 'Bearer wr-xxx',
              ...formData.getHeaders() // Spread syntax to include headers from form-data
            }
          });

          return response.data;
        } catch (error) {
          console.error('Error transcribing audio:', error);
          throw error;
        }
    }
}

module.exports = Transcriber;
