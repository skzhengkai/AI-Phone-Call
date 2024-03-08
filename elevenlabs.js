const axios = require('axios').default;
const fs = require('fs');

// Define the function to make the TTS API call
async function generateTTS(text) {
    const headers = {
        'Authorization': 'Bearer md-xxx'
    };

    const data = {
        "text": text, // Use the text parameter
        "voice_id": "pFZP5JQG7iQjIQuC4Bku" // This is optional
    };

    axios.post("https://api.mandrillai.tech/v1/audio/tts", data, {
        headers: headers,
        responseType: 'arraybuffer' // This ensures that the response data is treated as a binary buffer
    })
    .then((response) => {
        // Save the file
        fs.writeFile("audio/audio.mp3", response.data, (err) => {
            if (err) {
                console.error('Error saving the audio file:', err);
                return false;
            } else {
                console.log('Audio file saved successfully.');
                return true;
            }
        });
    })
    .catch((error) => {
        console.error('Error making the request:', error);
        return false;
    });
}

module.exports = {
  generateTTS
};