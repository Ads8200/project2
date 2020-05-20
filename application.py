import os
import json

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


@app.route("/updateChannels", methods=["POST"])
def updateChannels():
    newChannel = request.form.get("newChannel")

    if newChannel == None or newChannel == 'null':
        if len(channels) > 0:
            return jsonify({'success': True, 'channelAdded': False, 'message': 'success', 'channels': channels})
        else:
            return jsonify({'success': False, 'channelAdded': False, 'message': 'No active channels'})
    else:   
        # If new channel exists, return existing list of channels and error message
        if newChannel in channels.keys():
            return jsonify({'success': True, 'channelAdded': False, 'message': 'Channel already exists', 'channels': channels})
        else:
            # Initialise a new list item for new channel
            channels[newChannel] = []
            return jsonify({'success': True, 'channelAdded': True, 'message': 'success', 'channels': channels})


@app.route("/dataUpdate", methods=["POST"])
def dataUpdate():
    channel = request.form.get("channel")
    if channel in channels.keys():
        return jsonify({'success': True, 'message': 'success', 'chatHistory': channels[channel]})
    else:
        return jsonify({'success': False, 'message': 'Error obtaining chat history'})


@socketio.on("submit chat")
def chat(data):
    chat = data["chat"]
    username = data['username']
    channel = data['activeChannel']

    # Update dictionary
    channels[channel].append({'username':username, 'chat':chat})
    if len(channels[channel]) > 100:
        channels[channel].pop(0)

    emit("announce chat", {"chat": chat, "username": data["username"], "activeChannel": data["activeChannel"]}, broadcast=True)

@socketio.on("submit new channel")
def submitNewChannel(data):
    newChannel = data['newChannel']
    emit("announce channel", {"newChannel": newChannel}, broadcast=True)
