import os
import json
import datetime

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


@app.route("/update", methods=['POST'])
def update():
    if len(channels) > 0:
        return jsonify({'success': True, 'message': 'success', 'channels': channels})
    else:
        return jsonify({'success': False, 'message': 'No active channels'})


@socketio.on("submit chat")
def chat(data):
    chat = data["chat"]
    username = data['username']
    channel = data['activeChannel']
    dt = datetime.datetime.fromtimestamp(data['timestamp']/1000)

    # Update dictionary
    channels[channel].append({'username':username, 'chat':chat, 'timestamp': dt})
    if len(channels[channel]) > 100:
        channels[channel].pop(0)

    emit("announce chat", {"chat": chat, "username": data["username"], "activeChannel": data["activeChannel"], "timestamp": dt.strftime("%d-%b (%H:%M:%S)")}, broadcast=True)


@socketio.on("submit new channel")
def submitNewChannel(data):
    newChannel = data['newChannel']
    username = data['username']

    if newChannel == None or newChannel == 'null':
        emit("announce channel", {"newChannel": newChannel, "success": False, "username": username, "message": 'Channel name cannot be null'}, broadcast=True)
    elif newChannel in channels.keys():
        emit("announce channel", {"newChannel": newChannel, "success": False, "username": username, "message": 'Channel already exists'}, broadcast=True)
    else:
        # Initialise a new list item for new channel
        channels[newChannel] = []
        emit("announce channel", {"newChannel": newChannel, "success": True, "username": username, "message": 'Channel added'}, broadcast=True)