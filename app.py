from flask import Flask
from flask import render_template
from flask.ext.pymongo import PyMongo
from flask import request, jsonify
import random
import string
import os


app = Flask(__name__)
app.config['MONGO_URI'] = os.environ['MONGODB_URI']
mongo = PyMongo(app)


@app.route('/', methods=['GET'])
@app.route('/curl/<string:uid>', methods=['GET'])
def root(uid=None):
    if uid and mongo.db.savedCurls.find_one({"uid": uid}) is None:
        return render_template("error.html")
    else:
        return render_template("index.html")


@app.route('/save_curl', methods=['POST'])
def save():
    data = request.get_json()
    if not data['uid']:
        data['uid'] = ''.join(random.choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for _ in range(16))
        mongo.db.savedCurls.insert_one(data)
    else:
        mongo.db.savedCurls.replace_one({'uid': data['uid']}, data)
    return jsonify({'uid': data.get('uid')})


@app.route('/retrieve_curl/<string:uid>', methods=['GET'])
def retrieve(uid):
    curl = mongo.db.savedCurls.find_one({"uid": uid})
    if curl is not None:
        del curl["_id"]
        return jsonify(curl)
    else:
        return jsonify({'error': 'The unique ID in the URL doesn\'t match any saved cURL commands.'})


if __name__ == '__main__':
    app.run(host='0.0.0.0')
