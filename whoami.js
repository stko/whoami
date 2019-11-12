'use strict';

var ws_url
var websocket = null

function isSecure() {
	return window.location.protocol == 'https:';
}

function init() {
if (window.location.path !== undefined) {
		var path = window.location.path
	} else {
		var path = "/"
	}
	if (isSecure()) {
		ws_url = 'wss://' + window.location.hostname + ":" + window.location.port + path
	} else {
		ws_url = 'ws://' + window.location.hostname + ":" + window.location.port + path
	}
	//$("#connectButton").button()
	setButtons()
	$('#name').change(function () {
		if (typeof (Storage) !== "undefined") {
			localStorage.setItem("user", $("#username").val())
		}
		setButtons()
	});
	$('#gameid').change(function () {
		setButtons()
	});
	if (typeof (Storage) !== "undefined") {
		$("#username").val(localStorage.getItem("user"))
	}
	if (window.location.hash !== undefined) {
		$("#gameid").val(window.location.hash.substr(1))
	}
	if (checkValidGameID() && checkValidUserName()) {
		doConnect()
	}
	$.mobile.popup.prototype.options.history = false;
	setButtons()
}

function doConnect() {
	if (websocket == null) {
		websocket = new WebSocket(ws_url);
		websocket.onopen = function (evt) { onOpen(evt) };
		websocket.onclose = function (evt) { onClose(evt) };
		websocket.onmessage = function (evt) { onMessage(evt) };
		websocket.onerror = function (evt) { onError(evt) };
	} else {
		websocket.close();
	}
}

function doGiveName(ok_to_send) {
	if (ok_to_send) {
		doSend(JSON.stringify({ "type": "givename", "user": document.whoamiform.player.value, "whoami": document.whoamiform.whoami.value, "game": $("#gameid").val() }));
	}
	$("#popupWhoAmI").popup('close');
}

function doNewGame() {
	console.log("new game")
	doSend(JSON.stringify({ "type": "restart", "game": $("#gameid").val() }));
}

function doShare() {
	console.log("Share")
	if (navigator.share) {
		navigator.share({
		  title: 'Share the Game',
		  text: 'Do you like to play "Who Am I" with me?',
		  url: window.location.href
		}).then(() => {
		  console.log('Thanks for sharing!');
		})
		.catch(err => {
		  console.log(`Couldn't share because of`, err.message);
		});
	  } else {
		console.log('web share not supported');
	  }
}


function selectUser(event) {
	document.whoamiform.player.readOnly = true;
	document.whoamiform.player.value = event.target.innerHTML
	document.whoamiform.whoami.value = ""
	$("#popupWhoAmI").popup("open");
}

function checkValidGameID() {
	return $("#gameid").val().length > 0
}

function checkValidUserName() {
	return $("#username").val().length > 3
}

function setButtons() {
	if (websocket == null) {
		$("#username").prop('disabled', false);
		$("#gameid").prop('disabled', false);
		//$("#connectButton").button('disable');
		//$("#sharebutton").button().button('disable');
		var mytab = document.getElementById("tab")
		while (mytab.firstChild) {
			mytab.removeChild(mytab.firstChild)
		}
		if (!checkValidUserName()) {
			$("#connectButton").text("Enter your Name to start")
			//$("#connectButton").button('disable')
			return
		}
		//$("#connectButton").button('enable')
		if (checkValidGameID()) {
			$("#connectButton").text("Join existing Game")
		} else {
			$("#connectButton").text("Create new Game")
		}
		document.getElementById("hint").innerHTML=""
	} else {
		$("#username").prop('disabled', true);
		$("#gameid").prop('disabled', true);
		//$("#sharebutton").button('enable');
		//$("#connectButton").button('enable')
		$("#connectButton").text("Leave Game")
	}
}

function onOpen(evt) {
	writeToScreen("connected\n");
	setButtons()
	doSend(JSON.stringify({ "type": "connect", "name": $("#username").val(), "game": $("#gameid").val() }));
}



function onClose(evt) {
	writeToScreen("disconnected\n");
	websocket = null
	setButtons()
}

function onMessage(evt) {
	writeToScreen("response: " + evt.data + '\n');
	var data = JSON.parse(evt.data)
	console.log("data received", data)
	if (data.type == 'state') {
		var mytab = document.getElementById("tab")
		while (mytab.firstChild) {
			mytab.removeChild(mytab.firstChild)
		}
		var hint=document.getElementById("hint")
		if (data.state.length>0){
			hint.innerHTML="Tap the Player name to change his Identity"
		} else {
			hint.innerHTML=""
		}

		for (var user in data.state) {
			var tr = document.createElement("tr")
			tr.addEventListener('click', selectUser, data.state[user].name)
			var td = document.createElement("td")
			td.classList.add("tdname");
			td.innerHTML = data.state[user].name
			tr.appendChild(td)
			td = document.createElement("td")
			td.classList.add("tdassignee");
			td.innerHTML = data.state[user].by
			tr.appendChild(td)
			mytab.appendChild(tr)
			tr = document.createElement("tr")
			td = document.createElement("td")
			td.classList.add("tdwhoami");
			td.setAttribute("colspan", "2");
			if ($("#username").val() == data.state[user].name) {
				td.innerHTML = '???'
			} else {
				td.innerHTML = data.state[user].whoami
			}
			tr.appendChild(td)

			mytab.appendChild(tr)
		}
	}
	if (data.type == 'gameid') {
		$("#gameid").val(data.gameid)
		window.location.hash = data.gameid;
	}


}

function onError(evt) {
	writeToScreen('error: ' + evt.data + '\n');
	websocket.close()
}

function doSend(message) {
	writeToScreen("sent: " + message + '\n');
	websocket.send(message);
}

function writeToScreen(message) {
	console.log(message)
}

//window.addEventListener("load", init, false);
$( document ).on( "pageinit", "#page", function( event ) {
	init()
  });



