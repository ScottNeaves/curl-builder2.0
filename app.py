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
app.config['MONGO_URI'] = 'mongodb://heroku_9gd1s4mj:nslplv4spuj922q5ufb33i1qsk@ds153667.mlab.com:53667/heroku_9gd1s4mj'#os.environ['MONGODB_URI']
mongo = PyMongo(app)


@app.route('/', methods=['GET'])
@app.route('/<string:uid>', methods=['GET'])
def root(uid=None):
    if request.method == 'GET':
        return render_template("index.html")


@app.route('/save_curl', methods=['POST'])
def save():
    data = request.get_json()
    if data['uid'] == None:
        data['uid'] = ''.join(random.choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for _ in range(16))
        mongo.db.savedCurls.insert_one(data)
    else:
        mongo.db.savedCurls.replace_one({'uid': data['uid']}, data)
    return json.dumps({'uid': data.get('uid')})


@app.route('/retrieve_curl/<string:uid>', methods=['POST'])
def retrieve(uid):
    if request.method == 'POST':
        curl = mongo.db.savedCurls.find_one({"uid": uid})
        if curl is not None:
            return bson.json_util.dumps(curl)
        else:
            return json.dumps({'error': 'The unique ID in the URL doesn\'t match any saved cURL commands.'})

app.run()
