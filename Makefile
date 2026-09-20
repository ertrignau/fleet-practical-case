CLIENT_DIR := client
SERVER_DIR := server

.PHONY: help install dev client server build check check-client check-server clean reset-db

help:
	@echo "Available commands:"
	@echo "  make install       Install client and server dependencies"
	@echo "  make dev           Start client and server"
	@echo "  make client        Start React client"
	@echo "  make server        Start Express server"
	@echo "  make build         Build React client"
	@echo "  make check         Check server syntax and build client"
	@echo "  make check-server  Check server JavaScript syntax"
	@echo "  make check-client  Build client"
	@echo "  make clean         Remove generated client build"
	@echo "  make reset-db      Restore the tracked SQLite database"

install:
	cd $(SERVER_DIR) && npm install
	cd $(CLIENT_DIR) && npm install

server:
	cd $(SERVER_DIR) && npm run start

client:
	cd $(CLIENT_DIR) && npm run start

dev:
	$(MAKE) -j2 server client

build:
	cd $(CLIENT_DIR) && npm run build

check: check-server check-client

check-server:
	node --check $(SERVER_DIR)/index.js
	node --check $(SERVER_DIR)/db/database.js
	node --check $(SERVER_DIR)/db/init.js
	node --check $(SERVER_DIR)/routes/employees.js
	node --check $(SERVER_DIR)/routes/devices.js
	node --check $(SERVER_DIR)/routes/products.js
	node --check $(SERVER_DIR)/routes/cart.js
	node --check $(SERVER_DIR)/routes/orders.js

check-client:
	cd $(CLIENT_DIR) && npm run build

clean:
	rm -rf $(CLIENT_DIR)/build

reset-db:
	git restore $(SERVER_DIR)/fleet.sqlite