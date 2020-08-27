import json
import hashlib
import os
from flask import Flask, request, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename

from script import process_book

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'txt'}
UPLOAD_FOLDER = './files'


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/sync', methods=['GET'])
def sync():
    filename = secure_filename(request.args.get('id'))
    path = UPLOAD_FOLDER + '/' + filename

    # If exist and readable just return processed file
    if os.path.isfile(path) and os.access(path, os.R_OK):
        with open(path, 'r') as f:
            return Response(f.read(), mimetype='application/json')
    else:
        print('File doenst found')
        return 'File dont found', 400


@app.route('/process', methods=['POST'])
def process():
    # check if the post request has the file part
    if 'file' not in request.files:
        print('Request doesnt contain file')
        return 'Request doesnt contain file', 400

    file = request.files['file']

    # if user does not select file, browser also
    # submit an empty part without filename
    if file.filename == '':
        print('Request doesnt contain file(not selected)')
        return 'Request doesnt contain file(not selected)', 400
    if not file:
        print('Request doesnt contain file(file is not existing)')
        return 'Request doesnt contain file(file is not existing)', 400
    if not allowed_file(file.filename):
        print('This extension doesnt supported(only .txt)')
        return 'This extension doesnt supported(only .txt)', 400

    file_bytes = file.read()  # maybe should run file.seek(0) before
    file_str = file_bytes.decode('utf-8')
    sha = hashlib.sha256(file_bytes).hexdigest()
    filename = secure_filename(file.filename) + '.' + sha
    path = UPLOAD_FOLDER + '/' + filename

    # If exist and readable just return processed file
    if os.path.isfile(path) and os.access(path, os.R_OK):
        with open(path, 'r') as f:
            return Response(f.read(), mimetype='application/json')

    # TODO: run in a side thread
    processed = process_book(file_str)
    processed['id'] = filename
    processed['name'] = file.filename

    res_file = json.dumps(processed)

    with open(path, 'w') as f:
        f.write(res_file)

    return Response(res_file, mimetype='application/json')
