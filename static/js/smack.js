// KNOWN BUGS:
// - Username not validated.  Another user could already have the name

document.addEventListener('DOMContentLoaded', () => {
    
    // Check if user has visited site before and provided a username
    if (newUser()) {
        username = getUsername();
        localStorage.setItem('username', username);
        document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>!`;
        updateChannels();
    }
    else {
        username = localStorage.getItem('username');
        document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>!`;
        if (!localStorage.getItem('activeChannel') || localStorage.getItem('activeChannel') == 'Select channel...'){
            console.log('No active channel in local storage');
            updateChannels();
        }
        else {
            console.log(localStorage.getItem('activeChannel'));
            updateChannels(localStorage.getItem('activeChannel'), null);
            channelChange(); /* PROBLEM HERE */
        }
    }
    
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
            socket.emit('submit new channel', {'newChannel': newChannel});
            return false;
        };
    });

    // When a new message is sent
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
        if (data.success === true) {
            updateChannels(data.newChannel);
            document.querySelector('#channelMessage').innerHTML = data.message;
        }
        else {
            document.querySelector('#channelMessage').innerHTML = data.message;
        }
    });

    document.querySelector('#channels').onchange = () => {
        channelChange(document.querySelector('#channels').value);
        return false;
    }

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


function updateChannels(activeChannel = null) {
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
        def.value = 'Select channel...';
        def.innerHTML = 'Select channel...';
        /*
        if (activeChannel == null && newChannel == null) {
            def.setAttribute('selected', true);
        };
        */
        document.querySelector('#channels').append(def);

        // If server request successful
        if (data.success) {

            channels = data.channels;

            for (c in channels) {
                var option = document.createElement('option');
                option.value = c;
                option.innerHTML = c;
                if (activeChannel == c) {
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

    request.send();

    // Stop page reloading
    return false;
};


function channelChange(channel) {
    
    // Clear existing window
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

    // Add data to send with request
    const data = new FormData();
    data.append('channel', channel);

    // Send request
    request.send(data);

    // Stop page reloading
    return false;
};


function handleChatKeyPress(e) {
    var button = document.getElementById('chatButton');
    if (e.keyCode === 13) {
        button.click();
        return false;
    }
}


function signout() {
    localStorage.clear('username');
    request.open('GET', '/');
    request.send();
};