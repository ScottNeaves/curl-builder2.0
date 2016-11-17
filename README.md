# curl-builder
Builds curl commands in the browser!

### Stack
* Backend: python3, Flask, MongoDB
* Frontend: knockoutJS, bootstrap

###Install and run:
* Clone the project from GitHub to your local machine.
* In project directory: `pyvenv .env`, `. .env/bin/activate`, `pip install -r requirements.txt`
* Navigate to `/static`, run `bower install`, `npm install`
* Install mongoDB, run `mongod` at the terminal
* Add `export MONGODB_URI=mongodb://localhost:27017/app` to your `~/.bash_profile` file or wherever you like to set environment variables
* `python app.py`
