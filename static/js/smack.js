document.addEventListener('DOMContentLoaded', () => {
    
    // Check if user has visited site before and provided a username
    if (newUser()) {
        username = getUsername();
        localStorage.setItem('username', username);
        // Save username serverside
        // TODO
    }
    else {
        username = localStorage.getItem('username');
    }

    // ASIDE: Display username
    document.querySelector('#username').innerHTML = `Hello, <b>${username}</b>`;
    
    // Displace active channels if any
    updateChannels();

    // By default channel submit button is disabled
    document.querySelector('#channelFormButton').disabled = true;
    
    // Toggle submit button disabled status
    document.querySelector('#channelFormText', onkeyup = () => {
        if (document.querySelector('#channelFormText').value.length > 0) {
            document.querySelector('#channelFormButton').disabled = false;
        }
        else {
            document.querySelector('#channelFormButton').disabled = true;
        }
    });

    // ASIDE: On Submit add channel
    document.querySelector('#channelForm').onsubmit = () => {
        
        // Initialise new request
        const request = new XMLHttpRequest();
        const channel = document.querySelector('#channelFormText').value;
        request.open('POST', '/addChannel');
        
        // Callback function for when request completes
        request.onload = () => {
            
            // Extract JSON data from request
            const data = JSON.parse(request.responseText);

            if (data.success) {
                // Empty channel select drop down box
                document.querySelector('#channels').innerHTML = '';

                channels = data.channels;

                for (c in channels) {
                    var option = document.createElement('option');
                    option.value = c;
                    option.innerHTML = c;
                    if (c == channel) {
                        option.setAttribute('selected', true);
                    }
                    document.querySelector('#channels').append(option);
                }

                // Update HTML with no message
                document.querySelector('#channelMessage').innerHTML = '';
            }
            else {
                // Update HTML with failure message
                document.querySelector('#channelMessage').innerHTML = data.message;
            }
        };

        // Add data to send with request
        const data = new FormData();
        data.append('channel', channel);

        // Send request
        request.send(data);

        // Empty channel form text field
        document.querySelector('#channelFormText').value = '';

        // Stop page reloading
        return false;
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
            return false;
        };
    });

    // When a new vote is announced, add to the unordered list
    socket.on('announce chat', data => {
        const p = document.createElement('p');
        if (data.username == username) {
            p.innerHTML = `${data.chat}`;
            p.className = 'myMessage';
        }
        else {
            p.innerHTML = `[${data.username}] ${data.chat}`;
            p.className = 'otherMessage';
        }
        document.querySelector('#chatWrapper').append(p);
    });

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


function updateChannels() {
    const request = new XMLHttpRequest();
    request.open('POST', '/updateChannels');

    // Callback function for when request completes
    request.onload = () => {
        
        // Extract JSON data from request
        const data = JSON.parse(request.responseText);

        if (data.success) {
            // Empty channel select drop down box
            document.querySelector('#channels').innerHTML = '';

            channels = data.channels;

            //for (var i = 0 ; i < channels.length ; i++) {
            for (c in channels) {
                var option = document.createElement('option');
                option.value = c;
                option.innerHTML = c;
                document.querySelector('#channels').append(option);
            }
        }
        else {
            // Update HTML with failure message
            document.querySelector('#channelMessage').innerHTML = data.message;
        }
    };

    // Send request
    request.send();

    // Stop page reloading
    return false;
};


function signout() {
    localStorage.clear('username');
    request.open('GET', '/');
    // Send request
    request.send();
};