BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)

build: index.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c > $@

test.js: test/index.js $(SRC)
	$(BIN)/rollup $< -c > $@

clean:
	rm -rf index.js test.js

.PHONY: build clean
