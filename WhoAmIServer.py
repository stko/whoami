# main program and imports for standalone purpose
from HTTPWebSocketsHandler import HTTPWebSocketsHandler
import sys
import threading
import ssl
from json import loads, dumps
from base64 import b64encode
import random

import pprint 
VER = sys.version_info[0]
if VER >= 3:
	from socketserver import ThreadingMixIn
	from http.server import HTTPServer
	from io import StringIO
else:
	from SocketServer import ThreadingMixIn
	from BaseHTTPServer import HTTPServer
	from StringIO import StringIO


if len(sys.argv) > 1:
	port = int(sys.argv[1])
else:
	port = 8000
if len(sys.argv) > 2:
	secure = str(sys.argv[2]).lower() == "secure"
else:
	secure = False
if len(sys.argv) > 3:
	credentials = str(sys.argv[3])
else:
	credentials = ""

games = {}


class User(dict):
	def __init__(self, name):
		self['name'] = name
		self['whoami'] = ''
		self['by'] = ''
		self['online'] = True


class WSSimpleEcho(HTTPWebSocketsHandler):

	def report_state(self):
		state = []
		for user_data in self.game.values():
			if user_data['user']['online']:
				state.append(user_data['user'])
		zombie_web_sockets = []
		for ws in self.game.keys():
			try:
				ws.send_message(dumps({'type': 'state', 'state': state}))
			except:
				zombie_web_sockets.append(ws)
		for zombie in zombie_web_sockets:
			del self.game[zombie]

	def create_game_id(self):
		global games
		id= str(random.randint(10000000,99999999))
		while id in games:
			id= str(random.randint(10000000,99999999))
		return id

	def on_ws_message(self, message):
		global games
		if message is None:
			return
		print("message", repr(message))
		data = loads(str(message, "UTF8"))
		self.game_id = data["game"]
		if self.game_id == "" or not self.game_id in games:
			print("old game id:",self.game_id,repr(games))
			self.game_id = self.create_game_id()
		if not self.game_id in games:
			print("create game with id ",self.game_id)
			games[self.game_id] = {}
		self.game = games[self.game_id]
		if data['type'] == 'connect':
			self.name = data["name"]
			user_exist_already = None
			user_entry_to_remove = None
			# did the user already came in with another websocket? If yes, remove him, but copy his old data
			for key, user_entry in self.game.items():
				if user_entry['user']['name'] == self.name:
					user_exist_already = user_entry['user']
					user_entry_to_remove = key
			if not user_exist_already:
				user_exist_already = User(self.name)
			else:
				del self.game[user_entry_to_remove]
			if not self in self.game:
				self.game[self] = {"ws": self.ws, "user": user_exist_already}
			user_exist_already['online']=True
			# echo message back to client
			print("state status", self.game)
			self.send_message(
					dumps({'type': 'gameid', 'gameid': self.game_id}))
			self.report_state()
		if data['type'] == 'givename':
			for key, user_entry in self.game.items():
				if user_entry['user']['name'] == data['user']:
					user_entry['user']['whoami'] = data['whoami']
					user_entry['user']['by'] = self.name
			self.report_state()
		if data['type'] == 'restart':
			for key, user_entry in self.game.items():
				user_entry['user']['whoami'] = "cleaned"
				user_entry['user']['by'] = self.name
			self.report_state()
		self.log_message('websocket received "%s"', str(message))

	def on_ws_connected(self):
		self.ws = self
		self.log_message('%s', 'websocket connected')

	def on_ws_closed(self):
		self.log_message('%s', 'websocket closed')
		global games
		if not self.game_id in games:  # error case..
			return
		self.game[self]['user']['online']=False
		game_is_empty=True
		for player in self.game.values():
			if player['user']['online']:
				game_is_empty=False
				break
		if game_is_empty:
			print("Clean games ?1? ")
			del games[self.game_id]
		else:
			self.report_state()


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
	"""Handle requests in a separate thread."""


def _ws_main():
	try:
		# Replace WSSimpleEcho with your own subclass of HTTPWebSocketHandler
		server = ThreadedHTTPServer(('0.0.0.0', port), WSSimpleEcho)
		server.daemon_threads = True
		server.auth = b64encode(credentials.encode("ascii"))
		if secure:
			server.auth = b64encode(credentials.encode("ascii"))
			server.socket = ssl.wrap_socket(
				server.socket, certfile='./server.pem', server_side=True)
			print('started secure https server at port %d' % (port,))
		else:
			print('started http server at port %d' % (port,))
		server.serve_forever()
	except KeyboardInterrupt:
		print('^C received, shutting down server')
		server.socket.close()


if __name__ == '__main__':
	_ws_main()
