BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)

build: index.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c > $@

clean:
	rm -rf index.js

.PHONY: build clean
