# Binaries.
browserify = ./node_modules/.bin/browserify
mocha = ./node_modules/.bin/mocha

# Build the browserify bundle.
build: node_modules lib/index.js
	mkdir -p dist
	@$(browserify) lib/index.js \
		--standalone Analytics \
		--outfile dist/zhuge-node.js

# Install the node module dependencies.
node_modules: package.json
	@npm install
	@touch package.json

# Run the tests.
test: node_modules
	@$(mocha) \
		--reporter spec \
		--bail

clean:
	@rm dist/zhuge-node.js

# Phonies.
.PHONY: test
