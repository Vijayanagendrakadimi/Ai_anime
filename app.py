import os
import requests
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
API_URL = "https://api.stability.ai/v2beta/stable-image/generate/core"
API_KEY = os.getenv('STABILITY_API_KEY')

if not API_KEY:
    raise ValueError("STABILITY_API_KEY not found in environment variables")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_ai_image(prompt, image_file=None):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "image/*"
    }

    files = {}
    data = {
        "output_format": "jpeg",
    }

    if image_file:
        files['image'] = (image_file.filename, image_file.stream, image_file.mimetype)
        data['mode'] = "image-to-image"
    else:
        data['mode'] = "text-to-image"

    if prompt:
        data['prompt'] = prompt
    else:
        data['prompt'] = "A beautiful scenery"

    try:
        response = requests.post(API_URL, headers=headers, data=data, files=files if files else None)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    prompt = request.form.get('prompt', '')
    file = request.files.get('file', None)

    if file and file.filename != '':
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        # Image-to-Image generation
        ai_image = generate_ai_image(prompt=prompt, image_file=file)
        filename = secure_filename(f"generated_{file.filename}")
    else:
        # Text-to-Image generation
        if not prompt:
            return jsonify({'error': 'Prompt is required if no image is uploaded'}), 400
        ai_image = generate_ai_image(prompt=prompt)
        filename = secure_filename(f"generated_prompt_image.jpg")

    if not ai_image:
        return jsonify({'error': 'Failed to generate image'}), 500

    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(save_path, 'wb') as f:
        f.write(ai_image)

    return jsonify({
        'message': 'Image generated successfully',
        'image_url': f"/uploads/{filename}"
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == "__main__":
    app.run(debug=True)
