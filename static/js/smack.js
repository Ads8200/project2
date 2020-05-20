// KNOWN BUGS:
// - Username not validated.  Another user could already have the name

document.addEventListener('DOMContentLoaded', () => {
    
    // Check if user has visited site before and provided a username
    if (newUser()) {
        username = getUsername();
        localStorage.setItem('username', username);
    }
    else {
        username = localStorage.getItem('username');
    }

    // Update channels
    updateChannels();

    // ASIDE: Display username
    document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>!`;
    
    // By default chat submit button is disabled
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

    // ASIDE: On Submit add channel
    document.querySelector('#channelForm').onsubmit = () => {
        const newChannel = document.querySelector('#channelFormText').value;
        updateChannels(null, newChannel);
        document.querySelector('#channelFormText').value = '';
    };

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    // When connected, configure buttons
    socket.on('connect', () => {
        // Each button should emit a "chat" event
        document.querySelector('#chatButton').onclick = () => {
            const chat = document.querySelector('#chatTextArea').value;
            const elem = document.getElementById('channels');
            const activeChannel = elem.options[elem.selectedIndex].value;
            socket.emit('submit chat', {'username': username, 'activeChannel': activeChannel, 'chat': chat});
            document.querySelector('#chatTextArea').value = '';
            return false;
        };

        document.querySelector('#channelFormButton').onclick = () => {
            const newChannel = document.querySelector('#channelFormText').value;
            socket.emit('submit new channel', {'newChannel': newChannel});
        };
    });

    // When a new vote is announced, add to the unordered list
    socket.on('announce chat', data => {
        if(document.querySelector('#channels').value == data.activeChannel) {
            const p = document.createElement('p');
            if (data.username == username) {
                p.innerHTML = `${data.chat}`;
                p.className = 'myMessage';
            }
            else {
                p.innerHTML = `[${data.username}] ${data.chat}`;
                p.className = 'otherMessage';
            }
            document.querySelector('#main').append(p);
        };
    });

    socket.on('announce channel', () => {
        var active = document.querySelector('#channels').value;
        updateChannels(active);
    });

    document.querySelector('#channels').onchange = () => {
        channelChange();
    }

    document.querySelector('#signout').onclick = () => {
        signout();
    };

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


function updateChannels(activeChannel = null, newChannel = null) {
    const request = new XMLHttpRequest();
    request.open('POST', '/updateChannels');

    // Callback function for when request completes
    request.onload = () => {
        
        // Extract JSON data from request
        const data = JSON.parse(request.responseText);

        // Empty channel select drop down box
        document.querySelector('#channels').innerHTML = '';

        // Create default 'select channel' item
        var def = document.createElement('option');
        def.value = 'default';
        def.innerHTML = 'Select channel...';
        if (activeChannel == null) {
            def.setAttribute('selected', true);
        };
        document.querySelector('#channels').append(def);

        // If server request successful
        if (data.success) {

            channels = data.channels;

            for (c in channels) {
                var option = document.createElement('option');
                option.value = c;
                option.innerHTML = c;
                if (activeChannel == option.value) {
                    option.setAttribute('selected', true);
                };
                document.querySelector('#channels').append(option);
            }
        }
        else {
            // Update HTML with failure message
            document.querySelector('#channelMessage').innerHTML = data.message;
        }

        // Empty chat window
        document.querySelector('#main').innerHTML = "Choose channel to begin chatting";
    };

    // If newChannel needs to be added, add data to send with request
    const data = new FormData();
    data.append('newChannel', newChannel);

    // Send request
    request.send(data);
    
    // Stop page reloading
    return false;
};


function channelChange() {
    // Get channel name
    channel = document.querySelector('#channels').value;

    // Clear chat window
    document.querySelector('#main').innerHTML = '';

    // Contact server and get latest chat data
    const request = new XMLHttpRequest();
    request.open('POST', '/dataUpdate');
    
    // Callback function for when request completes
    request.onload = () => {
        
        // Extract JSON data from request
        const data = JSON.parse(request.responseText);

        if (data.success) {

            chatHistory = data.chatHistory;
            console.log(chatHistory);

            for(var i = 0 ; i < chatHistory.length ; i++) {
                var p = document.createElement('p');
                if (chatHistory[i].username == username) {
                    p.innerHTML = chatHistory[i].chat;
                    p.className = 'myMessage';
                }
                else {
                    p.innerHTML = `[${chatHistory[i].username}] ${chatHistory[i].chat}`;
                    p.className = 'otherMessage';
                }
                document.querySelector('#main').append(p);
            }
        }
        else {
            // Update HTML with failure message
            document.querySelector('#main').innerHTML = data.message;
        }
    };

    // Add data to send with request
    const data = new FormData();
    data.append('channel', channel);

    // Send request
    request.send(data);

    // Stop page reloading
    return false;
};


function signout() {
    localStorage.clear('username');
    request.open('GET', '/');
    // Send request
    request.send();
};