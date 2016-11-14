from flask import Flask
from flask import render_template, send_file, url_for, abort
from flask.ext.pymongo import PyMongo
from flask import request, jsonify
from datetime import datetime
import random
import string
import json
import bson
import os
from bson.json_util import dumps
from flask import redirect


app = Flask(__name__)
mongo = PyMongo(app)


@app.route('/', methods=['GET'])
@app.route('/<string:uid>', methods=['GET'])
def root(uid=None):
    if request.method == 'GET':
        return render_template("index.html")


@app.route('/save_curl', methods=['POST'])
def save(uid=None):
    data = request.get_json()
    if data['uid'] == None:
        data['uid'] = ''.join(random.choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for _ in range(16))
        mongo.db.savedCurls.insert_one(data)
    else:
        mongo.db.savedCurls.replace_one({'uid': uid}, data)
    return json.dumps({'uid': data.get('uid')})


@app.route('/retrieve_curl/<string:uid>', methods=['POST'])
def retrieve(uid):
    if request.method == 'POST':
        curl = mongo.db.savedCurls.find_one({"uid": uid})
        if curl is not None:
            return bson.json_util.dumps(curl)
        else:
            return json.dumps({'error': 'The unique ID in the URL doesn\'t match any saved cURL commands.'})

port = int(os.environ.get("PORT", 5000))
app.run(debug=True, host='0.0.0.0', port=port)
