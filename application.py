import os

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Variable to store channels
channels = dict()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/addChannel", methods=["POST"])
def addChannel():
    channel = request.form.get("channel")
    
    # Return error if channel already exists
    if channel in channels.keys():
        return jsonify({'success': False, 'message': 'Channel already exists'})
    else:
        channels[channel] = []
        return jsonify({'success': True, 'message': 'success', 'channels': channels})


@app.route("/updateChannels", methods=["POST"])
def updateChannels():
    if len(channels) > 0:
        return jsonify({'success': True, 'message': 'success', 'channels': channels})
    else:
        return jsonify({'success': False, 'message': 'No active channels'})


@socketio.on("submit chat")
def chat(data):
    chat = data["chat"]
    username = data['username']
    channel = data['activeChannel']

    # Update dictionary
    channels[channel].append({'username':username, 'chat':chat})

    emit("announce chat", {"chat": chat, "username": data["username"], "activeChannel": data["activeChannel"]}, broadcast=True)
