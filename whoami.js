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
		ws_url = 'ws://' + window.location.hostname  + ":" + window.location.port + path
	}
	setButtons()
	$('#name').change(function () {
		if (typeof (Storage) !== "undefined") {
			localStorage.setItem("user", document.myform.name.value)
		}
		setButtons()
	});
	$('#gameid').change(function () {
		setButtons()
	});
	if (typeof (Storage) !== "undefined") {
		document.myform.name.value = localStorage.getItem("user")
	}
	if (window.location.hash !== undefined) {
		document.myform.gameid.value =window.location.hash.substr(1)
	}
	if (checkValidGameID() && checkValidUserName()){
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
	if (ok_to_send){
		doSend(JSON.stringify({ "type": "givename", "user": document.whoamiform.player.value, "whoami": document.whoamiform.whoami.value, "game": document.myform.gameid.value }));
	}
	$("#popupWhoAmI").popup('close');
}


function selectUser(event) {
	document.whoamiform.player.readOnly = true;
	document.whoamiform.player.value = event.target.innerHTML
	document.whoamiform.whoami.value = ""
	console.log("history", $( "#popupWhoAmI" ).popup( "option", "history" ))
	$("#popupWhoAmI").popup("open");
}

function checkValidGameID() {
	return document.myform.gameid.value.length > 0
}

function checkValidUserName() {
	return document.myform.name.value.length > 3
}

function setButtons() {
	if (websocket == null) {
		document.myform.name.disabled = false;
		document.myform.gameid.disabled = false;
		var mytab = document.getElementById("tab")
		while (mytab.firstChild) {
			mytab.removeChild(mytab.firstChild)
		}
		$("#connectButton").button({
			disabled: true
		})
		if (!checkValidUserName()) {
			$("#connectButton").text("Enter your Name to start")
			$("#connectButton").button('disable')
			return
		}
		$("#connectButton").button('enable')
		if (checkValidGameID()) {
			$("#connectButton").text("Join existing Game")
		} else {
			$("#connectButton").text("Create new Game")
		}
	} else {
		document.myform.name.disabled = true;
		document.myform.gameid.disabled = true;
		$("#connectButton").button('enable')
		$("#connectButton").text("Leave Game")
	}
}

function onOpen(evt) {
	writeToScreen("connected\n");
	setButtons()
	doSend(JSON.stringify({ "type": "connect", "name": document.myform.name.value, "game": document.myform.gameid.value }));
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
		var tr = document.createElement("tr")
		var th = document.createElement("th")
		th.innerHTML = "Gamer"
		tr.appendChild(th)
		th = document.createElement("th")
		th.innerHTML = "is today"
		tr.appendChild(th)
		th = document.createElement("th")
		th.innerHTML = "given by"
		tr.appendChild(th)
		mytab.appendChild(tr)
		for (var user in data.state) {
			tr = document.createElement("tr")
			tr.addEventListener('click', selectUser, data.state[user].name)
			var td = document.createElement("td")
			td.innerHTML = data.state[user].name
			tr.appendChild(td)
			td = document.createElement("td")
			if (document.myform.name.value == data.state[user].name) {
				td.innerHTML = '???'
			} else {
				td.innerHTML = data.state[user].whoami
			}
			tr.appendChild(td)
			td = document.createElement("td")
			td.innerHTML = data.state[user].by
			tr.appendChild(td)

			mytab.appendChild(tr)
		}
	}
	if (data.type == 'gameid') {
		document.myform.gameid.value = data.gameid
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
	/*
	document.myform.outputtext.value += message
	document.myform.outputtext.scrollTop = document.myform.outputtext.scrollHeight;
  */
}

window.addEventListener("load", init, false);



