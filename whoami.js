'use strict';

var ws_url
var websocket = null

function isSecure() {
	return window.location.protocol == 'https:';
}

function init() {
	if (isSecure()) {
		ws_url = window.location.href.replace('https://', 'wss://') + "ws1.ws";
	} else {
		ws_url = window.location.href.replace('http://', 'ws://') + "ws1.ws";
	}
	setButtons()
	$('#name').change(function () {
		if (typeof(Storage) !== "undefined") {
			localStorage.setItem("user", document.myform.name.value)
		  }
		setButtons()
	});
	$('#gameid').change(function () {
		setButtons()
	});
	if (typeof(Storage) !== "undefined") {
		document.myform.name.value = localStorage.getItem("user")
	  }
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

function doGiveName() {
	doSend(JSON.stringify({ "type": "givename", "user": document.myform.username.value, "whoami": document.myform.newname.value, "game": document.myform.gameid.value }));
}


function selectUser(event) {
	document.myform.username.value = event.target.innerHTML
}

function checkValidGameID() {
	return document.myform.gameid.value.length > 0
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
		if (document.myform.name.value.length < 3){
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



