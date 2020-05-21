// GLOBAL VARIABLES
var SERVER_DATA;
var DELAY = 200;

document.addEventListener('DOMContentLoaded', () => {
    
    // Check if user has visited site before and provided a username
    if (newUser()) {
        username = getUsername();
        localStorage.setItem('username', username);
        document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>!`;
        getServerUpdate(); // Updates SERVER_DATA global variable
        setTimeout(() => { refreshChannels(); }, DELAY);
    }
    else {
        username = localStorage.getItem('username');
        document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>!`;
        if (!localStorage.getItem('activeChannel') || localStorage.getItem('activeChannel') == 'Select channel...') {
            console.log('No active channel in local storage');
            getServerUpdate() // Updates SERVER_DATA global variable
            setTimeout(() => { refreshChannels(); }, DELAY);
        }
        else {
            console.log(localStorage.getItem('activeChannel'));
            getServerUpdate() // Updates SERVER_DATA global variable
            console.log(SERVER_DATA);
            setTimeout(() => { refreshChannels(localStorage.getItem('activeChannel')); }, DELAY);
            setTimeout(() => { updateChat(); }, DELAY+10);
        }
    }
    
    // By default chat submit and channel form buttons are disabled
    document.querySelector('#chatButton').disabled = true;
    document.querySelector('#channelFormButton').disabled = true;

    document.body.onkeyup = () => {
        if (document.querySelector('#chatTextArea').value.length > 0) {
            document.querySelector('#chatButton').disabled = false;
        }
        else {
            document.querySelector('#chatButton').disabled = true;
        }

        if (document.querySelector('#channelFormText').value.length > 0) {
            document.querySelector('#channelFormButton').disabled = false;
        }
        else {
            document.querySelector('#channelFormButton').disabled = true;
        }
    };

    // 'Enter' key submits message
    var textbox = document.getElementById('chatTextArea');
    textbox.onkeypress = handleChatKeyPress;

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    // When connected, configure buttons
    socket.on('connect', () => {
        // When chat button clicked
        document.querySelector('#chatButton').onclick = () => {
            const timestamp = Date.now();
            const chat = document.querySelector('#chatTextArea').value;
            const elem = document.getElementById('channels');
            const activeChannel = elem.options[elem.selectedIndex].value;
            socket.emit('submit chat', {'username': username, 'activeChannel': activeChannel, 'chat': chat, 'timestamp': timestamp});
            document.querySelector('#chatTextArea').value = '';
            return false;
        };

        document.querySelector('#channelForm').onsubmit = () => {
            const newChannel = document.querySelector('#channelFormText').value;
            document.querySelector('#channelFormText').value = '';
            socket.emit('submit new channel', {'newChannel': newChannel, 'username': username});
            return false;
        };
    });

    // When a new message is broadcast by server
    socket.on('announce chat', data => {
        if(document.querySelector('#channels').value == data.activeChannel) {
            const p1 = document.createElement('p');
            const p2 = document.createElement('p');
            if (data.username == username) {
                p1.innerHTML = `${data.timestamp}`;
                p2.innerHTML = `${data.chat}`;
                p1.className = 'myMessageTime';
                p2.className = 'myMessage';
            }
            else {
                p1.innerHTML = `<b>${data.username}</b> on ${data.timestamp}`;
                p2.innerHTML = `${data.chat}`;
                p1.className = 'otherMessageTime';
                p2.className = 'otherMessage';
            }
            document.querySelector('#main').append(p1);
            document.querySelector('#main').append(p2);
        };
    });

    socket.on('announce channel', data => {
        if (data.success) {
            getServerUpdate() // Updates SERVER_DATA global variable
            // For user who created new channel, switch to that channel
            if (data.username == username) {
                setTimeout(() => { refreshChannels(data.newChannel); }, DELAY);
                setTimeout(() => { updateChat(); }, DELAY+10);
                document.querySelector('#channelMessage').innerHTML = `${data.newChannel} channel added.`;
                setTimeout(() => { document.querySelector('#channelMessage').innerHTML = "" }, 3000);
            }
            // For all other users remain on current channel, but update list
            else {
                setTimeout(() => { refreshChannels(document.querySelector('#channels').value); }, DELAY);
                document.querySelector('#channelMessage').innerHTML = `${data.username} added ${data.newChannel} channel.`;
                setTimeout(() => { document.querySelector('#channelMessage').innerHTML = "" }, 3000);
            }
        }
        else if (!data.success && data.username == username) {
            document.querySelector('#channelMessage').innerHTML = data.message;
        }
    });

    document.querySelector('#channels').onchange = () => {
        getServerUpdate(); // Updates SERVER_DATA global variable
        setTimeout(() => { refreshChannels(document.querySelector('#channels').value); }, DELAY);
        setTimeout(() => { updateChat(); }, DELAY+10);
        return false;
    };

    document.querySelector('#signout').onclick = () => {
        signout();
        return false;
    };

    window.addEventListener("beforeunload", function(e){
        localStorage.setItem('activeChannel', document.querySelector('#channels').value);
     }, false);
});


// ------------- //
//   FUNCTIONS   //
// ------------- //

function newUser() {
    if (!localStorage.getItem("username")) {
        return true;
    }
    else if (localStorage.getItem("username") == null || localStorage.getItem("username") == "") {
        return true;
    }
    else {
        return false;
    }
};


function getUsername() {
    do {
        var username = prompt("What's your name?");
    }
    while (username == null || username == "");

    return username;
};


function getServerUpdate() {
    const request = new XMLHttpRequest();
    request.open('POST', '/update');
    request.send();

    request.onload = () => {
        SERVER_DATA = JSON.parse(request.responseText);
        console.log(SERVER_DATA);
        console.log(SERVER_DATA.success);
        return false;
    }
    
};

function refreshChannels(activeChannel = null) {
    
    // Empty channel select drop down box
    document.querySelector('#channels').innerHTML = '';

    // Create default 'select channel' item
    var def = document.createElement('option');
    def.value = 'Select channel...';
    def.innerHTML = 'Select channel...';
    document.querySelector('#channels').append(def);

    if (SERVER_DATA.success == true){
        channelsData = SERVER_DATA.channels;
        for (c in channelsData) {
            var option = document.createElement('option');
            option.value = c;
            option.innerHTML = c;
            if (activeChannel !== null && c == activeChannel) {
                option.setAttribute('selected', true);
            };
            document.querySelector('#channels').append(option);
        }    
    }
    return false;
};


function updateChat() {
    // Get active channel name
    channel = document.querySelector('#channels').value;

    // Empty chat window
    document.querySelector('#main').innerHTML = '';

    if (SERVER_DATA.success) {
        
        // Filter on active channel name
        chatHistory = SERVER_DATA.channels[channel];

        //chatHistory = data.chatHistory;
        console.log(chatHistory);

        for(var i = 0 ; i < chatHistory.length ; i++) {
            const p1 = document.createElement('p');
            const p2 = document.createElement('p');
            if (chatHistory[i].username == username) {
                p1.innerHTML = `${chatHistory[i].timestamp}`;
                p2.innerHTML = chatHistory[i].chat;
                p1.className = 'myMessageTime';
                p2.className = 'myMessage';
            }
            else {
                p1.innerHTML = `<b>${chatHistory[i].username}</b> on ${chatHistory[i].timestamp}`;
                p2.innerHTML = chatHistory[i].chat;
                p1.className = 'otherMessageTime';
                p2.className = 'otherMessage';
            }
            document.querySelector('#main').append(p1);
            document.querySelector('#main').append(p2);
        }
    }
    else {
        // Update HTML with failure message
        document.querySelector('#main').innerHTML = data.message;
    }
};

// Return key submits chat
function handleChatKeyPress(e) {
    var button = document.getElementById('chatButton');
    if (e.keyCode === 13) {
        button.click();
        return false;
    }
};

// Signout
function signout() {
    localStorage.clear('username');
    localStorage.clear('activeChannel');

    request.open('GET', '/');
    request.send();
};