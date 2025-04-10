document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Initialize camera
    const cameraView = document.getElementById('camera-view');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    let stream = null;

    // Start camera when camera tab is clicked
    document.querySelector('[data-tab="camera"]').addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraView.srcObject = stream;
        } catch (err) {
            console.error("Camera error: ", err);
            alert("Could not access the camera. Please check permissions.");
        }
    });

    // Stop camera when switching tabs
    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') !== 'camera') {
            btn.addEventListener('click', function() {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    cameraView.srcObject = null;
                    stream = null;
                }
            });
        }
    });

    // Capture image from camera
    captureBtn.addEventListener('click', function() {
        const context = cameraCanvas.getContext('2d');
        cameraCanvas.width = cameraView.videoWidth;
        cameraCanvas.height = cameraView.videoHeight;
        context.drawImage(cameraView, 0, 0, cameraCanvas.width, cameraCanvas.height);
    });

    // Upload form submission
    document.getElementById('upload-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('file-upload');
        const prompt = document.getElementById('upload-prompt').value;
        const resultDiv = document.getElementById('upload-result');
        
        if (!fileInput.files.length) {
            alert('Please select an image file');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('prompt', prompt);

        try {
            resultDiv.innerHTML = '<p>Generating avatar... Please wait.</p>';
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                resultDiv.innerHTML = `
                    <p>Avatar generated successfully!</p>
                    <img src="${data.image_url}" alt="Generated Avatar">
                    <a href="${data.image_url}" download>Download Image</a>
                `;
            } else {
                resultDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
            }
        } catch (err) {
            console.error('Upload error:', err);
            resultDiv.innerHTML = '<p class="error">An error occurred while generating the avatar</p>';
        }
    });

    // Prompt form submission
    document.getElementById('prompt-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const prompt = document.getElementById('text-prompt').value;
        const resultDiv = document.getElementById('prompt-result');
        
        if (!prompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        try {
            resultDiv.innerHTML = '<p>Generating avatar... Please wait.</p>';
            
            const response = await fetch('/generate-from-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                resultDiv.innerHTML = `
                    <p>Avatar generated successfully!</p>
                    <img src="${data.image_url}" alt="Generated Avatar">
                    <a href="${data.image_url}" download>Download Image</a>
                `;
            } else {
                resultDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
            }
        } catch (err) {
            console.error('Prompt error:', err);
            resultDiv.innerHTML = '<p class="error">An error occurred while generating the avatar</p>';
        }
    });

    // Camera form submission
    document.getElementById('camera-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const prompt = document.getElementById('camera-prompt').value;
        const resultDiv = document.getElementById('camera-result');
        
        if (!cameraCanvas.toDataURL().includes('image/png')) {
            alert('Please capture an image first');
            return;
        }

        try {
            resultDiv.innerHTML = '<p>Generating avatar... Please wait.</p>';
            
            // Convert canvas to blob
            cameraCanvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('file', blob, 'capture.jpg');
                formData.append('prompt', prompt);
                
                const response = await fetch('/capture', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = `
                        <p>Avatar generated successfully!</p>
                        <img src="${data.image_url}" alt="Generated Avatar">
                        <a href="${data.image_url}" download>Download Image</a>
                    `;
                } else {
                    resultDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
                }
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error('Camera error:', err);
            resultDiv.innerHTML = '<p class="error">An error occurred while generating the avatar</p>';
        }
    });
});